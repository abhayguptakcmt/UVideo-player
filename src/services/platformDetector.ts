import { VideoPlatform, VideoSourceInfo } from '../types';

export interface PresetVideo {
  id: string;
  title: string;
  platform: VideoPlatform;
  url: string;
  author: string;
  description: string;
  duration?: number;
  thumbnailUrl?: string;
  suggestedSourceLang?: string;
  sampleSubtitles?: string; // Pre-loaded sample SRT/VTT for instant testing
}

export const PRESET_VIDEOS: PresetVideo[] = [
  {
    id: 'direct-1',
    title: 'Big Buck Bunny (Direct 720p MP4)',
    platform: 'direct',
    url: 'https://archive.org/download/BigBuckBunny_124/Content/big_buck_bunny_720p_surround.mp4',
    author: 'Blender Open Movie Project',
    description: 'High definition open animation film with full HTML5 playback control & zero-delay audio switching.',
    duration: 596,
    thumbnailUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop&q=80',
    suggestedSourceLang: 'en',
    sampleSubtitles: `1
00:00:02,000 --> 00:00:06,500
A tranquil morning awakes in the lush green forest.

2
00:00:07,000 --> 00:00:11,200
Big Buck Bunny steps out to welcome the warm sunrise.

3
00:00:12,000 --> 00:00:16,800
Fragile butterflies flutter gently over the blossoming wildflowers.

4
00:00:17,500 --> 00:00:22,000
Suddenly, the mischievous trio of forest rodents plots a playful prank.

5
00:00:23,000 --> 00:00:28,500
A battle of wits begins amongst the tall trees and fallen leaves.`
  },
  {
    id: 'yt-1',
    title: 'Big Buck Bunny 60fps 4K (YouTube)',
    platform: 'youtube',
    url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    author: 'Blender Official',
    description: 'Official Blender animation short film streamed via YouTube with responsive controls.',
    duration: 596,
    thumbnailUrl: 'https://i.ytimg.com/vi/aqz-KE-bpKQ/hqdefault.jpg',
    suggestedSourceLang: 'en',
    sampleSubtitles: `1
00:00:01,500 --> 00:00:04,800
Deep inside the peaceful woodland sanctuary.

2
00:00:05,200 --> 00:00:09,100
Nature flourishes beneath the soft morning sunlight.

3
00:00:09,800 --> 00:00:14,200
A giant bunny steps outside his burrow into the fresh mountain air.

4
00:00:15,000 --> 00:00:19,500
Every creature prepares for another day of wild adventures.

5
00:00:20,200 --> 00:00:25,400
Unsuspecting tranquility is about to encounter playful mischief.`
  },
  {
    id: 'direct-2',
    title: 'Tears of Steel (Direct Sci-Fi MP4)',
    platform: 'direct',
    url: 'https://archive.org/download/Tears-of-Steel/tears_of_steel_720p.mp4',
    author: 'Blender Foundation / Mango Project',
    description: 'Open-source visual effects science-fiction film with rich stereo audio for HTML5 testing.',
    duration: 734,
    thumbnailUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
    suggestedSourceLang: 'en',
    sampleSubtitles: `1
00:00:02,000 --> 00:00:06,000
In a dystopian future, human memories hold the key to technological survival.

2
00:00:06,800 --> 00:00:11,500
A team of scientists attempts to reconstruct past events using holographic projections.

3
00:00:12,200 --> 00:00:17,000
Every decision reverberates through the remnants of a divided city.`
  },
  {
    id: 'vimeo-1',
    title: 'The Mountain: Milky Way Time-Lapse',
    platform: 'vimeo',
    url: 'https://vimeo.com/22439234',
    author: 'TSO Photography',
    description: 'Award-winning celestial visual composition and cinematography on Vimeo.',
    duration: 185,
    thumbnailUrl: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=600&auto=format&fit=crop&q=80',
    suggestedSourceLang: 'en',
    sampleSubtitles: `1
00:00:01,000 --> 00:00:04,500
Cinema is the art of capturing ephemeral emotion through light.

2
00:00:05,000 --> 00:00:08,800
Every focal length shifts human perception and narrative weight.

3
00:00:09,500 --> 00:00:14,200
From high-speed rhythmic pacing to silent contemplative pans.

4
00:00:15,000 --> 00:00:19,500
Modern storytelling bridges visual physics and deep digital art.`
  },
  {
    id: 'bilibili-1',
    title: 'Chinese Cultural Heritage: Dunhuang Murals (Bilibili)',
    platform: 'bilibili',
    url: 'https://www.bilibili.com/video/BV1xx411c7mD',
    author: 'Documentary Studio CN',
    description: 'Traditional Chinese art & ancient Buddhist cave murals preserved across millenniums.',
    duration: 310,
    thumbnailUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
    suggestedSourceLang: 'zh',
    sampleSubtitles: `1
00:00:01,000 --> 00:00:04,800
敦煌莫高窟，被誉为丝绸之路上的艺术明珠。

2
00:00:05,200 --> 00:00:09,500
历经一千多年的营建与传承，沉淀了无数辉煌的壁画与彩塑。

3
00:00:10,200 --> 00:00:15,000
飞天的飘带宛如清风徐来，展现了古代匠人的精湛工艺。

4
00:00:16,000 --> 00:00:21,500
通过数字化保护技术，这些珍贵的文化瑰宝将永久留存给全人类。`
  },
  {
    id: 'dailymotion-1',
    title: 'High Altitude Alpine Landscapes',
    platform: 'dailymotion',
    url: 'https://www.dailymotion.com/video/x8j0kzo',
    author: 'Alpine Vision',
    description: 'Majestic snowy peaks and glacial valleys streamed via Dailymotion.',
    duration: 210,
    thumbnailUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&auto=format&fit=crop&q=80',
    suggestedSourceLang: 'fr',
    sampleSubtitles: `1
00:00:02,000 --> 00:00:06,000
Les sommets enneigés des Alpes s'élèvent fièrement vers le ciel azur.

2
00:00:06,800 --> 00:00:11,500
Le silence de la haute montagne n'est troublé que par le souffle du vent frais.

3
00:00:12,200 --> 00:00:17,000
Ces paysages majestueux rappellent la puissance indomptable de la nature.`
  }
];

