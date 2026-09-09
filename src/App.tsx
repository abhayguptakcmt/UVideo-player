import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { HomeScreen } from './components/HomeScreen';
import { PlayerContainer } from './components/PlayerContainer';
import { ShortcutsModal } from './components/modals/ShortcutsModal';
import {
  detectVideoPlatform,
  PRESET_VIDEOS,
  PresetVideo
} from './services/platformDetector';
import { parseSRTorVTT } from './services/subtitleService';
import {
  getRecentVideos,
  saveRecentVideo,
  removeRecentVideo,
  clearRecentVideos
} from './services/cacheService';
import { VideoSourceInfo, SubtitleCue, RecentVideo } from './types';

export default function App() {
  const [currentVideo, setCurrentVideo] = useState<VideoSourceInfo | null>(null);
  const [activeSubtitles, setActiveSubtitles] = useState<SubtitleCue[]>([]);
  const [recentVideos, setRecentVideos] = useState<RecentVideo[]>([]);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [savedPosition, setSavedPosition] = useState<number>(0);

  // Load recents on mount
  useEffect(() => {
    setRecentVideos(getRecentVideos());
  }, []);

  const handlePlayUrl = async (url: string, presetData?: PresetVideo) => {
    const detected = detectVideoPlatform(url);

    // If preset data was clicked, use preset's rich title, author, and preloaded subtitles
    if (presetData) {
      detected.title = presetData.title;
      detected.author = presetData.author;
      detected.duration = presetData.duration;
      detected.thumbnailUrl = presetData.thumbnailUrl;

      if (presetData.sampleSubtitles) {
        const parsed = parseSRTorVTT(presetData.sampleSubtitles);
        setActiveSubtitles(parsed);
      } else {
        setActiveSubtitles([]);
      }
    } else {
      // Clear or set blank subtitles for unknown URL
      setActiveSubtitles([]);

      // Attempt background oEmbed metadata fetch from our server
      fetch(`/api/video-info?url=${encodeURIComponent(url)}`)
        .then((res) => res.json())
        .then((info) => {
          if (info.title) {
            setCurrentVideo((prev) => {
              if (!prev || prev.originalUrl !== url) return prev;
              const updated = {
                ...prev,
                title: info.title,
                author: info.author || prev.author,
                thumbnailUrl: info.thumbnailUrl || prev.thumbnailUrl,
                duration: info.duration > 0 ? info.duration : prev.duration
              };
              saveRecentVideo({
                id: updated.videoId,
                url: updated.originalUrl,
                title: updated.title,
                platform: updated.platform,
                thumbnailUrl: updated.thumbnailUrl,
                lastPosition: 0,
                duration: updated.duration || 0
              });
              setRecentVideos(getRecentVideos());
              return updated;
            });
          }
        })
        .catch(() => {});
    }

    // Check if there was a saved position in recents
    const existingRecent = recentVideos.find((r) => r.url === url);
    const resumePos = existingRecent?.lastPosition || 0;
    setSavedPosition(resumePos);

    // Save to recents
    saveRecentVideo({
      id: detected.videoId,
      url: detected.originalUrl,
      title: detected.title,
      platform: detected.platform,
      thumbnailUrl: detected.thumbnailUrl,
      lastPosition: resumePos,
      duration: detected.duration || 0
    });
    setRecentVideos(getRecentVideos());

    setCurrentVideo(detected);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRemoveRecent = (url: string) => {
    const updated = removeRecentVideo(url);
    setRecentVideos(updated);
  };

  const handleClearRecents = () => {
    clearRecentVideos();
    setRecentVideos([]);
  };

  const handleBackToHome = () => {
    setCurrentVideo(null);
    setRecentVideos(getRecentVideos());
  };

  return (
    <div className="min-h-screen bg-[#090b10] text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Universal Top Header */}
      <Header
        onBackToHome={handleBackToHome}
        showBackButton={currentVideo !== null}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
      />

      {/* Main View: Player View or Home Screen View */}
      <main className="flex-1 w-full flex flex-col justify-start">
        {currentVideo ? (
          <PlayerContainer
            key={currentVideo.originalUrl}
            sourceInfo={currentVideo}
            initialSubtitles={activeSubtitles}
            onBackToHome={handleBackToHome}
            savedPosition={savedPosition}
          />
        ) : (
          <HomeScreen
            onPlayUrl={handlePlayUrl}
            recentVideos={recentVideos}
            onRemoveRecent={handleRemoveRecent}
            onClearRecents={handleClearRecents}
          />
        )}
      </main>

      {/* Keyboard Shortcuts Dialog */}
      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {/* Minimal Footer */}
      <footer className="w-full border-t border-slate-900 bg-slate-950/60 py-4 px-4 text-center text-xs text-slate-400">
        <p>
          Universal Online Video Player &amp; Subtitle Translator • Respecting Platform Terms of Service &amp; Content Licensing
        </p>
      </footer>
    </div>
  );
}
