import { SubtitleCue, DubbingSettings, AudioSyncMetrics, AudioTrackSource } from '../types';
import {
  speakSubtitleCue,
  stopDubbingSpeech,
  resetDubbingTracker,
  unlockSpeechSynthesis
} from './speechSynthesisService';

type SyncListener = (metrics: AudioSyncMetrics) => void;
type SpectrumListener = (frequencies: number[], activeSource: AudioTrackSource, isSpeaking: boolean) => void;

export class AudioManager {
  private syncListeners: Set<SyncListener> = new Set();
  private spectrumListeners: Set<SpectrumListener> = new Set();

  // Strict Audio Toggling & Volume State
  private activeSource: AudioTrackSource = 'original';
  private nativeUserVolume = 1.0;
  private isNativeMuted = false;

  private activeCue: SubtitleCue | null = null;
  private currentVideoTime = 0;
  private isVideoPlaying = false;
  private isDubbingSpeaking = false;
  private speechStartTimestamp: number | null = null;
  private speechStartVideoTime: number | null = null;
  private activeDubbingSettings: DubbingSettings | null = null;
  private allCues: SubtitleCue[] = [];

  private autoResync = true;
  private lastAutoResyncTime = 0;
  private animationFrameId: number | null = null;

  // Spectrum simulation & smoothing state
  private spectrumBands = 16;
  private frequencyData: number[] = new Array(16).fill(0);
  private phase = 0;

  constructor() {
    this.startSpectrumLoop();
  }

  public subscribe(listener: SyncListener): () => void {
    this.syncListeners.add(listener);
    listener(this.getMetrics());
    return () => this.syncListeners.delete(listener);
  }

  public subscribeSpectrum(listener: SpectrumListener): () => void {
    this.spectrumListeners.add(listener);
    return () => this.spectrumListeners.delete(listener);
  }

  /**
   * Updates playback and dubbing state from the player container
   */
  public updateState(params: {
    videoTime: number;
    isPlaying: boolean;
    activeCue: SubtitleCue | null;
    dubbingSettings: DubbingSettings;
    allCues: SubtitleCue[];
    nativeVolume?: number;
    isNativeMuted?: boolean;
  }) {
    this.currentVideoTime = params.videoTime;
    this.isVideoPlaying = params.isPlaying;
    this.activeCue = params.activeCue;
    this.activeDubbingSettings = params.dubbingSettings;
    this.allCues = params.allCues;

    this.activeSource = params.dubbingSettings.enabled ? 'dubbed' : 'original';

    if (params.nativeVolume !== undefined && !params.dubbingSettings.enabled) {
      this.nativeUserVolume = params.nativeVolume;
    }
    if (params.isNativeMuted !== undefined && !params.dubbingSettings.enabled) {
      this.isNativeMuted = params.isNativeMuted;
    }

    this.checkDriftAndNotify();
  }

  /**
   * Strictly enforces audio routing:
   * - 'dubbed': Native HTML5 video audio volume is forced to STRICT ZERO (0.0), not just muted,
   *   preventing any audio bleed-through. Synthesized AI speech stream takes over.
   * - 'original': Synthesized speech is immediately stopped/cancelled, and native HTML5 video
   *   volume is restored to user's unattenuated volume.
   */
  public setAudioTrackSource(source: AudioTrackSource) {
    this.activeSource = source;

    if (source === 'dubbed') {
      // 1. Unlock speech synthesis engine
      unlockSpeechSynthesis();

      // 2. Dubbing takes over; re-sync instantly if video is already playing
      if (this.isVideoPlaying && this.activeCue) {
        this.resyncAudio();
      }
    } else {
      // 1. Immediately terminate all synthesized AI speech to prevent overlap
      stopDubbingSpeech();
      this.isDubbingSpeaking = false;
      this.speechStartTimestamp = null;
      this.speechStartVideoTime = null;
    }

    this.checkDriftAndNotify();
  }

  /**
   * Returns effective volume for the native HTML5 video element.
   * When AI Dubbing is active, this returns STRICT ZERO (0.0) to prevent bleed-through.
   */
  public getEffectiveNativeVolume(): number {
    const isDubbed = this.activeSource === 'dubbed' || Boolean(this.activeDubbingSettings?.enabled);
    if (isDubbed) {
      return 0.0; // Strictly 0 to prevent native audio bleed-through
    }
    return this.isNativeMuted ? 0.0 : this.nativeUserVolume;
  }

