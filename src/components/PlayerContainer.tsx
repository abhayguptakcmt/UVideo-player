import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  VideoSourceInfo,
  PlayerState,
  SubtitleCue,
  SubtitleSettings,
  DubbingSettings
} from '../types';
import { HTML5PlayerAdapter } from './adapters/HTML5PlayerAdapter';
import { YouTubePlayerAdapter } from './adapters/YouTubePlayerAdapter';
import { VimeoPlayerAdapter } from './adapters/VimeoPlayerAdapter';
import { DailymotionPlayerAdapter } from './adapters/DailymotionPlayerAdapter';
import { GenericEmbedAdapter } from './adapters/GenericEmbedAdapter';
import { SubtitleOverlay } from './SubtitleOverlay';
import { ControlBar } from './ControlBar';
import { TranslationModal } from './modals/TranslationModal';
import { SubtitleSettingsModal } from './modals/SubtitleSettingsModal';
import { DubbingModal } from './modals/DubbingModal';
import { AudioManagerModal } from './modals/AudioManagerModal';
import { ShortcutsModal } from './modals/ShortcutsModal';
import { ErrorDisplay } from './ErrorDisplay';
import { findActiveCue } from '../services/subtitleService';
import {
  speakSubtitleCue,
  stopDubbingSpeech,
  resetDubbingTracker,
  unlockSpeechSynthesis
} from '../services/speechSynthesisService';
import { audioSyncManager } from '../services/audioSyncManager';
import {
  saveSubtitleSettings,
  saveDubbingSettings,
  getSavedDubbingSettings,
  updateVideoProgress
} from '../services/cacheService';
import {
  analyzeAndTagCueCharacters,
  buildDefaultCharacterProfiles
} from '../services/characterVoiceService';
import {
  ArrowLeft,
  Loader2,
  Volume2,
  VolumeX,
  Mic,
  Sparkles,
  ExternalLink,
  Languages,
  Check,
  Activity
} from 'lucide-react';

interface PlayerContainerProps {
  sourceInfo: VideoSourceInfo;
  initialSubtitles?: SubtitleCue[];
  onBackToHome: () => void;
  savedPosition?: number;
}

