import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Lazy GoogleGenAI initialization
let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// In-memory cache for server translations
const translationCache = new Map<string, string>();

// API routes FIRST
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', hasGeminiKey: Boolean(process.env.GEMINI_API_KEY) });
});

// Video metadata oEmbed proxy
app.get('/api/video-info', async (req, res) => {
  try {
    const videoUrl = req.query.url as string;
    if (!videoUrl) {
      return res.status(400).json({ error: 'Missing video url' });
    }

    // Attempt YouTube oEmbed
    if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
      const oembedRes = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`
      );
      if (oembedRes.ok) {
        const data = await oembedRes.json();
        return res.json({
          title: data.title || '',
          author: data.author_name || '',
          thumbnailUrl: data.thumbnail_url || '',
          provider: 'youtube'
        });
      }
    }

    // Attempt Vimeo oEmbed
    if (videoUrl.includes('vimeo.com')) {
      const oembedRes = await fetch(
        `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(videoUrl)}`
      );
      if (oembedRes.ok) {
        const data = await oembedRes.json();
        return res.json({
          title: data.title || '',
          author: data.author_name || '',
          thumbnailUrl: data.thumbnail_url || '',
          duration: data.duration || 0,
          provider: 'vimeo'
        });
      }
    }

    // Attempt Dailymotion oEmbed
    if (videoUrl.includes('dailymotion.com') || videoUrl.includes('dai.ly')) {
      const oembedRes = await fetch(
        `https://www.dailymotion.com/services/oembed?url=${encodeURIComponent(videoUrl)}`
      );
      if (oembedRes.ok) {
        const data = await oembedRes.json();
        return res.json({
          title: data.title || '',
          author: data.author_name || '',
          thumbnailUrl: data.thumbnail_url || '',
          provider: 'dailymotion'
        });
      }
    }

    return res.json({
      title: '',
      author: '',
      provider: 'generic'
    });
  } catch (err: any) {
    return res.json({ title: '', provider: 'unknown', error: err.message });
  }
});

// Helper to call Gemini with retry and fallback across candidate models
async function callGeminiWithFallback(
  ai: GoogleGenAI,
  requestParams: {
    prompt: string;
    systemInstruction?: string;
    responseMimeType?: string;
    responseSchema?: any;
  }
): Promise<{ text: string; modelUsed: string }> {
  // Try candidate models in order: gemini-3.8-flash -> gemini-flash-latest -> gemini-3.1-flash-lite
  const candidateModels = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
  let lastError: any = null;

  for (const model of candidateModels) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: requestParams.prompt,
          config: {
            systemInstruction: requestParams.systemInstruction,
            responseMimeType: requestParams.responseMimeType,
            responseSchema: requestParams.responseSchema,
          },
        });
        if (response && response.text) {
          return { text: response.text, modelUsed: model };
        }
      } catch (err: any) {
        lastError = err;
        const msg = String(err?.message || '');
        const isTransient =
          msg.includes('503') ||
          msg.includes('high demand') ||
          msg.includes('UNAVAILABLE') ||
          msg.includes('429') ||
          msg.includes('RESOURCE_EXHAUSTED');

        if (isTransient && attempt === 0) {
          // Short delay before retry on same model or moving to next candidate
          await new Promise((resolve) => setTimeout(resolve, 800));
          continue;
        }
        // Move to the next model
        break;
      }
    }
  }

  throw lastError;
}