  /**
   * Returns whether native video element must be muted
   */
  public getEffectiveNativeMuted(): boolean {
    const isDubbed = this.activeSource === 'dubbed' || Boolean(this.activeDubbingSettings?.enabled);
    return isDubbed || this.isNativeMuted;
  }

  public setNativeUserVolume(volume: number) {
    this.nativeUserVolume = Math.max(0, Math.min(1, volume));
    this.checkDriftAndNotify();
  }

  public setNativeUserMuted(isMuted: boolean) {
    this.isNativeMuted = isMuted;
    this.checkDriftAndNotify();
  }

  public onSpeechStart(cue: SubtitleCue, _rate: number) {
    this.isDubbingSpeaking = true;
    this.speechStartTimestamp = performance.now();
    this.speechStartVideoTime = this.currentVideoTime;
    this.checkDriftAndNotify();
  }

  public onSpeechEnd() {
    this.isDubbingSpeaking = false;
    this.speechStartTimestamp = null;
    this.speechStartVideoTime = null;
    this.checkDriftAndNotify();
  }

  public setAutoResync(enabled: boolean) {
    this.autoResync = enabled;
    this.checkDriftAndNotify();
  }

  public getAutoResync(): boolean {
    return this.autoResync;
  }

  /**
   * Calculates instantaneous drift between video playback clock and AI audio stream.
   */
  public calculateDrift(): number {
    const isDubbed = this.activeSource === 'dubbed' || Boolean(this.activeDubbingSettings?.enabled);
    if (!isDubbed) {
      return 0; // In native video audio mode, drift is 0
    }

    if (!this.activeCue || !this.isVideoPlaying) {
      return 0;
    }

    // Expected position is the cue start time adjusted by video playback
    if (this.isDubbingSpeaking && this.speechStartVideoTime !== null) {
      const elapsedVideoTime = this.currentVideoTime - this.speechStartVideoTime;
      const elapsedRealTime = (performance.now() - (this.speechStartTimestamp || performance.now())) / 1000;
      return Math.round((elapsedVideoTime - elapsedRealTime) * 1000);
    }

    if (this.currentVideoTime > this.activeCue.startTime) {
      const startDrift = (this.currentVideoTime - this.activeCue.startTime) * 1000;
      return Math.round(startDrift);
    }

    return 0;
  }

  public getMetrics(): AudioSyncMetrics {
    const drift = this.calculateDrift();
    const isDriftExceeded = Math.abs(drift) > 500;
    const isDubbed = this.activeSource === 'dubbed' || Boolean(this.activeDubbingSettings?.enabled);
    const activeSource: AudioTrackSource = isDubbed ? 'dubbed' : 'original';

    // Lip-match score: 100% when drift is 0, decreases gracefully as drift approaches 500ms
    const lipMatchAccuracy = Math.max(0, Math.min(100, Math.round(100 - (Math.abs(drift) / 500) * 45)));

    return {
      driftMs: drift,
      isDriftExceeded,
      activeSource,
      isSpeaking: this.isDubbingSpeaking,
      activeSpeaker: this.activeCue?.speaker || (this.isDubbingSpeaking ? 'Narrator' : null),
      activeVibe: this.activeCue?.vibe || 'natural',
      lipMatchAccuracy,
      expectedCueStart: this.activeCue?.startTime || 0,
      currentPlaybackTime: this.currentVideoTime,
      autoResyncEnabled: this.autoResync,
      audioEngineReady: typeof window !== 'undefined' && 'speechSynthesis' in window,
      effectiveNativeVolume: isDubbed ? 0.0 : (this.isNativeMuted ? 0.0 : this.nativeUserVolume),
      nativeUserVolume: this.nativeUserVolume,
      isNativeMuted: this.isNativeMuted,
      bleedThroughProtected: isDubbed
    };
  }

