import { SubtitleCue, DubbingSettings, CharacterVoiceProfile } from '../types';
import {
  cleanSpokenTextForNaturalSpeech,
  calculateNaturalCadence,
  CHARACTER_VIBES
} from './characterVoiceService';

let currentUtterance: SpeechSynthesisUtterance | null = null;
let lastSpokenCueId: string | null = null;
let cachedVoices: SpeechSynthesisVoice[] = [];
let isSpeechUnlocked = false;
let activeAudioSource: { stop: () => void } | null = null;
let speechHeartbeatTimer: any = null;

// Pre-load voices and listen for async voiceschanged event
function initVoices() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    cachedVoices = window.speechSynthesis.getVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = () => {
        cachedVoices = window.speechSynthesis.getVoices();
      };
    }
  }
}

initVoices();

/**
 * Call on any user gesture (click play, click dubbing toggle)
 * to unlock browser speech synthesis & audio context.
 */
export function unlockSpeechSynthesis(): void {
  if (typeof window === 'undefined') return;

  if ('speechSynthesis' in window) {
    try {
      window.speechSynthesis.resume();
    } catch {
      // Ignore
    }
  }

  // Also warm up an audio context if supported
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    }
  } catch {
    // Ignore
  }

  isSpeechUnlocked = true;
}

/**
 * Prioritizes natural, neural, and high-definition voices from the browser.
 */
function scoreVoiceQuality(voice: SpeechSynthesisVoice): number {
  const name = voice.name.toLowerCase();
  let score = 0;

  if (name.includes('natural') || name.includes('neural')) score += 15;
  if (name.includes('google')) score += 10;
  if (name.includes('enhanced') || name.includes('premium')) score += 8;
  if (name.includes('online')) score += 5;
  if (voice.localService) score += 2;
  if (voice.default) score += 1;

  // Penalize known legacy robotic voices
  if (name.includes('espeak') || name.includes('whisper') || name.includes('compact')) score -= 10;

  return score;
}

/**
 * Finds all available voices for a given target language, sorted by naturalness.
 */
export function getVoicesForLanguage(langCode: string): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return [];
  }

  if (cachedVoices.length === 0) {
    cachedVoices = window.speechSynthesis.getVoices();
  }

  const cleanLang = (langCode || 'en').toLowerCase().trim();
  const prefix = cleanLang.slice(0, 2);

  const matched = cachedVoices.filter((v) => {
    const vLang = v.lang.toLowerCase().replace('_', '-');
    return vLang === cleanLang || vLang.startsWith(prefix);
  });

  return matched.sort((a, b) => scoreVoiceQuality(b) - scoreVoiceQuality(a));
}

/**
 * Finds the best matching voice for a given target language and optional gender or specific voice URI.
 */
export function findVoiceForLanguage(
  langCode: string,
  options?: {
    voiceURI?: string;
    voiceName?: string;
    gender?: 'male' | 'female' | 'neutral';
  }
): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return null;
  }

  if (cachedVoices.length === 0) {
    cachedVoices = window.speechSynthesis.getVoices();
  }

  if (cachedVoices.length === 0) {
    return null;
  }

  // 1. Direct match by URI or exact name
  if (options?.voiceURI) {
    const byUri = cachedVoices.find((v) => v.voiceURI === options.voiceURI);
    if (byUri) return byUri;
  }
  if (options?.voiceName) {
    const byName = cachedVoices.find((v) => v.name === options.voiceName);
    if (byName) return byName;
  }

  const langVoices = getVoicesForLanguage(langCode);

  // 2. Match by gender preference if requested
  if (options?.gender && langVoices.length > 1) {
    const isFemale = options.gender === 'female';
    const isMale = options.gender === 'male';

    const genderFiltered = langVoices.filter((v) => {
      const n = v.name.toLowerCase();
      if (isFemale) {
        return (
          n.includes('female') ||
          n.includes('zira') ||
          n.includes('samantha') ||
          n.includes('karen') ||
          n.includes('victoria') ||
          n.includes('flo') ||
          n.includes('catherine') ||
          n.includes('shelley')
        );
      }
      if (isMale) {
        return (
          n.includes('male') ||
          n.includes('david') ||
          n.includes('daniel') ||
          n.includes('george') ||
          n.includes('arthur') ||
          n.includes('grandpa') ||
          n.includes('guy') ||
          n.includes('mark')
        );
      }
      return true;
    });

    if (genderFiltered.length > 0) {
      return genderFiltered[0];
    }
  }

  if (langVoices.length > 0) {
    return langVoices[0];
  }

  // Fallback to default or first available
  return cachedVoices.find((v) => v.default) || cachedVoices[0] || null;
}