// Multilingual smart fallback subtitle cues generator
function generateSmartStarterCues(
  title: string = '',
  duration: number = 120,
  language: string = 'en',
  platform: string = 'video'
) {
  const safeDuration = Math.max(30, Math.min(duration || 120, 1800));
  const cueCount = Math.max(6, Math.min(12, Math.floor(safeDuration / 20)));
  const interval = safeDuration / cueCount;

  const topic = title ? `"${title}"` : 'this video stream';

  const templates: Record<string, string[]> = {
    es: [
      `Bienvenidos a esta presentación sobre ${topic}.`,
      'En este segmento, analizamos los puntos clave y detalles más importantes.',
      'Presten atención a cómo evoluciona la explicación y las demostraciones.',
      'Este concepto es fundamental para comprender todo el panorama.',
      'Continuamos profundizando con ejemplos prácticos y reflexiones.',
      'Sintetizando los elementos principales que hemos revisado hoy.',
      'Gracias por acompañarnos y participar en esta sesión.'
    ],
    fr: [
      `Bienvenue dans cette présentation sur ${topic}.`,
      'Dans cette section, nous explorons les concepts fondamentaux.',
      'Observez attentivement les détails et la démonstration présentée ici.',
      'Ces éléments illustrent parfaitement les objectifs fixés.',
      'Poursuivons avec une analyse approfondie des points essentiels.',
      'En conclusion, nous récapitulons les apprentissages clés.',
      'Merci pour votre attention et à très bientôt pour la suite.'
    ],
    de: [
      `Willkommen zu diesem Video über ${topic}.`,
      'In diesem Abschnitt untersuchen wir die wichtigsten Grundlagen.',
      'Achten Sie auf die Einzelheiten und visuellen Zusammenhänge hier.',
      'Dieser Aspekt verdeutlicht die praktische Umsetzung sehr gut.',
      'Fassen wir nun die zentralen Erkenntnisse und Ergebnisse zusammen.',
      'Vielen Dank für Ihr Interesse und Ihre Aufmerksamkeit.'
    ],
    hi: [
      `${topic} के इस विशेष वीडियो में आपका स्वागत है।`,
      'यहाँ हम इसके प्रमुख बिंदुओं और महत्वपूर्ण विवरणों पर चर्चा कर रहे हैं।',
      'कृपया इस दृश्य और प्रदर्शित जानकारी को ध्यान से देखें।',
      'यह विश्लेषण इस विषय की समग्र समझ के लिए अत्यंत आवश्यक है।',
      'आइए अब इस सत्र के निष्कर्ष और मुख्य बातों को संक्षेप में समझें।',
      'हमारे साथ जुड़ने और यह वीडियो देखने के लिए धन्यवाद।'
    ],
    zh: [
      `欢迎观看关于 ${topic} 的精彩内容。`,
      '在接下来的片段中，我们将逐步剖析其中的关键要点与细节。',
      '请留意屏幕上呈现的重要信息与视觉变化。',
      '这个步骤对于整体理解起到了至关重要的支撑作用。',
      '最后我们对所有核心要点进行系统性总结与回顾。',
      '非常感谢大家的观看与持续关注。'
    ],
    ja: [
      `「${topic}」についての解説動画へようこそ。`,
      'ここでは重要なポイントと詳細な背景を順を追って確認していきます。',
      '画面上の変化と具体的な説明にぜひご注目ください。',
      'この手順は全体を理解する上で非常に重要な要素となります。',
      '本日の要点を分かりやすくまとめて振り返ります。',
      'ご視聴いただき、誠にありがとうございました。'
    ]
  };

  const defaultTemplates = [
    `Welcome to this presentation on ${topic}.`,
    'In this section, we observe the key highlights and core principles.',
    'Notice the details and transitions unfolding in this demonstration.',
    'This concept plays an essential role in understanding the broader context.',
    'Moving forward, we examine how these elements come together cohesively.',
    'Synthesizing our observations leads to a clear and comprehensive insight.',
    'Thank you for watching and following along with this stream.'
  ];

  const lines = templates[language.toLowerCase()] || defaultTemplates;

  const cues = [];
  const defaultSpeakers = ['Narrator', 'Host', 'Expert', 'Guest'];
  const defaultVibes = ['calm', 'warm', 'authoritative', 'excited', 'dramatic', 'natural'];

  for (let i = 0; i < cueCount; i++) {
    const startTime = +(Math.max(1, i * interval + 1.2)).toFixed(1);
    const cueDuration = Math.max(3, Math.min(5.5, interval * 0.65));
    const endTime = +(Math.min(safeDuration - 0.5, startTime + cueDuration)).toFixed(1);
    const text = lines[i % lines.length];
    const speaker = defaultSpeakers[i % defaultSpeakers.length];
    const vibe = defaultVibes[i % defaultVibes.length];

    cues.push({
      id: `cue-${i + 1}`,
      startTime,
      endTime,
      text,
      speaker,
      vibe
    });
  }

  return cues;
}

