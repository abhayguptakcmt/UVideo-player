import React, { useState, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Volume1,
  Maximize,
  Minimize,
  PictureInPicture,
  Subtitles,
  Languages,
  Mic,
  Settings,
  Gauge
} from 'lucide-react';
import { PlayerState, SubtitleSettings, DubbingSettings } from '../types';
import { AudioSpectrumAnalyzer } from './AudioSpectrumAnalyzer';

interface ControlBarProps {
  playerState: PlayerState;
  subtitleSettings: SubtitleSettings;
  dubbingSettings: DubbingSettings;
  onTogglePlay: () => void;
  onSeek: (seconds: number) => void;
  onRelativeSeek: (delta: number) => void;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
  onPlaybackRateChange: (rate: number) => void;
  onToggleFullscreen: () => void;
  onTogglePip: () => void;
  onToggleSubtitles: () => void;
  onOpenSubtitleSettings: () => void;
  onOpenTranslationModal: () => void;
  onToggleDubbing: () => void;
  onOpenDubbingModal: () => void;
  onOpenAudioManager: () => void;
  supportsPip?: boolean;
}

export const ControlBar: React.FC<ControlBarProps> = ({
  playerState,
  subtitleSettings,
  dubbingSettings,
  onTogglePlay,
  onSeek,
  onRelativeSeek,
  onVolumeChange,
  onToggleMute,
  onPlaybackRateChange,
  onToggleFullscreen,
  onTogglePip,
  onToggleSubtitles,
  onOpenSubtitleSettings,
  onOpenTranslationModal,
  onToggleDubbing,
  onOpenDubbingModal,
  onOpenAudioManager,
  supportsPip = false
}) => {
  const [isSpeedOpen, setIsSpeedOpen] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState<number>(0);
  const progressRef = useRef<HTMLDivElement>(null);

  const formatTime = (timeInSec: number): string => {
    if (isNaN(timeInSec) || timeInSec < 0) return '00:00';
    const totalSecs = Math.floor(timeInSec);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs
        .toString()
        .padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || playerState.duration <= 0) return;
    const rect = progressRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(pct * playerState.duration);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || playerState.duration <= 0) return;
    const rect = progressRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    setHoverTime(pct * playerState.duration);
    setHoverX(clickX);
  };

  const handleMouseLeave = () => {
    setHoverTime(null);
  };

  const progressPercent =
    playerState.duration > 0
      ? (playerState.currentTime / playerState.duration) * 100
      : 0;

  const bufferedPercent =
    playerState.duration > 0
      ? (playerState.bufferedTime / playerState.duration) * 100
      : 0;

  const currentVolume = playerState.isMuted ? 0 : playerState.volume;

  return (
    <div className="w-full bg-gradient-to-t from-black/90 via-slate-950/80 to-transparent pt-6 pb-3 px-3 sm:px-5 transition-opacity select-none">
      {/* Progress Timeline Scrubber */}
      <div className="relative mb-3 group">
        <div
          ref={progressRef}
          onClick={handleProgressBarClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="relative w-full h-1.5 group-hover:h-3 bg-white/20 rounded-full cursor-pointer transition-all flex items-center"
        >
          {/* Buffered track */}
          <div
            className="absolute left-0 h-full bg-white/30 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(100, Math.max(0, bufferedPercent))}%` }}
          />

          {/* Played track */}
          <div
            className="absolute left-0 h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full"
            style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
          />

          {/* Scrubber thumb */}
          <div
            className="absolute -translate-x-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity border-2 border-indigo-500 scale-100 group-hover:scale-125"
            style={{ left: `${Math.min(100, Math.max(0, progressPercent))}%` }}
          />
        </div>

        {/* Hover Time Tooltip */}
        {hoverTime !== null && (
          <div
            className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 rounded bg-slate-900/95 border border-slate-700 text-[11px] font-mono text-white pointer-events-none shadow"
            style={{ left: `${hoverX}px` }}
          >
            {formatTime(hoverTime)}
          </div>
        )}
      </div>

      {/* Main Control Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 text-white text-sm">
        {/* Left: Playback & Volume */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Play/Pause */}
          <button
            id="control-play-pause-btn"
            onClick={onTogglePlay}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white"
            title={playerState.isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            aria-label={playerState.isPlaying ? 'Pause' : 'Play'}
          >
            {playerState.isPlaying ? (
              <Pause className="w-5 h-5 fill-white" />
            ) : (
              <Play className="w-5 h-5 fill-white ml-0.5" />
            )}
          </button>

          {/* Relative Seek Buttons */}
          <button
            id="control-seek-back-btn"
            onClick={() => onRelativeSeek(-10)}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            title="Rewind 10s (Left Arrow)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            id="control-seek-forward-btn"
            onClick={() => onRelativeSeek(10)}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            title="Forward 10s (Right Arrow)"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* Volume Control */}
          <div className="flex items-center gap-1 group/vol relative">
            <button
              id="control-mute-btn"
              onClick={onToggleMute}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              title={
                dubbingSettings.enabled
                  ? 'Video original audio is stopped because AI Dubbing is ON'
                  : playerState.isMuted
                  ? 'Unmute (M)'
                  : 'Mute (M)'
              }
            >
              {playerState.isMuted || currentVolume === 0 ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : currentVolume < 0.5 ? (
                <Volume1 className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={currentVolume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              disabled={dubbingSettings.enabled}
              className={`w-14 sm:w-20 h-1 rounded-lg accent-indigo-400 cursor-pointer hidden sm:inline-block ${
                dubbingSettings.enabled ? 'opacity-40 cursor-not-allowed bg-rose-500/30' : 'bg-white/20'
              }`}
              title={
                dubbingSettings.enabled
                  ? 'Original video audio is muted for AI Dubbing'
                  : `Volume ${Math.round(currentVolume * 100)}%`
              }
            />
            {dubbingSettings.enabled && (
              <span className="hidden lg:inline-block text-[10px] font-mono text-purple-300 bg-purple-950/80 px-1.5 py-0.5 rounded border border-purple-800/60">
                Original Audio Muted
              </span>
            )}
          </div>

          {/* Time Display */}
          <div className="font-mono text-xs text-slate-300 ml-1">
            <span className="text-white font-semibold">
              {formatTime(playerState.currentTime)}
            </span>
            <span className="text-slate-500 mx-1">/</span>
            <span>{formatTime(playerState.duration)}</span>
          </div>

          {/* Visual Audio Spectrum Analyzer */}
          <div className="flex items-center ml-1">
            <AudioSpectrumAnalyzer onOpenAudioManager={onOpenAudioManager} className="hidden sm:flex" />
            <AudioSpectrumAnalyzer onOpenAudioManager={onOpenAudioManager} compact={true} className="sm:hidden" />
          </div>
        </div>

        {/* Right: Subtitles, Languages, Dubbing, Speed, Fullscreen */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Subtitles Toggle */}
          <button
            id="control-subtitles-toggle-btn"
            onClick={onToggleSubtitles}
            className={`p-2 rounded-lg transition-colors relative ${
              subtitleSettings.enabled
                ? 'bg-indigo-600/80 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
            title="Toggle Subtitles (C)"
          >
            <Subtitles className="w-4 h-4" />
            {subtitleSettings.enabled && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            )}
          </button>

          {/* Translation Button */}
          <button
            id="control-translation-btn"
            onClick={onOpenTranslationModal}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-xs font-medium text-slate-200 hover:text-white transition-colors border border-slate-700/50"
            title="Translate Subtitles (T)"
          >
            <Languages className="w-3.5 h-3.5 text-cyan-400" />
            <span className="uppercase font-semibold text-[11px]">
              {subtitleSettings.targetLanguage || 'Translate'}
            </span>
          </button>

          {/* AI Voice Dubbing Group */}
          <div className="flex items-center rounded-lg overflow-hidden border border-purple-500/40 bg-slate-800/80">
            <button
              id="control-dubbing-toggle-btn"
              onClick={onToggleDubbing}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold transition-all ${
                dubbingSettings.enabled
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-purple-300 hover:text-white hover:bg-slate-700'
              }`}
              title={
                dubbingSettings.enabled
                  ? 'AI Dubbing is ON (Original video audio is stopped). Click to turn OFF & restore audio (D)'
                  : 'Turn ON AI Dubbing (Stops original video audio and plays spoken dubbing) (D)'
              }
            >
              <Mic className={`w-3.5 h-3.5 ${dubbingSettings.enabled ? 'animate-pulse text-white' : 'text-purple-400'}`} />
              <span>{dubbingSettings.enabled ? 'Dub ON' : 'AI Dub'}</span>
            </button>
            <button
              id="control-dubbing-settings-btn"
              onClick={onOpenDubbingModal}
              className={`px-1.5 py-1.5 text-xs transition-colors border-l border-purple-500/30 ${
                dubbingSettings.enabled
                  ? 'bg-purple-700 hover:bg-purple-800 text-purple-100'
                  : 'hover:bg-slate-700 text-slate-400 hover:text-white'
              }`}
              title="Dubbing Voice & Language Settings"
            >
              <Settings className="w-3 h-3" />
            </button>
          </div>

          {/* Playback Speed Selector */}
          <div className="relative">
            <button
              id="control-speed-btn"
              onClick={() => setIsSpeedOpen(!isSpeedOpen)}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-mono text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              title="Playback Speed"
            >
              <Gauge className="w-3.5 h-3.5" />
              <span>{playerState.playbackRate}x</span>
            </button>

            {isSpeedOpen && (
              <div className="absolute bottom-full right-0 mb-2 py-1 bg-slate-900/95 border border-slate-700 rounded-xl shadow-2xl z-50 min-w-24 backdrop-blur-md">
                <div className="px-3 py-1 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">
                  Speed
                </div>
                {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((rate) => (
                  <button
                    key={rate}
                    onClick={() => {
                      onPlaybackRateChange(rate);
                      setIsSpeedOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs font-mono hover:bg-indigo-600/30 transition-colors flex items-center justify-between ${
                      playerState.playbackRate === rate
                        ? 'text-cyan-400 font-bold bg-white/5'
                        : 'text-slate-300'
                    }`}
                  >
                    <span>{rate}x</span>
                    {rate === 1.0 && <span className="text-[10px] text-slate-500">Normal</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Subtitle & Player Settings */}
          <button
            id="control-settings-btn"
            onClick={onOpenSubtitleSettings}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Subtitle & Player Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Picture in Picture */}
          {supportsPip && (
            <button
              id="control-pip-btn"
              onClick={onTogglePip}
              className={`p-2 rounded-lg transition-colors ${
                playerState.isPip
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-white/10'
              }`}
              title="Picture in Picture"
            >
              <PictureInPicture className="w-4 h-4" />
            </button>
          )}

          {/* Fullscreen */}
          <button
            id="control-fullscreen-btn"
            onClick={onToggleFullscreen}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title={playerState.isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
          >
            {playerState.isFullscreen ? (
              <Minimize className="w-4 h-4" />
            ) : (
              <Maximize className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