/**
 * Plays base64 PCM audio returned from server Gemini TTS endpoint
 */
function playPcmAudio(
  base64Data: string,
  sampleRate = 24000,
  onStart?: () => void,
  onEnd?: () => void
): { stop: () => void } | null {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return null;

    const audioCtx = new AudioCtx();
    const binaryString = atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const int16 = new Int16Array(bytes.buffer);
    const buffer = audioCtx.createBuffer(1, int16.length, sampleRate);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < int16.length; i++) {
      channelData[i] = int16[i] / 32768.0;
    }

    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);

    source.onended = () => {
      onEnd?.();
      audioCtx.close().catch(() => {});
    };

    onStart?.();
    source.start(0);

    return {
      stop: () => {
        try {
          source.stop();
          audioCtx.close().catch(() => {});
        } catch {
          // Ignore
        }
      }
    };
  } catch (err) {
    console.warn('Failed to play PCM audio:', err);
    return null;
  }
}

let isServerTtsThrottled = false;
let serverTtsThrottledUntil = 0;

function startSpeechHeartbeat() {
  stopSpeechHeartbeat();
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    speechHeartbeatTimer = setInterval(() => {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      } else {
        stopSpeechHeartbeat();
      }
    }, 5000);
  }
}

function stopSpeechHeartbeat() {
  if (speechHeartbeatTimer) {
    clearInterval(speechHeartbeatTimer);
    speechHeartbeatTimer = null;
  }
}

/**
 * Speaks a subtitle cue using Web Speech API with character voice assignment and natural prosody
 */
export function speakSubtitleCue(
  cue: SubtitleCue,
  settings: DubbingSettings,
  onStartSpeech?: () => void,
  onEndSpeech?: () => void
): void {
  if (!settings.enabled && cue.id !== 'sample-test') return;
  if (cue.id === lastSpokenCueId && cue.id !== 'sample-test') return; // Already spoken

  const rawText = (cue.translation || cue.text || '').trim();
  if (!rawText) return;

  // Clean the text for natural speaking (strip [Music], stage notes, colons)
  const textToSpeak = settings.naturalProsody !== false
    ? cleanSpokenTextForNaturalSpeech(rawText)
    : rawText;

  if (!textToSpeak) return; // Nothing left after stripping stage directions like [Music]

  if (cue.id !== 'sample-test') {
    lastSpokenCueId = cue.id;
  }

  // Stop any active audio
  stopDubbingSpeech();

  // Multi-character voice & vibe resolution
  let characterProfile: CharacterVoiceProfile | undefined;
  if (cue.speaker && settings.characterProfiles) {
    characterProfile = settings.characterProfiles[cue.speaker];
  }

  // Determine vibe definition
  const vibeKey = characterProfile?.vibe || cue.vibe || 'natural';
  const vibeDef = CHARACTER_VIBES[vibeKey] || CHARACTER_VIBES.natural;

  const pitchOffset = characterProfile?.pitchOffset ?? vibeDef.pitchOffset;
  const rateOffset = characterProfile?.rateOffset ?? vibeDef.rateOffset;

  // Calculate dynamic natural cadence adapted to subtitle duration
  const cueDuration = (cue.endTime && cue.startTime && cue.endTime > cue.startTime)
    ? cue.endTime - cue.startTime
    : 3.0;

  const finalRate = settings.naturalProsody !== false
    ? calculateNaturalCadence(textToSpeak, cueDuration, settings.rate || 1.0, rateOffset)
    : Math.max(0.7, Math.min(1.4, (settings.rate || 1.0) + rateOffset));

  const finalPitch = Math.max(0.6, Math.min(1.5, (settings.pitch || 1.0) + pitchOffset));

  // Try Web Speech API first (default & preferred)
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();

      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.rate = finalRate;
      utterance.pitch = finalPitch;
      utterance.volume = 1.0;

      // Voice resolution for this character
      const voice = findVoiceForLanguage(settings.targetLanguage, {
        voiceURI: characterProfile?.voiceURI,
        voiceName: characterProfile?.voiceName,
        gender: characterProfile?.gender
      });

      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      } else {
        utterance.lang = settings.targetLanguage;
      }

      utterance.onstart = () => {
        startSpeechHeartbeat();
        onStartSpeech?.();
      };

      utterance.onend = () => {
        stopSpeechHeartbeat();
        currentUtterance = null;
        onEndSpeech?.();
      };

      utterance.onerror = (e) => {
        stopSpeechHeartbeat();
        currentUtterance = null;
        onEndSpeech?.();

        // Normal lifecycle events when pausing, seeking, or switching cues
        if (e.error === 'interrupted' || e.error === 'canceled') {
          return;
        }

        // Only try server TTS if speech synthesis is not supported or encountered a fatal error
        if (Date.now() > serverTtsThrottledUntil) {
          fallbackToServerTTS(textToSpeak, settings.targetLanguage, onStartSpeech, onEndSpeech);
        }
      };

      currentUtterance = utterance;
      // Store on window to avoid Chrome garbage collection bug
      (window as any).__activeDubbingUtterance = utterance;

      // Speak immediately with ZERO delay
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('Speech synthesis speak immediate error:', err);
      }

      return;
    } catch {
      // Ignore
    }
  }

  // Fallback to server TTS if speech synthesis not supported in window
  if (Date.now() > serverTtsThrottledUntil) {
    fallbackToServerTTS(textToSpeak, settings.targetLanguage, onStartSpeech, onEndSpeech);
  } else {
    onEndSpeech?.();
  }
}