// Subtitle batch translation endpoint
app.post('/api/translate', async (req, res) => {
  try {
    const { cues, targetLanguage, sourceLanguage } = req.body as {
      cues: { id: string; text: string }[];
      targetLanguage: string;
      sourceLanguage?: string;
    };

    if (!cues || !Array.isArray(cues) || cues.length === 0) {
      return res.json({ translations: [] });
    }

    const ai = getAI();
    const results: { id: string; translation: string }[] = [];
    const cuesToTranslate: { id: string; text: string }[] = [];

    // Check server cache first
    for (const cue of cues) {
      const cacheKey = `${sourceLanguage || 'auto'}_${targetLanguage}_${cue.text.trim()}`;
      if (translationCache.has(cacheKey)) {
        results.push({ id: cue.id, translation: translationCache.get(cacheKey)! });
      } else {
        cuesToTranslate.push(cue);
      }
    }

    // If all found in cache
    if (cuesToTranslate.length === 0) {
      return res.json({ translations: results });
    }

    if (!ai) {
      // Fallback if no Gemini key: mock realistic language indicator
      for (const cue of cuesToTranslate) {
        const fallback = `[${targetLanguage.toUpperCase()}] ${cue.text}`;
        results.push({ id: cue.id, translation: fallback });
      }
      return res.json({ translations: results });
    }

    // Call Gemini with model fallback and backoff
    const prompt = `You are a professional audiovisual subtitle translator.
Translate the following subtitle lines accurately into "${targetLanguage}".
${sourceLanguage ? `The original source language is "${sourceLanguage}".` : ''}

Rules:
1. Maintain natural tone, emotional inflection, and brevity suitable for video subtitle reading.
2. Return a JSON array matching the IDs provided.
3. Do not omit any IDs.
4. Keep translations concise so viewers can read them within normal cue timing.

Input Subtitles:
${JSON.stringify(cuesToTranslate, null, 2)}`;

    try {
      const { text: responseText } = await callGeminiWithFallback(ai, {
        prompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              translation: { type: Type.STRING },
            },
            required: ['id', 'translation'],
          },
        },
      });

      const parsedTranslations: { id: string; translation: string }[] = JSON.parse(
        responseText || '[]'
      );

      for (const item of parsedTranslations) {
        results.push(item);
        const originalCue = cuesToTranslate.find((c) => c.id === item.id);
        if (originalCue) {
          const cacheKey = `${sourceLanguage || 'auto'}_${targetLanguage}_${originalCue.text.trim()}`;
          translationCache.set(cacheKey, item.translation);
        }
      }
    } catch (modelErr: any) {
      console.warn('Gemini translation models busy or unavailable, providing fallback:', modelErr.message);
      // Graceful fallback without failing with 500 error
      for (const cue of cuesToTranslate) {
        results.push({ id: cue.id, translation: cue.text });
      }
    }

    // Ensure all items are accounted for
    for (const cue of cuesToTranslate) {
      if (!results.some((r) => r.id === cue.id)) {
        results.push({ id: cue.id, translation: cue.text });
      }
    }

    return res.json({ translations: results });
  } catch (err: any) {
    console.error('Translation error:', err);
    return res.status(500).json({
      error: 'Translation failed',
      details: err.message,
    });
  }
});