export function detectVideoPlatform(rawUrl: string): VideoSourceInfo {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return {
      platform: 'unsupported',
      originalUrl: rawUrl,
      videoId: '',
      embedUrl: '',
      title: 'Invalid URL',
      isDirectMedia: false
    };
  }

  // 1. YouTube detection
  // youtube.com/watch?v=XYZ, youtu.be/XYZ, youtube.com/embed/XYZ, youtube.com/shorts/XYZ
  const ytMatch = trimmed.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/i);
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    return {
      platform: 'youtube',
      originalUrl: trimmed,
      videoId,
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?enablejsapi=1&autoplay=1&rel=0&playsinline=1`,
      title: `YouTube Video (${videoId})`,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      isDirectMedia: false,
      aspectRatio: '16/9'
    };
  }

  // 2. Bilibili detection
  // bilibili.com/video/BV... or av...
  const bilibiliBvMatch = trimmed.match(/bilibili\.com\/video\/(BV[a-zA-Z0-9]+)/i);
  const bilibiliAvMatch = trimmed.match(/bilibili\.com\/video\/av([0-9]+)/i);
  if (bilibiliBvMatch && bilibiliBvMatch[1]) {
    const bvid = bilibiliBvMatch[1];
    return {
      platform: 'bilibili',
      originalUrl: trimmed,
      videoId: bvid,
      embedUrl: `https://player.bilibili.com/player.html?bvid=${bvid}&page=1&as_wide=1&high_quality=1&danmaku=0&autoplay=1`,
      title: `Bilibili (${bvid})`,
      isDirectMedia: false,
      aspectRatio: '16/9'
    };
  } else if (bilibiliAvMatch && bilibiliAvMatch[1]) {
    const aid = bilibiliAvMatch[1];
    return {
      platform: 'bilibili',
      originalUrl: trimmed,
      videoId: `av${aid}`,
      embedUrl: `https://player.bilibili.com/player.html?aid=${aid}&page=1&as_wide=1&high_quality=1&danmaku=0&autoplay=1`,
      title: `Bilibili (av${aid})`,
      isDirectMedia: false,
      aspectRatio: '16/9'
    };
  }

  // 3. Vimeo detection
  // vimeo.com/1234567 or player.vimeo.com/video/1234567
  const vimeoMatch = trimmed.match(/(?:vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/[^\/]*\/videos\/|album\/(?:\d+\/)?video\/|video\/|)|player\.vimeo\.com\/video\/)([0-9]+)/i);
  if (vimeoMatch && vimeoMatch[1]) {
    const videoId = vimeoMatch[1];
    return {
      platform: 'vimeo',
      originalUrl: trimmed,
      videoId,
      embedUrl: `https://player.vimeo.com/video/${videoId}?autoplay=1&title=0&byline=0&portrait=0`,
      title: `Vimeo Video (${videoId})`,
      isDirectMedia: false,
      aspectRatio: '16/9'
    };
  }

  // 4. Dailymotion detection
  // dailymotion.com/video/x... or dai.ly/x...
  const dmMatch = trimmed.match(/(?:dailymotion\.com\/(?:video|hub)\/|dai\.ly\/)([a-zA-Z0-9]+)/i);
  if (dmMatch && dmMatch[1]) {
    const videoId = dmMatch[1];
    return {
      platform: 'dailymotion',
      originalUrl: trimmed,
      videoId,
      embedUrl: `https://www.dailymotion.com/embed/video/${videoId}?autoplay=1&ui-logo=0`,
      title: `Dailymotion (${videoId})`,
      thumbnailUrl: `https://www.dailymotion.com/thumbnail/video/${videoId}`,
      isDirectMedia: false,
      aspectRatio: '16/9'
    };
  }

  // 5. Twitch detection
  // twitch.tv/videos/12345 or twitch.tv/channel or clips.twitch.tv/id
  const twitchVodMatch = trimmed.match(/twitch\.tv\/videos\/([0-9]+)/i);
  const twitchClipMatch = trimmed.match(/(?:clips\.twitch\.tv\/|twitch\.tv\/[a-zA-Z0-9_]+\/clip\/)([a-zA-Z0-9_-]+)/i);
  const twitchChannelMatch = trimmed.match(/twitch\.tv\/([a-zA-Z0-9_]+)$/i);
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

  if (twitchVodMatch && twitchVodMatch[1]) {
    const vodId = twitchVodMatch[1];
    return {
      platform: 'twitch',
      originalUrl: trimmed,
      videoId: vodId,
      embedUrl: `https://player.twitch.tv/?video=${vodId}&parent=${hostname}&autoplay=true`,
      title: `Twitch VOD (${vodId})`,
      isDirectMedia: false,
      aspectRatio: '16/9'
    };
  } else if (twitchClipMatch && twitchClipMatch[1]) {
    const clipId = twitchClipMatch[1];
    return {
      platform: 'twitch',
      originalUrl: trimmed,
      videoId: clipId,
      embedUrl: `https://clips.twitch.tv/embed?clip=${clipId}&parent=${hostname}&autoplay=true`,
      title: `Twitch Clip (${clipId})`,
      isDirectMedia: false,
      aspectRatio: '16/9'
    };
  } else if (twitchChannelMatch && twitchChannelMatch[1] && !['directory', 'p', 'downloads', 'jobs'].includes(twitchChannelMatch[1].toLowerCase())) {
    const channel = twitchChannelMatch[1];
    return {
      platform: 'twitch',
      originalUrl: trimmed,
      videoId: channel,
      embedUrl: `https://player.twitch.tv/?channel=${channel}&parent=${hostname}&autoplay=true`,
      title: `Twitch Stream (${channel})`,
      isDirectMedia: false,
      aspectRatio: '16/9'
    };
  }

  // 6. Facebook Video
  // facebook.com/.../videos/... or fb.watch/...
  if (trimmed.includes('facebook.com') || trimmed.includes('fb.watch')) {
    const encoded = encodeURIComponent(trimmed);
    return {
      platform: 'facebook',
      originalUrl: trimmed,
      videoId: 'fb-video',
      embedUrl: `https://www.facebook.com/plugins/video.php?href=${encoded}&show_text=false&autoplay=true`,
      title: 'Facebook Video',
      isDirectMedia: false,
      aspectRatio: '16/9'
    };
  }

  // 7. Direct HTML5 Media (MP4, WebM, Ogg, M4V, M3U8, Blob)
  const isDirect =
    /\.(mp4|webm|ogg|ogv|m4v|m3u8)(\?.*)?$/i.test(trimmed) ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('data:video/');

  if (isDirect) {
    const filename = trimmed.split('/').pop()?.split('?')[0] || 'Media Video';
    return {
      platform: 'direct',
      originalUrl: trimmed,
      videoId: 'direct-media',
      embedUrl: trimmed,
      title: decodeURIComponent(filename),
      isDirectMedia: true,
      aspectRatio: '16/9'
    };
  }

  // 8. If starts with http(s) but unrecognized, offer safe generic embed or direct media probe
  if (/^https?:\/\//i.test(trimmed)) {
    return {
      platform: 'direct',
      originalUrl: trimmed,
      videoId: 'web-stream',
      embedUrl: trimmed,
      title: 'Online Video Stream',
      isDirectMedia: true,
      aspectRatio: '16/9'
    };
  }

  return {
    platform: 'unsupported',
    originalUrl: trimmed,
    videoId: '',
    embedUrl: '',
    title: 'Unsupported or Invalid URL',
    isDirectMedia: false
  };
}