/**
 * Previews a character's voice and vibe with an expressive sample line
 */
export function previewCharacterVoice(
  profile: CharacterVoiceProfile,
  targetLanguage: string,
  onStartSpeech?: () => void,
  onEndSpeech?: () => void,
  customText?: string
): void {
  const sampleLines: Record<string, string> = {
    excited: "Hey! I'm so excited to share this incredible moment with you!",
    calm: "Notice the deep, calm rhythm guiding us quietly through the scene.",
    warm: "It is wonderful to welcome you here. Let's experience this together.",
    dramatic: "Beneath the surface, an unexpected truth was about to be revealed.",
    authoritative: "The key evidence confirms our conclusions with absolute clarity.",
    playful: "Haha, look at that! This is going to be so much fun!",
    natural: "Hello! This is my natural voice profile, speaking with realistic human cadence."
  };

  const textToSpeak = customText || sampleLines[profile.vibe] || sampleLines.natural;
  const mockCue: SubtitleCue = {
    id: 'sample-test',
    startTime: 0,
    endTime: 4,
    text: textToSpeak,
    speaker: profile.name,
    vibe: profile.vibe
  };

  const mockSettings: DubbingSettings = {
    enabled: true,
    targetLanguage,
    pitch: 1.0,
    rate: 1.0,
    duckingVolume: 0,
    useBrowserSpeech: true,
    naturalProsody: true,
    autoCharacterDetection: true,
    characterProfiles: {
      [profile.name]: profile
    }
  };

  speakSubtitleCue(mockCue, mockSettings, onStartSpeech, onEndSpeech);
}

/**
 * Fallback to /api/dub-voice if browser speech synthesis is unavailable
 */
async function fallbackToServerTTS(
  text: string,
  targetLanguage: string,
  onStartSpeech?: () => void,
  onEndSpeech?: () => void
) {
  if (Date.now() < serverTtsThrottledUntil) {
    onEndSpeech?.();
    return;
  }

  try {
    const res = await fetch('/api/dub-voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, targetLanguage })
    });

    if (!res.ok) {
      serverTtsThrottledUntil = Date.now() + 60000;
      onEndSpeech?.();
      return;
    }

    const data = await res.json();
    if (data.useBrowserSpeech) {
      serverTtsThrottledUntil = Date.now() + 60000;
      onEndSpeech?.();
      return;
    }

    if (data.audioBase64) {
      activeAudioSource = playPcmAudio(
        data.audioBase64,
        data.sampleRate || 24000,
        onStartSpeech,
        onEndSpeech
      );
    } else {
      onEndSpeech?.();
    }
  } catch {
    serverTtsThrottledUntil = Date.now() + 60000;
    onEndSpeech?.();
  }
}

/**
 * Stops all ongoing dubbing speech immediately
 */
export function stopDubbingSpeech(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignore
    }
    currentUtterance = null;
    (window as any).__activeDubbingUtterance = null;
  }

  if (activeAudioSource) {
    activeAudioSource.stop();
    activeAudioSource = null;
  }
}

/**
 * Resets dubbing tracker when user seeks or changes video
 */
export function resetDubbingTracker(): void {
  stopDubbingSpeech();
  lastSpokenCueId = null;
}

export function getAvailableVoices(): SpeechSynthesisVoice[] {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    if (cachedVoices.length === 0) {
      cachedVoices = window.speechSynthesis.getVoices();
    }
    return cachedVoices;
  }
  return [];
}