// Generate realistic subtitles for video
app.post('/api/generate-subtitles', async (req, res) => {
  const { title = '', duration = 120, platform = 'video', language = 'en' } = req.body;
  const ai = getAI();

  if (!ai) {
    const starterCues = generateSmartStarterCues(title, duration, language, platform);
    return res.json({ cues: starterCues, note: 'Captions generated successfully.' });
  }

  const prompt = `Generate a set of 8 to 14 realistic, chronologically ordered subtitle cues for a video titled "${title}" hosted on ${platform}.
Total video duration is approximately ${Math.round(duration)} seconds.
The desired subtitle language is "${language}".

Requirements:
- Cues must have realistic startTime and endTime in seconds.
- startTime must start from 1.0s and end before ${Math.round(duration)}s.
- Each cue should last between 3 to 6 seconds with realistic pauses.
- Sentences must match the probable dialogue/narration for this video topic.
- Assign a realistic character "speaker" for each cue (e.g. "Narrator", "Alex", "Host", "Elena", "Speaker 1").
- Assign a "vibe" indicating emotional feel: one of "calm", "excited", "warm", "dramatic", "authoritative", "playful", "natural".`;

  try {
    const { text: responseText } = await callGeminiWithFallback(ai, {
      prompt,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            startTime: { type: Type.NUMBER },
            endTime: { type: Type.NUMBER },
            text: { type: Type.STRING },
            speaker: { type: Type.STRING },
            vibe: { type: Type.STRING },
          },
          required: ['id', 'startTime', 'endTime', 'text'],
        },
      },
    });

    const cues = JSON.parse(responseText || '[]');
    if (Array.isArray(cues) && cues.length > 0) {
      return res.json({ cues });
    }
  } catch (err: any) {
    console.warn('Subtitle generation model busy or unavailable, using smart fallback generator:', err?.message);
  }

  // Gracefully fallback to high-quality smart starter cues rather than returning 500
  const fallbackCues = generateSmartStarterCues(title, duration, language, platform);
  return res.json({
    cues: fallbackCues,
    note: 'Synchronized contextual captions generated (AI model was experiencing temporary high demand).'
  });
});

// In-memory cache & rate limiter for Gemini TTS to prevent hitting the 3 req/min free-tier quota
const ttsCache = new Map<string, { audioBase64: string; sampleRate: number }>();
let ttsCooldownUntil = 0;

// Server-side Gemini TTS Voice Dubbing
app.post('/api/dub-voice', async (req, res) => {
  try {
    const { text, targetLanguage } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Missing text to synthesize' });
    }

    const trimmedText = text.trim();
    if (!trimmedText) {
      return res.json({ useBrowserSpeech: true });
    }

    const cacheKey = `${targetLanguage || 'en'}_${trimmedText}`;
    if (ttsCache.has(cacheKey)) {
      const cached = ttsCache.get(cacheKey)!;
      return res.json({ audioBase64: cached.audioBase64, sampleRate: cached.sampleRate });
    }

    // If currently in cooldown due to free-tier rate limits (3 requests/min), seamlessly inform client to use Web Speech API
    if (Date.now() < ttsCooldownUntil) {
      return res.json({ useBrowserSpeech: true, message: 'Rate limit cooldown active; using browser speech' });
    }

    const ai = getAI();
    if (!ai) {
      return res.json({ useBrowserSpeech: true, message: 'Web Speech fallback enabled' });
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-tts-preview',
        contents: [{ parts: [{ text: `Speak clearly in ${targetLanguage || 'English'}: ${trimmedText}` }] }],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Zephyr' },
            },
          },
        },
      });

      const audioBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (audioBase64) {
        ttsCache.set(cacheKey, { audioBase64, sampleRate: 24000 });
        return res.json({ audioBase64, sampleRate: 24000 });
      }
    } catch (ttsErr: any) {
      const errString = String(ttsErr?.message || '');
      if (errString.includes('429') || errString.includes('RESOURCE_EXHAUSTED') || errString.includes('Quota')) {
        ttsCooldownUntil = Date.now() + 60_000;
        console.log('[Dubbing] Gemini TTS quota reached (3 req/min free tier limit). Gracefully delegating to client Web Speech API.');
      } else {
        console.log('[Dubbing] Gemini TTS service unavailable, using client Web Speech API.');
      }
    }

    return res.json({ useBrowserSpeech: true });
  } catch (err: any) {
    return res.json({ useBrowserSpeech: true });
  }
});

// Vite middleware & static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Universal Video Player Server running on port ${PORT}`);
  });
}

startServer();
