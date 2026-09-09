export type VideoPlatform =
  | 'youtube'
  | 'bilibili'
  | 'vimeo'
  | 'dailymotion'
  | 'twitch'
  | 'facebook'
  | 'direct'
  | 'unsupported';

export interface VideoSourceInfo {
  platform: VideoPlatform;
  originalUrl: string;
  videoId: string;
  embedUrl: string;
  title: string;
  author?: string;
  thumbnailUrl?: string;
  duration?: number; // In seconds if known
  isDirectMedia: boolean;
  aspectRatio?: string;
  description?: string;
}

export type CharacterVibe =
  | 'warm'          // warm & friendly tone, gentle resonance
  | 'excited'       // energetic & upbeat vibe, lively cadence
  | 'calm'          // deep, steady, relaxed narrator vibe
  | 'dramatic'      // cinematic, emotional inflection
  | 'authoritative' // crisp, commanding, professional
  | 'playful'       // light, spirited, cheerful
  | 'natural';      // conversational, organic

export interface CharacterVoiceProfile {
  id: string;
  name: string;
  gender: 'male' | 'female' | 'neutral';
  vibe: CharacterVibe;
  voiceURI?: string;
  voiceName?: string;
  pitchOffset: number; // -0.4 to +0.4 offset
  rateOffset: number;  // -0.3 to +0.3 offset
  color: string;       // badge color (e.g. '#a855f7', '#38bdf8', '#34d399')
}

export interface SubtitleCue {
  id: string;
  startTime: number; // in seconds
  endTime: number;   // in seconds
  text: string;
  translation?: string;
  speaker?: string;  // e.g. "Narrator", "Speaker 1", "Alex"
  vibe?: CharacterVibe;
  emotion?: string;
}

export interface SubtitleTrack {
  id: string;
  label: string;
  language: string; // e.g. 'en', 'zh', 'es', 'ja', 'hi', etc.
  isOriginal: boolean;
  cues: SubtitleCue[];
}

export interface SubtitleSettings {
  enabled: boolean;
  fontSize: 'sm' | 'base' | 'lg' | 'xl' | '2xl';
  position: 'bottom' | 'top' | 'middle';
  bottomOffset: number; // in px
  delaySeconds: number; // -5.0 to +5.0 seconds
  backgroundColor: string; // e.g. 'rgba(0,0,0,0.75)'
  textColor: string;
  sourceLanguage: string;
  targetLanguage: string;
  showDualLanguage: boolean; // show original + translated
  isRTL: boolean;
}

export interface DubbingSettings {
  enabled: boolean;
  targetLanguage: string;
  voiceName?: string;
  pitch: number; // 0.8 to 1.2
  rate: number;  // 0.8 to 1.3
  duckingVolume: number; // original audio level when dubbing (0.0 to 0.4)
  useBrowserSpeech: boolean;
  naturalProsody: boolean;
  autoCharacterDetection: boolean;
  characterProfiles: Record<string, CharacterVoiceProfile>;
}

export interface PlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number; // 0 to 1
  isMuted: boolean;
  playbackRate: number;
  bufferedTime: number;
  isBuffering: boolean;
  isFullscreen: boolean;
  isPip: boolean;
  quality: string;
  hasEnded: boolean;
}

export interface RecentVideo {
  id: string;
  url: string;
  title: string;
  platform: VideoPlatform;
  thumbnailUrl?: string;
  lastPosition: number;
  duration: number;
  timestamp: number;
}

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  rtl?: boolean;
}

export type AudioTrackSource = 'original' | 'dubbed';
export type AudioMode = 'native' | 'synthesized';

export interface AudioSyncMetrics {
  driftMs: number;
  isDriftExceeded: boolean; // drift > 500ms
  activeSource: AudioTrackSource;
  isSpeaking: boolean;
  activeSpeaker: string | null;
  activeVibe: CharacterVibe | null;
  lipMatchAccuracy: number; // 0-100%
  expectedCueStart: number;
  currentPlaybackTime: number;
  autoResyncEnabled: boolean;
  audioEngineReady: boolean;
  // Strict toggling & bleed-through prevention metrics
  effectiveNativeVolume: number; // Strictly 0 when dubbed, preventing audio bleed-through
  nativeUserVolume: number; // Stored user volume (0-1.0)
  isNativeMuted: boolean;
  bleedThroughProtected: boolean; // True when hardware volume is locked to 0
}
