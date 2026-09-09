import React, { useState } from 'react';
import {
  Play,
  Clipboard,
  X,
  Clock,
  Trash2,
  ExternalLink,
  Film,
  Sparkles,
  Layers,
  ArrowRight,
  Tv,
  CheckCircle2,
  Languages,
  Mic
} from 'lucide-react';
import { PRESET_VIDEOS, PresetVideo } from '../services/platformDetector';
import { RecentVideo, VideoPlatform } from '../types';

interface HomeScreenProps {
  onPlayUrl: (url: string, presetData?: PresetVideo) => void;
  recentVideos: RecentVideo[];
  onRemoveRecent: (url: string) => void;
  onClearRecents: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onPlayUrl,
  recentVideos,
  onRemoveRecent,
  onClearRecents
}) => {
  const [inputUrl, setInputUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = inputUrl.trim();
    if (!clean) {
      setErrorMsg('Please paste or enter a valid video URL.');
      return;
    }
    setErrorMsg(null);
    onPlayUrl(clean);
  };

  const handlePaste = async () => {
    try {
      if (navigator.clipboard) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setInputUrl(text);
          setErrorMsg(null);
        }
      }
    } catch {
      // Clipboard access denied or unsupported
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds || seconds <= 0) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const platformBadgeStyle = (platform: VideoPlatform) => {
    switch (platform) {
      case 'youtube':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'bilibili':
        return 'bg-sky-500/20 text-sky-300 border-sky-500/30';
      case 'vimeo':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'dailymotion':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
      case 'twitch':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'facebook':
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
      case 'direct':
      default:
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 md:py-12 space-y-12">
      {/* Hero / Input Section */}
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Universal Playback Engine with AI Translation</span>
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
          Watch &amp; Translate Any Video in{' '}
          <span className="bg-gradient-to-r from-sky-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Real-Time
          </span>
        </h1>
        <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
          Paste a video link from YouTube, Bilibili, Vimeo, Dailymotion, Twitch, or direct media files.
          Enjoy synchronized multilingual subtitles and optional AI voice dubbing.
        </p>

        {/* URL Input Form */}
        <form onSubmit={handleSubmit} className="pt-2 text-left">
          <div className="relative flex flex-col sm:flex-row items-stretch gap-2 bg-slate-900/90 border border-slate-700/70 p-2 rounded-2xl shadow-2xl shadow-indigo-950/40 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
            <div className="relative flex-1 flex items-center">
              <input
                id="video-url-input"
                type="url"
                value={inputUrl}
                onChange={(e) => {
                  setInputUrl(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="Paste YouTube, Bilibili, Vimeo, Dailymotion, or MP4 URL..."
                className="w-full bg-transparent text-white placeholder-slate-500 px-4 py-3 text-sm sm:text-base focus:outline-none pr-16"
                autoFocus
              />
              <div className="absolute right-2 flex items-center gap-1">
                {inputUrl ? (
                  <button
                    type="button"
                    onClick={() => setInputUrl('')}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                    title="Clear"
                  >
                    <X className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handlePaste}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200 bg-slate-800/80 hover:bg-slate-800 rounded-lg transition-colors"
                    title="Paste from clipboard"
                  >
                    <Clipboard className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Paste</span>
                  </button>
                )}
              </div>
            </div>

            <button
              id="play-video-submit-btn"
              type="submit"
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 shadow-lg shadow-indigo-600/30 hover:shadow-indigo-500/40 active:scale-[0.99] transition-all cursor-pointer text-sm sm:text-base"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Play Video</span>
            </button>
          </div>

          {errorMsg && (
            <p className="mt-2 text-xs font-medium text-rose-400 flex items-center gap-1.5 pl-2">
              <span>⚠️</span>
              {errorMsg}
            </p>
          )}
        </form>
      </div>

      {/* Preset / Sample Videos for Instant Testing */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tv className="w-4 h-4 text-cyan-400" />
            <h2 className="text-base font-semibold text-white">
              Instant Test Presets
            </h2>
            <span className="text-xs text-slate-400 hidden sm:inline">
              (Preloaded with multi-lingual subtitles ready for translation)
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {PRESET_VIDEOS.map((preset) => (
            <div
              key={preset.id}
              onClick={() => onPlayUrl(preset.url, preset)}
              className="group relative flex flex-col justify-between p-3.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800/80 hover:border-slate-700 transition-all cursor-pointer overflow-hidden shadow-sm hover:shadow-md"
            >
              <div className="flex gap-3">
                <div className="relative w-24 h-16 rounded-lg bg-slate-800 overflow-hidden flex-shrink-0">
                  {preset.thumbnailUrl ? (
                    <img
                      src={preset.thumbnailUrl}
                      alt={preset.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-600">
                      <Film className="w-6 h-6" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                    <div className="w-7 h-7 rounded-full bg-white/90 group-hover:bg-indigo-500 group-hover:scale-110 flex items-center justify-center transition-all shadow">
                      <Play className="w-3.5 h-3.5 fill-slate-900 group-hover:fill-white text-slate-900 group-hover:text-white transition-colors ml-0.5" />
                    </div>
                  </div>
                  {preset.duration && (
                    <span className="absolute bottom-1 right-1 px-1 py-0.2 bg-black/80 rounded text-[10px] font-mono text-white">
                      {formatDuration(preset.duration)}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span
                        className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded border ${platformBadgeStyle(
                          preset.platform
                        )}`}
                      >
                        {preset.platform}
                      </span>
                      {preset.suggestedSourceLang && (
                        <span className="text-[10px] text-slate-400 uppercase font-mono">
                          {preset.suggestedSourceLang}
                        </span>
                      )}
                    </div>
                    <h3 className="text-xs sm:text-sm font-semibold text-slate-200 group-hover:text-white line-clamp-1">
                      {preset.title}
                    </h3>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-1">
                    {preset.author}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Videos Section */}
      {recentVideos.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              <h2 className="text-base font-semibold text-white">
                Recent Videos
              </h2>
              <span className="text-xs text-slate-400">
                ({recentVideos.length})
              </span>
            </div>
            <button
              onClick={onClearRecents}
              className="text-xs text-slate-400 hover:text-rose-300 flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear History</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentVideos.map((item) => {
              const progressPct =
                item.duration > 0
                  ? Math.min(100, (item.lastPosition / item.duration) * 100)
                  : 0;

              return (
                <div
                  key={item.url}
                  className="group relative flex items-center justify-between p-3 rounded-xl bg-slate-900/60 hover:bg-slate-800/70 border border-slate-800 hover:border-slate-700 transition-all"
                >
                  <div
                    onClick={() => onPlayUrl(item.url)}
                    className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                  >
                    <div className="relative w-14 h-10 rounded-md bg-slate-800 overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {item.thumbnailUrl ? (
                        <img
                          src={item.thumbnailUrl}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Film className="w-4 h-4 text-slate-500" />
                      )}
                      {progressPct > 0 && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-700">
                          <div
                            className="h-full bg-indigo-500"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span
                          className={`text-[9px] font-semibold uppercase px-1 py-0.2 rounded border ${platformBadgeStyle(
                            item.platform
                          )}`}
                        >
                          {item.platform}
                        </span>
                        {item.lastPosition > 0 && (
                          <span className="text-[10px] text-slate-400">
                            Resume {formatDuration(item.lastPosition)}
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-medium text-slate-200 group-hover:text-cyan-300 truncate">
                        {item.title || item.url}
                      </h4>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveRecent(item.url);
                    }}
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800/80 rounded-lg transition-colors ml-2"
                    title="Remove from history"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Supported Platforms & Feature Matrix */}
      <div className="p-6 rounded-2xl bg-gradient-to-b from-slate-900/80 to-slate-950 border border-slate-800/80 space-y-6">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            Supported Video Sources &amp; Features
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Automatic source detection, embed fallback, dynamic timeline sync, and real-time translation.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {[
            { name: 'YouTube', color: 'text-red-400', desc: 'IFrame API Sync' },
            { name: 'Bilibili', color: 'text-sky-400', desc: 'Official Embed' },
            { name: 'Vimeo', color: 'text-blue-400', desc: 'PostMessage API' },
            { name: 'Dailymotion', color: 'text-cyan-400', desc: 'Player API' },
            { name: 'Twitch', color: 'text-purple-400', desc: 'Live & VODs' },
            { name: 'Direct MP4', color: 'text-emerald-400', desc: 'Full HTML5 PIP' }
          ].map((item) => (
            <div
              key={item.name}
              className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col justify-between"
            >
              <span className={`text-xs font-bold ${item.color}`}>
                {item.name}
              </span>
              <span className="text-[10px] text-slate-500 mt-1">
                {item.desc}
              </span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-800/60 text-xs text-slate-400">
          <div className="flex items-start gap-2">
            <Languages className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-200 block font-medium">Multilingual AI Subtitles</strong>
              Translate to Hindi, Spanish, English, Chinese, Arabic (RTL), and 25+ languages.
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Mic className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-200 block font-medium">Synchronized AI Voice Dubbing</strong>
              Synthesizes translated speech with automatic audio ducking.
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-200 block font-medium">Precision Timeline Controls</strong>
              0.5x–2x playback speed, audio track volume, subtitle offset &amp; position customization.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
