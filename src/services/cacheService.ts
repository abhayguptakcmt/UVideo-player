import { RecentVideo, SubtitleSettings, DubbingSettings } from '../types';

const RECENT_VIDEOS_KEY = 'uvp_recent_videos_v1';
const SUBTITLE_CACHE_KEY = 'uvp_subtitle_cache_v1';
const SETTINGS_KEY = 'uvp_player_settings_v1';

// In-memory quick lookup cache
const memoryTranslationCache = new Map<string, string>();

export function getRecentVideos(): RecentVideo[] {
  try {
    const raw = localStorage.getItem(RECENT_VIDEOS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveRecentVideo(video: Omit<RecentVideo, 'timestamp'>): void {
  try {
    const recents = getRecentVideos();
    const filtered = recents.filter((r) => r.url !== video.url);
    const updated: RecentVideo[] = [
      {
        ...video,
        timestamp: Date.now()
      },
      ...filtered
    ].slice(0, 24); // keep latest 24

    localStorage.setItem(RECENT_VIDEOS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to save recent video to localStorage', err);
  }
}

export function updateVideoProgress(url: string, position: number, duration?: number): void {
  try {
    const recents = getRecentVideos();
    const foundIndex = recents.findIndex((r) => r.url === url);
    if (foundIndex !== -1) {
      recents[foundIndex].lastPosition = position;
      if (duration && duration > 0) {
        recents[foundIndex].duration = duration;
      }
      localStorage.setItem(RECENT_VIDEOS_KEY, JSON.stringify(recents));
    }
  } catch (err) {
    console.warn('Failed to update progress', err);
  }
}

export function removeRecentVideo(url: string): RecentVideo[] {
  try {
    const recents = getRecentVideos().filter((r) => r.url !== url);
    localStorage.setItem(RECENT_VIDEOS_KEY, JSON.stringify(recents));
    return recents;
  } catch {
    return [];
  }
}

export function clearRecentVideos(): void {
  try {
    localStorage.removeItem(RECENT_VIDEOS_KEY);
  } catch (err) {
    console.warn('Failed to clear recents', err);
  }
}

// Translation caching
function getCacheKey(text: string, targetLang: string, sourceLang?: string): string {
  return `${sourceLang || 'auto'}_${targetLang}_${text.trim()}`;
}

export function getCachedTranslation(text: string, targetLang: string, sourceLang?: string): string | null {
  const key = getCacheKey(text, targetLang, sourceLang);
  if (memoryTranslationCache.has(key)) {
    return memoryTranslationCache.get(key)!;
  }
  try {
    const storage = localStorage.getItem(SUBTITLE_CACHE_KEY);
    if (storage) {
      const parsed = JSON.parse(storage);
      if (parsed[key]) {
        memoryTranslationCache.set(key, parsed[key]);
        return parsed[key];
      }
    }
  } catch {
    // Ignore storage parse error
  }
  return null;
}

export function setCachedTranslation(text: string, translation: string, targetLang: string, sourceLang?: string): void {
  const key = getCacheKey(text, targetLang, sourceLang);
  memoryTranslationCache.set(key, translation);
  try {
    const storage = localStorage.getItem(SUBTITLE_CACHE_KEY);
    const parsed = storage ? JSON.parse(storage) : {};
    parsed[key] = translation;
    // Limit cache entries to prevent quota limits
    const keys = Object.keys(parsed);
    if (keys.length > 500) {
      for (let i = 0; i < 100; i++) {
        delete parsed[keys[i]];
      }
    }
    localStorage.setItem(SUBTITLE_CACHE_KEY, JSON.stringify(parsed));
  } catch {
    // Ignore storage quota error
  }
}

// Stored Settings
export function getSavedSubtitleSettings(): Partial<SubtitleSettings> {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY + '_subtitles');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveSubtitleSettings(settings: SubtitleSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY + '_subtitles', JSON.stringify(settings));
  } catch (err) {
    console.warn('Failed to save subtitle settings', err);
  }
}

export function getSavedDubbingSettings(): Partial<DubbingSettings> {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY + '_dubbing');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveDubbingSettings(settings: DubbingSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY + '_dubbing', JSON.stringify(settings));
  } catch (err) {
    console.warn('Failed to save dubbing settings', err);
  }
}