export const PlayerContainer: React.FC<PlayerContainerProps> = ({
  sourceInfo,
  initialSubtitles = [],
  onBackToHome,
  savedPosition = 0
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Player state
  const [playerState, setPlayerState] = useState<PlayerState>({
    isPlaying: true,
    currentTime: savedPosition,
    duration: sourceInfo.duration || 0,
    volume: 1,
    isMuted: false,
    playbackRate: 1,
    bufferedTime: 0,
    isBuffering: false,
    isFullscreen: false,
    isPip: false,
    quality: 'Auto',
    hasEnded: false
  });

  // Track original volume and mute state before dubbing was activated
  const [userVolumeBeforeDubbing, setUserVolumeBeforeDubbing] = useState<number>(1);
  const [userMutedBeforeDubbing, setUserMutedBeforeDubbing] = useState<boolean>(false);
  const [isAutoPreparingDubbing, setIsAutoPreparingDubbing] = useState(false);

  // Imperative seek command state (for sending seek values down to adapters)
  const [seekCommand, setSeekCommand] = useState<number | null>(
    savedPosition > 0 ? savedPosition : null
  );

  // Subtitles & Dubbing State
  const [cues, setCues] = useState<SubtitleCue[]>(() => {
    const { taggedCues } = analyzeAndTagCueCharacters(initialSubtitles);
    return taggedCues;
  });
  const [activeCue, setActiveCue] = useState<SubtitleCue | null>(null);
  const [isDubbingSpeaking, setIsDubbingSpeaking] = useState(false);

  // Modals
  const [isTranslationModalOpen, setIsTranslationModalOpen] = useState(false);
  const [isSubtitleModalOpen, setIsSubtitleModalOpen] = useState(false);
  const [isDubbingModalOpen, setIsDubbingModalOpen] = useState(false);
  const [isAudioManagerOpen, setIsAudioManagerOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Subtitle Settings
  const [subtitleSettings, setSubtitleSettings] = useState<SubtitleSettings>({
    enabled: true,
    fontSize: 'base',
    position: 'bottom',
    bottomOffset: 0,
    delaySeconds: 0,
    backgroundColor: 'rgba(9, 13, 25, 0.85)',
    textColor: '#ffffff',
    sourceLanguage: 'auto',
    targetLanguage: 'es',
    showDualLanguage: true,
    isRTL: false
  });

  // Dubbing Settings
  const [dubbingSettings, setDubbingSettings] = useState<DubbingSettings>(() => {
    const saved = getSavedDubbingSettings();
    const { detectedSpeakers } = analyzeAndTagCueCharacters(initialSubtitles);
    let initialProfiles = saved.characterProfiles || {};
    if (Object.keys(initialProfiles).length === 0 && detectedSpeakers.length > 0) {
      initialProfiles = buildDefaultCharacterProfiles(detectedSpeakers, [], saved.targetLanguage || 'es');
    }
    return {
      enabled: saved.enabled ?? false,
      targetLanguage: saved.targetLanguage || 'es',
      pitch: saved.pitch ?? 1.0,
      rate: saved.rate ?? 1.0,
      duckingVolume: saved.duckingVolume ?? 0.0,
      useBrowserSpeech: saved.useBrowserSpeech ?? true,
      naturalProsody: saved.naturalProsody ?? true,
      autoCharacterDetection: saved.autoCharacterDetection ?? true,
      characterProfiles: initialProfiles
    };
  });

  /**
   * Toggles AI Dubbing ON or OFF with automatic video audio management:
   * - When Dubbing is ON: Original video audio is stopped (muted & volume = 0).
   * - When Dubbing is OFF: Original video audio is automatically turned back on!
   */
  const handleToggleDubbing = useCallback(
    async (forceState?: boolean) => {
      const nextState =
        forceState !== undefined ? forceState : !dubbingSettings.enabled;

      if (nextState) {
        // Unlock speech synthesis & audio context on user gesture
        unlockSpeechSynthesis();

        // 1. Save user's current volume before dubbing
        const savedVolume = playerState.volume > 0 ? playerState.volume : userVolumeBeforeDubbing > 0 ? userVolumeBeforeDubbing : 1;
        setUserVolumeBeforeDubbing(savedVolume);
        setUserMutedBeforeDubbing(playerState.isMuted);

        // 2. Strictly switch audioManager track to 'dubbed' (volume clamped to 0)
        audioSyncManager.setNativeUserVolume(savedVolume);
        audioSyncManager.setAudioTrackSource('dubbed');

        // 3. STOP original video audio immediately (hardware volume clamped to 0, isMuted = true)
        setPlayerState((p) => ({
          ...p,
          volume: 0,
          isMuted: true
        }));

        // 3. Update dubbing state
        const updatedDubbing = { ...dubbingSettings, enabled: true };
        setDubbingSettings(updatedDubbing);
        saveDubbingSettings(updatedDubbing);

        // 4. Ensure subtitles are enabled
        setSubtitleSettings((s) => ({ ...s, enabled: true }));

        // 5. If no subtitles are loaded, auto-generate them so dubbing has text to speak
        let currentCues = cues;
        if (currentCues.length === 0) {
          setIsAutoPreparingDubbing(true);
          try {
            const res = await fetch('/api/generate-subtitles', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: sourceInfo.title,
                duration: playerState.duration || 120,
                platform: sourceInfo.platform,
                language: 'en'
              })
            });
            if (res.ok) {
              const data = await res.json();
              if (data.cues && data.cues.length > 0) {
                const { taggedCues, detectedSpeakers } = analyzeAndTagCueCharacters(data.cues);
                currentCues = taggedCues;
                setCues(currentCues);

                if (Object.keys(updatedDubbing.characterProfiles || {}).length === 0) {
                  const profiles = buildDefaultCharacterProfiles(detectedSpeakers, [], updatedDubbing.targetLanguage);
                  updatedDubbing.characterProfiles = profiles;
                }
              }
            }
          } catch (err) {
            console.warn('Auto subtitle generation failed:', err);
          } finally {
            setIsAutoPreparingDubbing(false);
          }
        } else {
          // Ensure existing cues have character speaker & vibe tags
          const { taggedCues, detectedSpeakers } = analyzeAndTagCueCharacters(currentCues);
          currentCues = taggedCues;
          setCues(currentCues);

          if (Object.keys(updatedDubbing.characterProfiles || {}).length === 0) {
            const profiles = buildDefaultCharacterProfiles(detectedSpeakers, [], updatedDubbing.targetLanguage);
            updatedDubbing.characterProfiles = profiles;
          }
        }

        // 6. If subtitles don't have translation in the target language, auto-translate
        const targetLang = updatedDubbing.targetLanguage;
        const needsTranslation =
          targetLang &&
          targetLang !== 'en' &&
          currentCues.length > 0 &&
          !currentCues[0].translation;

        if (needsTranslation) {
          setIsAutoPreparingDubbing(true);
          try {
            const batchPayload = currentCues.map((c) => ({ id: c.id, text: c.text }));
            const res = await fetch('/api/translate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                cues: batchPayload,
                targetLanguage: targetLang
              })
            });
            if (res.ok) {
              const data = await res.json();
              const map = new Map(
                (data.translations || []).map((t: any) => [t.id, t.translation])
              );
              const translatedCues = currentCues.map((cue) => ({
                ...cue,
                translation: (map.get(cue.id) as string) || cue.text
              }));
              setCues(translatedCues);
              setSubtitleSettings((s) => ({ ...s, targetLanguage: targetLang }));
            }
          } catch (err) {
            console.warn('Auto translation for dubbing failed:', err);
          } finally {
            setIsAutoPreparingDubbing(false);
          }
        }

        setDubbingSettings(updatedDubbing);
        saveDubbingSettings(updatedDubbing);
      } else {
        // Turning dubbing OFF
        stopDubbingSpeech();
        setIsDubbingSpeaking(false);
        audioSyncManager.setAudioTrackSource('original');

        // 1. Update dubbing state
        const updatedDubbing = { ...dubbingSettings, enabled: false };
        setDubbingSettings(updatedDubbing);
        saveDubbingSettings(updatedDubbing);

        // 2. AUTOMATICALLY RESTORE original video audio!
        const restoredVolume = userVolumeBeforeDubbing > 0 ? userVolumeBeforeDubbing : 1;
        audioSyncManager.setNativeUserVolume(restoredVolume);
        audioSyncManager.setNativeUserMuted(userMutedBeforeDubbing);

        setPlayerState((p) => ({
          ...p,
          volume: restoredVolume,
          isMuted: userMutedBeforeDubbing
        }));
      }
    },
    [
      dubbingSettings,
      playerState.volume,
      playerState.isMuted,
      playerState.duration,
      cues,
      sourceInfo,
      userVolumeBeforeDubbing,
      userMutedBeforeDubbing
    ]
  );

  // Update active subtitle cue as currentTime updates with zero delay
  useEffect(() => {
    const cue = findActiveCue(
      cues,
      playerState.currentTime,
      subtitleSettings.delaySeconds
    );
    setActiveCue(cue);

    // Keep audioSyncManager updated with latest clock and cues
    audioSyncManager.updateState({
      videoTime: playerState.currentTime,
      isPlaying: playerState.isPlaying,
      activeCue: cue,
      dubbingSettings,
      allCues: cues
    });

    // If dubbing is active and video is playing, speak the current cue with zero latency
    if (cue && dubbingSettings.enabled && playerState.isPlaying) {
      speakSubtitleCue(
        cue,
        dubbingSettings,
        () => {
          audioSyncManager.onSpeechStart(cue, dubbingSettings.rate || 1.0);
          setIsDubbingSpeaking(true);
        },
        () => {
          audioSyncManager.onSpeechEnd();
          setIsDubbingSpeaking(false);
        }
      );
    }
  }, [
    playerState.currentTime,
    cues,
    subtitleSettings.delaySeconds,
    dubbingSettings.enabled,
    dubbingSettings.targetLanguage,
    dubbingSettings.rate,
    dubbingSettings.pitch,
    dubbingSettings.naturalProsody,
    dubbingSettings.characterProfiles,
    playerState.isPlaying
  ]);

  // When video is paused, stop dubbing speech immediately
  useEffect(() => {
    if (!playerState.isPlaying) {
      stopDubbingSpeech();
      audioSyncManager.onSpeechEnd();
      setIsDubbingSpeaking(false);
    }
  }, [playerState.isPlaying]);

  // Save progress periodically to localStorage
  useEffect(() => {
    if (playerState.currentTime > 0) {
      updateVideoProgress(
        sourceInfo.originalUrl,
        playerState.currentTime,
        playerState.duration
      );
    }
  }, [
    Math.floor(playerState.currentTime / 5),
    sourceInfo.originalUrl,
    playerState.duration
  ]);

  // Auto-hide controls during mouse inactivity
  const showControlsTemporarily = useCallback(() => {
    setControlsVisible(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (playerState.isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, 3500);
    }
  }, [playerState.isPlaying]);

  useEffect(() => {
    if (!playerState.isPlaying) {
      setControlsVisible(true);
    }
  }, [playerState.isPlaying]);

  // Keyboard navigation & controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input/textarea/select
      if (
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(
          (e.target as HTMLElement)?.tagName
        )
      ) {
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          unlockSpeechSynthesis();
          setPlayerState((p) => {
            const nextPlaying = !p.isPlaying;
            if (!nextPlaying) {
              stopDubbingSpeech();
              audioSyncManager.onSpeechEnd();
              setIsDubbingSpeaking(false);
            }
            return { ...p, isPlaying: nextPlaying };
          });
          showControlsTemporarily();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handleRelativeSeek(-10);
          showControlsTemporarily();
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleRelativeSeek(10);
          showControlsTemporarily();
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (!dubbingSettings.enabled) {
            setPlayerState((p) => ({
              ...p,
              volume: Math.min(1, +(p.volume + 0.1).toFixed(2)),
              isMuted: false
            }));
          }
          showControlsTemporarily();
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (!dubbingSettings.enabled) {
            setPlayerState((p) => ({
              ...p,
              volume: Math.max(0, +(p.volume - 0.1).toFixed(2))
            }));
          }
          showControlsTemporarily();
          break;
        case 'KeyM':
          if (dubbingSettings.enabled) {
            // Turning off dubbing restores audio
            handleToggleDubbing(false);
          } else {
            setPlayerState((p) => ({ ...p, isMuted: !p.isMuted }));
          }
          showControlsTemporarily();
          break;
        case 'KeyF':
          handleToggleFullscreen();
          break;
        case 'KeyC':
          setSubtitleSettings((s) => ({ ...s, enabled: !s.enabled }));
          showControlsTemporarily();
          break;
        case 'KeyT':
          setIsTranslationModalOpen(true);
          break;
        case 'KeyS':
          setIsSubtitleModalOpen(true);
          break;
        case 'KeyD':
          handleToggleDubbing();
          showControlsTemporarily();
          break;
        case 'KeyA':
          setIsAudioManagerOpen(true);
          break;
        case 'Escape':
          setIsTranslationModalOpen(false);
          setIsSubtitleModalOpen(false);
          setIsDubbingModalOpen(false);
          setIsAudioManagerOpen(false);
          setIsShortcutsModalOpen(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showControlsTemporarily, dubbingSettings.enabled, handleToggleDubbing]);

  // Seeking handlers
  const handleSeek = (seconds: number) => {
    const validSec = Math.max(0, Math.min(seconds, playerState.duration || seconds));
    setSeekCommand(validSec);
    setPlayerState((p) => ({ ...p, currentTime: validSec }));
    resetDubbingTracker();
    audioSyncManager.resyncAudio();
  };

  const handleRelativeSeek = (delta: number) => {
    const nextTime = Math.max(0, playerState.currentTime + delta);
    handleSeek(nextTime);
  };

  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setPlayerState((p) => ({ ...p, isFullscreen: true }));
    } else {
      document.exitFullscreen().catch(() => {});
      setPlayerState((p) => ({ ...p, isFullscreen: false }));
    }
  };

  const handleTogglePip = () => {
    setPlayerState((p) => ({ ...p, isPip: !p.isPip }));
  };

  // Render the appropriate player adapter
  const renderAdapter = () => {
    const commonProps = {
      sourceInfo,
      playerState,
      isDubbingActive: dubbingSettings.enabled,
      onTimeUpdate: (currentTime: number, duration?: number) => {
        setPlayerState((p) => ({
          ...p,
          currentTime,
          duration:
            duration && duration > 0
              ? duration
              : p.duration > 0
              ? p.duration
              : currentTime > 0
              ? Math.max(p.duration, currentTime)
              : p.duration
        }));
      },
      onDurationChange: (duration: number) => {
        setPlayerState((p) => ({ ...p, duration }));
      },
      onStateChange: (isPlaying: boolean, isBuffering?: boolean) => {
        setPlayerState((p) => ({
          ...p,
          isPlaying,
          isBuffering: Boolean(isBuffering)
        }));
      },
      onProgress: (bufferedTime: number) => {
        setPlayerState((p) => ({ ...p, bufferedTime }));
      },
      onEnded: () => {
        setPlayerState((p) => ({ ...p, isPlaying: false, hasEnded: true }));
        resetDubbingTracker();
      },
      onError: (msg: string) => {
        setErrorMessage(msg);
      },
      seekCommand,
      onSeekHandled: () => setSeekCommand(null)
    };

    switch (sourceInfo.platform) {
      case 'direct':
        return <HTML5PlayerAdapter {...commonProps} />;
      case 'youtube':
        return <YouTubePlayerAdapter {...commonProps} />;
      case 'vimeo':
        return <VimeoPlayerAdapter {...commonProps} />;
      case 'dailymotion':
        return <DailymotionPlayerAdapter {...commonProps} />;
      case 'bilibili':
      case 'twitch':
      case 'facebook':
      default:
        return <GenericEmbedAdapter {...commonProps} />;
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-2 sm:px-4 py-4 md:py-6 space-y-4">
      {/* Top Header Row with Return & Title */}
      <div className="flex items-center justify-between gap-3 text-slate-300">
        <button
          onClick={onBackToHome}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Library</span>
        </button>

        <div className="flex-1 min-w-0 px-2 text-center sm:text-left">
          <h1 className="text-sm sm:text-base font-bold text-white truncate">
            {sourceInfo.title || 'Online Video Stream'}
          </h1>
          <div className="flex items-center justify-center sm:justify-start gap-2 text-xs text-slate-400">
            <span className="uppercase font-semibold text-[10px] px-1.5 py-0.2 bg-slate-800 rounded border border-slate-700">
              {sourceInfo.platform}
            </span>
            {sourceInfo.author && (
              <span className="truncate">{sourceInfo.author}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick AI Dubbing Toggle in top bar */}
          <button
            onClick={() => handleToggleDubbing()}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              dubbingSettings.enabled
                ? 'bg-purple-600 border-purple-400 text-white shadow-md shadow-purple-600/30'
                : 'bg-slate-850 border-slate-750 text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="Toggle AI Voice Dubbing (D)"
          >
            <Mic className={`w-3.5 h-3.5 ${dubbingSettings.enabled ? 'animate-pulse text-white' : 'text-purple-400'}`} />
            <span>{dubbingSettings.enabled ? 'Dubbing: ON' : 'AI Dubbing'}</span>
          </button>

          <button
            onClick={() => setIsTranslationModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600/80 to-indigo-600/80 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-sm transition-all"
          >
            <Languages className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Translate</span>
          </button>
        </div>
      </div>

      {/* Main Video Stage */}
      {errorMessage ? (
        <ErrorDisplay
          error={errorMessage}
          onRetry={() => {
            setErrorMessage(null);
            setPlayerState((p) => ({ ...p, isPlaying: true }));
          }}
          onBack={onBackToHome}
        />
      ) : (
        <div
          ref={containerRef}
          onMouseMove={showControlsTemporarily}
          onClick={showControlsTemporarily}
          className="relative w-full aspect-video max-h-[78vh] bg-black rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center group"
        >
          {/* Adapter Video Player */}
          <div className="w-full h-full">{renderAdapter()}</div>

          {/* Buffering Indicator */}
          {playerState.isBuffering && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center pointer-events-none z-20">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/90 border border-slate-700 text-cyan-300 text-xs font-semibold shadow-xl">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Buffering Stream...</span>
              </div>
            </div>
          )}

          {/* Prominent Overlay Badge when AI Dubbing is active & original audio is stopped */}
          {dubbingSettings.enabled && (
            <div className="absolute top-4 left-4 z-30 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-950/90 border border-purple-600/70 text-purple-200 text-xs shadow-2xl backdrop-blur-md animate-in fade-in select-none">
              <VolumeX className="w-3.5 h-3.5 text-rose-400" />
              <span className="font-semibold text-white">AI Dubbing Active:</span>
              <span className="text-purple-300">Original video audio stopped</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleDubbing(false);
                }}
                className="ml-2 px-2 py-0.5 rounded-lg bg-purple-800 hover:bg-purple-700 text-white text-[11px] font-bold transition-colors cursor-pointer"
                title="Restore original video audio"
              >
                Turn OFF &amp; Restore Audio
              </button>
            </div>
          )}

          {/* Subtitle Display Overlay */}
          <SubtitleOverlay
            cue={activeCue}
            settings={subtitleSettings}
            isDubbingSpeaking={isDubbingSpeaking}
          />

          {/* Floating Controls Overlay (fades out during playback unless hovered) */}
          <div
            className={`absolute inset-x-0 bottom-0 z-30 transition-opacity duration-300 ${
              controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <ControlBar
              playerState={playerState}
              subtitleSettings={subtitleSettings}
              dubbingSettings={dubbingSettings}
              onTogglePlay={() => {
                unlockSpeechSynthesis();
                setPlayerState((p) => {
                  const nextPlaying = !p.isPlaying;
                  if (!nextPlaying) {
                    stopDubbingSpeech();
                    audioSyncManager.onSpeechEnd();
                    setIsDubbingSpeaking(false);
                  }
                  return { ...p, isPlaying: nextPlaying };
                });
              }}
              onSeek={handleSeek}
              onRelativeSeek={handleRelativeSeek}
              onVolumeChange={(vol) => {
                if (dubbingSettings.enabled) {
                  setUserVolumeBeforeDubbing(vol);
                } else {
                  setPlayerState((p) => ({ ...p, volume: vol, isMuted: false }));
                }
              }}
              onToggleMute={() => {
                if (dubbingSettings.enabled) {
                  // Unmuting turns off dubbing and auto-restores video audio
                  handleToggleDubbing(false);
                } else {
                  setPlayerState((p) => ({ ...p, isMuted: !p.isMuted }));
                }
              }}
              onPlaybackRateChange={(rate) =>
                setPlayerState((p) => ({ ...p, playbackRate: rate }))
              }
              onToggleFullscreen={handleToggleFullscreen}
              onTogglePip={handleTogglePip}
              onToggleSubtitles={() =>
                setSubtitleSettings((s) => ({ ...s, enabled: !s.enabled }))
              }
              onOpenSubtitleSettings={() => setIsSubtitleModalOpen(true)}
              onOpenTranslationModal={() => setIsTranslationModalOpen(true)}
              onToggleDubbing={() => handleToggleDubbing()}
              onOpenDubbingModal={() => setIsDubbingModalOpen(true)}
              onOpenAudioManager={() => setIsAudioManagerOpen(true)}
              supportsPip={sourceInfo.platform === 'direct'}
            />
          </div>
        </div>
      )}

      {/* Subtitles & Audio Dubbing Status Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                dubbingSettings.enabled ? 'bg-purple-400 animate-pulse' : 'bg-cyan-400'
              }`}
            />
            <span className="font-semibold text-white">Audio &amp; Subtitles Status:</span>
          </div>

          <span>
            {dubbingSettings.enabled ? (
              <span className="text-purple-300 font-medium">
                AI Dubbing is active in <strong>{dubbingSettings.targetLanguage.toUpperCase()}</strong>. Original video audio is stopped.
              </span>
            ) : cues.length > 0 ? (
              `${cues.length} subtitles loaded (${
                subtitleSettings.targetLanguage
                  ? `Translated to ${subtitleSettings.targetLanguage.toUpperCase()}`
                  : 'Original language'
              })`
            ) : (
              'Original audio is playing. Click AI Dubbing to translate and speak spoken audio.'
            )}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Quick dubbing toggle */}
          <button
            onClick={() => handleToggleDubbing()}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
              dubbingSettings.enabled
                ? 'bg-purple-600/80 border-purple-500 text-white'
                : 'bg-slate-800 border-slate-700 text-slate-200 hover:text-white hover:bg-slate-700'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>
              {dubbingSettings.enabled ? 'Turn OFF Dubbing (Restore Audio)' : 'Turn ON AI Dubbing (Stop Video Audio)'}
            </span>
          </button>

          <span className="text-slate-600">•</span>

          <button
            onClick={() => setIsDubbingModalOpen(true)}
            className="hover:text-purple-300 underline font-medium"
          >
            Voice Settings
          </button>

          <span className="text-slate-600">•</span>

          <button
            onClick={() => setIsSubtitleModalOpen(true)}
            className="hover:text-white underline font-medium"
          >
            Subtitle Timing
          </button>

          <span className="text-slate-600">•</span>

          <button
            id="status-audio-manager-btn"
            onClick={() => setIsAudioManagerOpen(true)}
            className="flex items-center gap-1 hover:text-cyan-300 underline font-medium"
          >
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>Audio Latency &amp; Spectrum</span>
          </button>
        </div>
      </div>

      {/* Modals */}
      <TranslationModal
        isOpen={isTranslationModalOpen}
        onClose={() => setIsTranslationModalOpen(false)}
        currentSettings={subtitleSettings}
        cues={cues}
        onApplyTranslation={(targetLang, sourceLang, showDual, translatedCues) => {
          setSubtitleSettings((s) => {
            const updated = {
              ...s,
              targetLanguage: targetLang,
              sourceLanguage: sourceLang,
              showDualLanguage: showDual,
              enabled: true
            };
            saveSubtitleSettings(updated);
            return updated;
          });
          setCues(translatedCues);
          // Also update dubbing language to match
          setDubbingSettings((d) => ({ ...d, targetLanguage: targetLang }));
        }}
      />

      <SubtitleSettingsModal
        isOpen={isSubtitleModalOpen}
        onClose={() => setIsSubtitleModalOpen(false)}
        settings={subtitleSettings}
        cues={cues}
        videoTitle={sourceInfo.title}
        videoDuration={playerState.duration}
        platform={sourceInfo.platform}
        onUpdateSettings={(newSettings) => {
          setSubtitleSettings((s) => {
            const updated = { ...s, ...newSettings };
            saveSubtitleSettings(updated);
            return updated;
          });
        }}
        onLoadSubtitles={(newCues) => {
          const { taggedCues, detectedSpeakers } = analyzeAndTagCueCharacters(newCues);
          setCues(taggedCues);
          setSubtitleSettings((s) => ({ ...s, enabled: true }));

          if (Object.keys(dubbingSettings.characterProfiles || {}).length === 0) {
            const profiles = buildDefaultCharacterProfiles(detectedSpeakers, [], dubbingSettings.targetLanguage);
            setDubbingSettings((d) => {
              const updated = { ...d, characterProfiles: profiles };
              saveDubbingSettings(updated);
              return updated;
            });
          }
        }}
      />

      <DubbingModal
        isOpen={isDubbingModalOpen}
        onClose={() => setIsDubbingModalOpen(false)}
        settings={dubbingSettings}
        activeCue={activeCue}
        cues={cues}
        onUpdateSettings={(newSettings) => {
          if (
            newSettings.enabled !== undefined &&
            newSettings.enabled !== dubbingSettings.enabled
          ) {
            handleToggleDubbing(newSettings.enabled);
          } else {
            setDubbingSettings((d) => {
              const updated = { ...d, ...newSettings };
              saveDubbingSettings(updated);
              return updated;
            });
          }
        }}
      />

      <AudioManagerModal
        isOpen={isAudioManagerOpen}
        onClose={() => setIsAudioManagerOpen(false)}
        playerState={playerState}
        dubbingSettings={dubbingSettings}
        onToggleDubbing={handleToggleDubbing}
        onOpenDubbingSettings={() => setIsDubbingModalOpen(true)}
      />

      <ShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />
    </div>
  );
};