  /**
   * Resets audio and immediately aligns AI voice dubbing to current video playback time with ZERO delay.
   */
  public resyncAudio() {
    unlockSpeechSynthesis();
    resetDubbingTracker();
    stopDubbingSpeech();

    this.speechStartTimestamp = null;
    this.speechStartVideoTime = null;
    this.isDubbingSpeaking = false;
    this.lastAutoResyncTime = Date.now();

    const isDubbed = this.activeSource === 'dubbed' || Boolean(this.activeDubbingSettings?.enabled);

    // If dubbing is active and a cue is currently valid for this timestamp, re-trigger speech instantly
    if (
      isDubbed &&
      this.activeDubbingSettings &&
      this.isVideoPlaying &&
      this.activeCue &&
      this.currentVideoTime >= this.activeCue.startTime &&
      this.currentVideoTime <= this.activeCue.endTime
    ) {
      const remainingTime = Math.max(0.8, this.activeCue.endTime - this.currentVideoTime);
      const cueWithLipMatch: SubtitleCue = {
        ...this.activeCue,
        startTime: this.currentVideoTime,
        endTime: this.currentVideoTime + remainingTime
      };

      speakSubtitleCue(
        cueWithLipMatch,
        this.activeDubbingSettings,
        () => this.onSpeechStart(cueWithLipMatch, 1.0),
        () => this.onSpeechEnd()
      );
    }

    this.notifyMetrics();
  }

  private checkDriftAndNotify() {
    const metrics = this.getMetrics();

    if (
      this.autoResync &&
      metrics.isDriftExceeded &&
      this.isVideoPlaying &&
      Date.now() - this.lastAutoResyncTime > 2000
    ) {
      this.resyncAudio();
      return;
    }

    this.notifyMetrics();
  }

  private notifyMetrics() {
    const m = this.getMetrics();
    this.syncListeners.forEach((fn) => fn(m));
  }

  /**
   * High-frequency animation loop that computes realistic audio spectrum frequencies
   * reflecting whether Original Audio or AI Dubbed Voice is active.
   */
  private startSpectrumLoop() {
    const update = () => {
      this.phase += 0.15;
      const isDubbed = this.activeSource === 'dubbed' || Boolean(this.activeDubbingSettings?.enabled);
      const activeSource: AudioTrackSource = isDubbed ? 'dubbed' : 'original';

      const isAudioActive = isDubbed
        ? this.isDubbingSpeaking && this.isVideoPlaying
        : this.isVideoPlaying;

      const bands = this.spectrumBands;
      const nextData: number[] = new Array(bands);

      for (let i = 0; i < bands; i++) {
        let targetVal = 0;

        if (isAudioActive) {
          if (isDubbed) {
            // AI Voice Dubbing Spectrum (concentrated in vocal formant frequencies: bands 2 to 10)
            const vocalCenter = Math.exp(-Math.pow((i - 5) / 3.2, 2));
            const syllableModulation = Math.sin(this.phase * 3 + i * 0.7) * 0.35 + 0.65;
            const microHarmonic = Math.cos(this.phase * 5.5 + i * 1.2) * 0.2;
            targetVal = Math.max(0.12, Math.min(1.0, vocalCenter * syllableModulation + microHarmonic + 0.15));
          } else {
            // Original Video Audio Spectrum (full frequency spread from sub-bass to highs)
            const wave1 = Math.sin(this.phase * 2 + i * 0.4) * 0.4 + 0.5;
            const wave2 = Math.cos(this.phase * 3.7 + i * 0.8) * 0.3;
            const bassBoost = i < 4 ? 0.25 : 0;
            targetVal = Math.max(0.08, Math.min(1.0, wave1 + wave2 + bassBoost));
          }
        } else {
          // Quiescent idle resting bar
          targetVal = 0.04;
        }

        // Smooth easing towards target
        this.frequencyData[i] = this.frequencyData[i] * 0.7 + targetVal * 0.3;
        nextData[i] = +this.frequencyData[i].toFixed(3);
      }

      this.spectrumListeners.forEach((fn) => fn(nextData, activeSource, this.isDubbingSpeaking));
      this.animationFrameId = requestAnimationFrame(update);
    };

    if (typeof window !== 'undefined') {
      this.animationFrameId = requestAnimationFrame(update);
    }
  }

  public destroy() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.syncListeners.clear();
    this.spectrumListeners.clear();
  }
}

export const audioManager = new AudioManager();
export const audioSyncManager = audioManager;
