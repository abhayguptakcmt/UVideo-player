import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Mic,
  RefreshCw,
  ShieldCheck,
  Sliders,
  Volume2,
  VolumeX,
  X,
  Zap
} from 'lucide-react';
import { audioSyncManager } from '../../services/audioSyncManager';
import { unlockSpeechSynthesis } from '../../services/speechSynthesisService';
import { AudioSyncMetrics, AudioTrackSource, DubbingSettings, PlayerState } from '../../types';

interface AudioManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerState: PlayerState;
  dubbingSettings: DubbingSettings;
  onToggleDubbing: (enabled?: boolean) => void;
  onOpenDubbingSettings: () => void;
}

export const AudioManagerModal: React.FC<AudioManagerModalProps> = ({
  isOpen,
  onClose,
  playerState,
  dubbingSettings,
  onToggleDubbing,
  onOpenDubbingSettings
}) => {
  const [metrics, setMetrics] = useState<AudioSyncMetrics>(() => audioSyncManager.getMetrics());
  const [frequencies, setFrequencies] = useState<number[]>(new Array(24).fill(0.05));
  const [activeSource, setActiveSource] = useState<AudioTrackSource>('original');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isResyncing, setIsResyncing] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const unsubSync = audioSyncManager.subscribe((m) => {
      setMetrics(m);
    });

    const unsubSpectrum = audioSyncManager.subscribeSpectrum((freqs, src, speaking) => {
      setFrequencies(freqs);
      setActiveSource(src);
      setIsSpeaking(speaking);
    });

    return () => {
      unsubSync();
      unsubSpectrum();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const isDubbed = dubbingSettings.enabled;
  const isExceeded = metrics.isDriftExceeded;

  const handleManualResync = () => {
    setIsResyncing(true);
    audioSyncManager.resyncAudio();
    setTimeout(() => {
      setIsResyncing(false);
    }, 400);
  };

  const handleToggleAutoResync = () => {
    audioSyncManager.setAutoResync(!metrics.autoResyncEnabled);
  };

  const formatMs = (ms: number) => {
    const abs = Math.abs(ms);
    return ms > 0 ? `+${abs}ms` : ms < 0 ? `-${abs}ms` : '0ms';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in select-none">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl ${
                isDubbed
                  ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
                  : 'bg-cyan-600/20 text-cyan-400 border border-cyan-500/30'
              }`}
            >
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Audio Manager & Latency Monitor
                {isExceeded ? (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-rose-950/90 text-rose-300 border border-rose-600/60 flex items-center gap-1 animate-pulse">
                    <AlertTriangle className="w-3 h-3" />
                    Drift &gt; 500ms
                  </span>
                ) : (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/90 text-emerald-300 border border-emerald-600/60 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    In Sync
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                Real-time audio spectrum & zero-delay video-to-voice synchronization
              </p>
            </div>
          </div>
          <button
            id="close-audio-manager-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Active Audio Track Banner */}
          <div
            className={`p-4 rounded-xl border transition-all ${
              isDubbed
                ? 'bg-purple-950/30 border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.1)]'
                : 'bg-slate-800/40 border-slate-700/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 rounded-xl ${
                    isDubbed
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                      : 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30'
                  }`}
                >
                  {isDubbed ? <Mic className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">
                      {isDubbed ? 'AI Dubbed Multi-Character Track' : 'Original Video Audio Track'}
                    </span>
                    <span
                      className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded font-bold ${
                        isDubbed
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                          : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      }`}
                    >
                      Active Source
                    </span>
                    {isDubbed && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-400" />
                        Bleed-Through Protected (Native Clamped to 0 dB)
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {isDubbed
                      ? metrics.activeSpeaker
                        ? `Character: ${metrics.activeSpeaker} • Expression: ${metrics.activeVibe} • Native video silenced (0% bleed)`
                        : 'AI Speech Engine active • Native video audio strictly muted to prevent bleed-through'
                      : playerState.isMuted
                      ? 'Original audio muted by user'
                      : `Original audio routing at ${Math.round(playerState.volume * 100)}% volume (restored)`}
                  </p>
                </div>
              </div>

              {/* Quick Audio Route Switcher */}
              <button
                id="toggle-audio-source-btn"
                onClick={() => onToggleDubbing(!isDubbed)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  isDubbed
                    ? 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-600'
                    : 'bg-purple-600 text-white hover:bg-purple-500 shadow-md shadow-purple-600/30'
                }`}
              >
                {isDubbed ? (
                  <>
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Switch to Original Audio</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-3.5 h-3.5" />
                    <span>Switch to AI Dubbing</span>
                  </>
                )}
              </button>
            </div>

            {/* High-Resolution Spectrum Visualizer */}
            <div className="mt-4 p-3 bg-black/60 rounded-lg border border-slate-800/80">
              <div className="flex items-center justify-between text-[10px] text-slate-400 mb-2 font-mono">
                <span className="flex items-center gap-1">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isDubbed
                        ? isSpeaking
                          ? 'bg-purple-400 animate-ping'
                          : 'bg-purple-600'
                        : playerState.isPlaying
                        ? 'bg-cyan-400 animate-pulse'
                        : 'bg-slate-600'
                    }`}
                  />
                  Live Frequency Response (Hz)
                </span>
                <span>{isDubbed ? 'Voice Formant Spectrum' : 'Full-Range Audio'}</span>
              </div>

              {/* Spectrum Bars */}
              <div className="flex items-end justify-between gap-1 h-14 px-1">
                {frequencies.map((val, idx) => {
                  const height = Math.max(6, Math.min(100, Math.round(val * 100)));
                  return (
                    <div
                      key={idx}
                      className="flex-1 flex flex-col items-center justify-end h-full group/bar relative"
                    >
                      <div
                        className={`w-full rounded-t transition-all duration-75 ${
                          isDubbed
                            ? isSpeaking
                              ? 'bg-gradient-to-t from-purple-600 via-fuchsia-500 to-amber-300'
                              : 'bg-purple-800/40'
                            : playerState.isPlaying
                            ? 'bg-gradient-to-t from-cyan-600 to-blue-400'
                            : 'bg-slate-700/30'
                        }`}
                        style={{ height: `${height}%` }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Frequency Range Axis */}
              <div className="flex justify-between text-[9px] text-slate-500 font-mono mt-1.5 px-0.5">
                <span>60Hz</span>
                <span>250Hz</span>
                <span>1kHz</span>
                <span>4kHz</span>
                <span>12kHz+</span>
              </div>
            </div>
          </div>

          {/* Real-time Latency & Drift Synchronization Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Metric 1: Synchronization Drift */}
            <div
              className={`p-3.5 rounded-xl border ${
                isExceeded
                  ? 'bg-rose-950/30 border-rose-600/50 text-rose-300'
                  : 'bg-slate-800/40 border-slate-700/60 text-slate-200'
              }`}
            >
              <div className="text-[10px] font-mono uppercase text-slate-400 flex items-center justify-between">
                <span>Sync Drift</span>
                <span className="text-[9px] text-slate-500">&lt; 500ms target</span>
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span
                  className={`text-2xl font-mono font-extrabold ${
                    isExceeded
                      ? 'text-rose-400 animate-pulse'
                      : Math.abs(metrics.driftMs) < 150
                      ? 'text-emerald-400'
                      : 'text-amber-400'
                  }`}
                >
                  {formatMs(metrics.driftMs)}
                </span>
                <span className="text-xs text-slate-400">
                  {Math.abs(metrics.driftMs) < 150
                    ? 'Optimal'
                    : isExceeded
                    ? 'Desynced'
                    : 'Acceptable'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Delta between video timestamp and AI voice speech progress.
              </p>
            </div>

            {/* Metric 2: Lip-Match Accuracy */}
            <div className="p-3.5 rounded-xl border bg-slate-800/40 border-slate-700/60 text-slate-200">
              <div className="text-[10px] font-mono uppercase text-slate-400 flex items-center justify-between">
                <span>Lip-Match Score</span>
                <Zap className="w-3 h-3 text-cyan-400" />
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-mono font-extrabold text-cyan-400">
                  {metrics.lipMatchAccuracy}%
                </span>
                <span className="text-xs text-slate-400">Natural</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Cadence adapted so dialogue finishes before cue window closes.
              </p>
            </div>

            {/* Metric 3: Active Speaker Voice */}
            <div className="p-3.5 rounded-xl border bg-slate-800/40 border-slate-700/60 text-slate-200">
              <div className="text-[10px] font-mono uppercase text-slate-400 flex items-center justify-between">
                <span>Active Speaker</span>
                <Mic className="w-3 h-3 text-purple-400" />
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-base font-bold text-purple-300 truncate max-w-[120px]">
                  {metrics.activeSpeaker || 'Narrator'}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
                <span className="px-1.5 py-0.5 rounded bg-purple-900/50 text-purple-200 text-[10px] uppercase font-mono">
                  {metrics.activeVibe || 'Natural'}
                </span>
                <span>vibe profile</span>
              </div>
            </div>
          </div>

          {/* Synchronization Actions: Re-sync Button & Auto-resync */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">Audio Synchronization Controls</h3>
                  {isExceeded && (
                    <span className="text-[10px] bg-rose-600 text-white font-bold px-1.5 py-0.5 rounded">
                      Action Required
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Force realignment to video clock with zero audio delay.
                </p>
              </div>

              {/* The Key User-Requested "Re-sync Audio" Button */}
              <button
                id="resync-audio-btn"
                onClick={handleManualResync}
                disabled={isResyncing}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-lg active:scale-95 ${
                  isExceeded
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/40 ring-2 ring-rose-400 animate-pulse'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${isResyncing ? 'animate-spin' : ''}`} />
                <span>Re-sync Audio</span>
              </button>
            </div>

            {/* Auto-Resync Toggle */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <label
                  htmlFor="auto-resync-toggle"
                  className="text-slate-300 font-medium cursor-pointer"
                >
                  Auto Re-sync when drift exceeds 500ms
                </label>
                <span className="text-[10px] text-slate-500 hidden sm:inline">
                  (prevents audio lag automatically)
                </span>
              </div>
              <button
                id="auto-resync-toggle"
                onClick={handleToggleAutoResync}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  metrics.autoResyncEnabled ? 'bg-indigo-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    metrics.autoResyncEnabled ? 'translate-x-4' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Quick Engine Diagnostics & Character Settings Shortcut */}
          <div className="flex items-center justify-between pt-1 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Web Speech & Audio Engine: Ready</span>
            </div>
            <button
              id="open-character-voices-btn"
              onClick={() => {
                onClose();
                onOpenDubbingSettings();
              }}
              className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium hover:underline"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Configure Character Voices & Vibing</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/40 flex justify-end">
          <button
            id="close-audio-manager-footer-btn"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
