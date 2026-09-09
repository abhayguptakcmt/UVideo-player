import { SubtitleCue, CharacterVoiceProfile, CharacterVibe } from '../types';

export interface VibeDefinition {
  id: CharacterVibe;
  label: string;
  description: string;
  pitchOffset: number;
  rateOffset: number;
  color: string;
  badgeBg: string;
}

export const CHARACTER_VIBES: Record<CharacterVibe, VibeDefinition> = {
  natural: {
    id: 'natural',
    label: 'Natural Conversational',
    description: 'Balanced, organic flow with realistic human pauses and cadence',
    pitchOffset: 0.0,
    rateOffset: 0.0,
    color: '#38bdf8', // sky-400
    badgeBg: 'rgba(56, 189, 248, 0.15)'
  },
  warm: {
    id: 'warm',
    label: 'Warm & Empathetic',
    description: 'Rich, friendly resonance with gentle comforting rhythm',
    pitchOffset: 0.04,
    rateOffset: -0.02,
    color: '#fbbf24', // amber-400
    badgeBg: 'rgba(251, 191, 36, 0.15)'
  },
  excited: {
    id: 'excited',
    label: 'Excited & Upbeat',
    description: 'Dynamic high energy, lively inflection, and enthusiastic pace',
    pitchOffset: 0.14,
    rateOffset: 0.08,
    color: '#06b6d4', // cyan-400
    badgeBg: 'rgba(6, 182, 212, 0.15)'
  },
  calm: {
    id: 'calm',
    label: 'Calm & Deep (Narrator)',
    description: 'Steady, grounded resonance with contemplative cinematic pacing',
    pitchOffset: -0.12,
    rateOffset: -0.06,
    color: '#a78bfa', // violet-400
    badgeBg: 'rgba(167, 139, 250, 0.15)'
  },
  dramatic: {
    id: 'dramatic',
    label: 'Dramatic & Intense',
    description: 'Deep emotional gravity, expressive pauses, and heightened suspense',
    pitchOffset: -0.08,
    rateOffset: -0.08,
    color: '#fb7185', // rose-400
    badgeBg: 'rgba(251, 113, 133, 0.15)'
  },
  authoritative: {
    id: 'authoritative',
    label: 'Authoritative & Crisp',
    description: 'Clear, articulate, commanding professional delivery',
    pitchOffset: -0.02,
    rateOffset: 0.02,
    color: '#34d399', // emerald-400
    badgeBg: 'rgba(52, 211, 153, 0.15)'
  },
  playful: {
    id: 'playful',
    label: 'Playful & Bright',
    description: 'Spirited, cheerful inflection with lighthearted cadence',
    pitchOffset: 0.18,
    rateOffset: 0.06,
    color: '#f472b6', // pink-400
    badgeBg: 'rgba(244, 114, 182, 0.15)'
  }
};

const DEFAULT_CHARACTER_COLORS = [
  '#38bdf8', // Sky
  '#a855f7', // Purple
  '#34d399', // Emerald
  '#fbbf24', // Amber
  '#f43f5e', // Rose
  '#06b6d4', // Cyan
  '#ec4899', // Pink
  '#f97316'  // Orange
];

/**
 * Extracts speaker name and cleaned text from a subtitle line.
 * Matches patterns like "Speaker 1: Hello", "[Narrator] In the year 2050...", "(Alice) What?", etc.
 */
export function extractSpeakerAndText(rawText: string): {
  speaker: string | null;
  text: string;
} {
  if (!rawText) return { speaker: null, text: '' };

  let trimmed = rawText.trim();

  // 1. Bracketed speaker: [Narrator] or (Alice) or <Host>
  const bracketMatch = trimmed.match(/^\[([A-Za-z0-9\s._'-]{2,25})\]\s*(.*)$/);
  if (bracketMatch) {
    return {
      speaker: bracketMatch[1].trim(),
      text: bracketMatch[2].trim()
    };
  }

  const parenMatch = trimmed.match(/^\(([A-Za-z0-9\s._'-]{2,25})\)\s*(.*)$/);
  if (parenMatch) {
    return {
      speaker: parenMatch[1].trim(),
      text: parenMatch[2].trim()
    };
  }

  // 2. Colon speaker: "Alex: What did you think?"
  const colonMatch = trimmed.match(/^([A-Za-z0-9\s._'-]{2,25}):\s+(.*)$/);
  if (colonMatch) {
    const speakerCandidate = colonMatch[1].trim();
    // Verify it's not a timestamp like "01:23"
    if (!/^\d+$/.test(speakerCandidate)) {
      return {
        speaker: speakerCandidate,
        text: colonMatch[2].trim()
      };
    }
  }

  // 3. Dialogue hyphen markers: "- How are you doing?"
  if (trimmed.startsWith('- ')) {
    return {
      speaker: null,
      text: trimmed.replace(/^-\s*/, '').trim()
    };
  }

  return { speaker: null, text: trimmed };
}

/**
 * Analyzes an array of subtitle cues and tags speakers and vibes.
 * If cues already have explicit speaker tags, it normalizes them.
 * If not, it uses conversational turn-taking heuristics (questions/replies, alternating turns)
 * to separate narrator and conversational characters.
 */
export function analyzeAndTagCueCharacters(cues: SubtitleCue[]): {
  taggedCues: SubtitleCue[];
  detectedSpeakers: string[];
} {
  const speakersSet = new Set<string>();
  const taggedCues: SubtitleCue[] = [];

  let explicitSpeakerCount = 0;

  // First pass: look for explicit speaker prefixes
  for (const cue of cues) {
    const extracted = extractSpeakerAndText(cue.text);
    if (extracted.speaker) {
      explicitSpeakerCount++;
      speakersSet.add(extracted.speaker);
    }
  }

  // If at least 2 cues had explicit tags, use them throughout
  if (explicitSpeakerCount >= 2) {
    let currentSpeaker = 'Narrator';
    for (const cue of cues) {
      const extracted = extractSpeakerAndText(cue.text);
      if (extracted.speaker) {
        currentSpeaker = extracted.speaker;
      }
      speakersSet.add(currentSpeaker);

      // Determine vibe from punctuation and text cues
      const vibe = detectVibeFromText(extracted.text);

      taggedCues.push({
        ...cue,
        speaker: currentSpeaker,
        vibe,
        text: cue.text
      });
    }
    return {
      taggedCues,
      detectedSpeakers: Array.from(speakersSet)
    };
  }

  // Otherwise, heuristic character alternation for dialogues vs documentaries
  let inferredSpeakers: string[] = ['Narrator'];
  const hasDialogueMarkers = cues.some((c) => c.text.includes('?') || c.text.startsWith('-'));

  if (hasDialogueMarkers && cues.length >= 4) {
    inferredSpeakers = ['Host / Character 1', 'Guest / Character 2'];
    speakersSet.add(inferredSpeakers[0]);
    speakersSet.add(inferredSpeakers[1]);

    let activeSpeakerIndex = 0;
    for (let i = 0; i < cues.length; i++) {
      const cue = cues[i];
      // Switch speaker on questions, short responses, or dialogue dashes
      const isQuestion = cue.text.includes('?');
      const isShortResponse = cue.text.length < 25 && /^(Yes|No|Exactly|Indeed|Right|Sure|Okay)/i.test(cue.text);
      const hasDash = cue.text.startsWith('-');

      if (i > 0 && (isQuestion || isShortResponse || hasDash || (i % 3 === 0))) {
        activeSpeakerIndex = (activeSpeakerIndex + 1) % 2;
      }

      const assignedSpeaker = inferredSpeakers[activeSpeakerIndex];
      const vibe = detectVibeFromText(cue.text);

      taggedCues.push({
        ...cue,
        speaker: assignedSpeaker,
        vibe
      });
    }
  } else {
    // Single narrator / presenter
    for (const cue of cues) {
      taggedCues.push({
        ...cue,
        speaker: 'Narrator',
        vibe: detectVibeFromText(cue.text)
      });
    }
    speakersSet.add('Narrator');
  }

  return {
    taggedCues,
    detectedSpeakers: Array.from(speakersSet)
  };
}

/**
 * Infers an emotional vibe from text cues and punctuation
 */
export function detectVibeFromText(text: string): CharacterVibe {
  const trimmed = text.trim();
  if (trimmed.endsWith('!') || /(!{2,}|amazing|wow|incredible|unbelievable|fantastic|fast)/i.test(trimmed)) {
    return 'excited';
  }
  if (/\b(deep|ancient|mysterious|dark|whisper|silence|secret|truth)\b/i.test(trimmed)) {
    return 'dramatic';
  }
  if (/\b(welcome|kind|gentle|care|heart|love|friend|together|hope)\b/i.test(trimmed)) {
    return 'warm';
  }
  if (/\b(now|must|essential|critical|analyze|observe|rule|proven|data)\b/i.test(trimmed)) {
    return 'authoritative';
  }
  if (/\b(fun|play|laugh|game|happy|cool|silly|joke)\b/i.test(trimmed)) {
    return 'playful';
  }
  return 'natural';
}

/**
 * Builds default character profiles for a list of detected speaker names,
 * pairing each with distinct vibes, pitches, colors, and voices.
 */
export function buildDefaultCharacterProfiles(
  speakerNames: string[],
  availableVoices: SpeechSynthesisVoice[] = [],
  targetLang = 'en'
): Record<string, CharacterVoiceProfile> {
  const profiles: Record<string, CharacterVoiceProfile> = {};

  const cleanLang = targetLang.toLowerCase().slice(0, 2);
  const langVoices = availableVoices.filter(
    (v) => v.lang.toLowerCase().startsWith(cleanLang) || v.lang.toLowerCase().includes(cleanLang)
  );

  // Fallback to all voices if none match target language
  const candidateVoices = langVoices.length > 0 ? langVoices : availableVoices;

  const defaultVibes: CharacterVibe[] = [
    'calm',          // Speaker 1 / Narrator
    'excited',       // Speaker 2
    'warm',          // Speaker 3
    'authoritative', // Speaker 4
    'dramatic',      // Speaker 5
    'playful'        // Speaker 6
  ];

  speakerNames.forEach((name, index) => {
    const vibe = defaultVibes[index % defaultVibes.length];
    const vibeDef = CHARACTER_VIBES[vibe];
    const color = DEFAULT_CHARACTER_COLORS[index % DEFAULT_CHARACTER_COLORS.length];

    // Pick a distinct voice if multiple are available
    let assignedVoice: SpeechSynthesisVoice | undefined;
    if (candidateVoices.length > 0) {
      assignedVoice = candidateVoices[index % candidateVoices.length];
    }

    // Gender inference
    let gender: 'male' | 'female' | 'neutral' = 'neutral';
    const lowerName = name.toLowerCase();
    if (/(female|woman|girl|alice|sarah|emma|elena|mary|maria|anna)/.test(lowerName)) {
      gender = 'female';
    } else if (/(male|man|boy|alex|john|david|michael|dr\.|narrator|host)/.test(lowerName)) {
      gender = 'male';
    }

    profiles[name] = {
      id: `char-${index + 1}`,
      name,
      gender,
      vibe,
      voiceURI: assignedVoice?.voiceURI,
      voiceName: assignedVoice?.name,
      pitchOffset: vibeDef.pitchOffset,
      rateOffset: vibeDef.rateOffset,
      color
    };
  });

  return profiles;
}

/**
 * Strips stage directions, bracketed effects, speaker labels, and expands symbols
 * so the AI dubbing voice sounds naturally spoken instead of reading punctuation/code.
 */
export function cleanSpokenTextForNaturalSpeech(rawText: string): string {
  if (!rawText) return '';

  let cleaned = rawText;

  // 1. Remove bracketed sound effects & stage directions: [Music], (laughter), [Applause], *sighs*
  cleaned = cleaned.replace(/\[[^\]]*\]/g, ' ');
  cleaned = cleaned.replace(/\([^\)]*\)/g, ' ');
  cleaned = cleaned.replace(/\*[^*]*\*/g, ' ');

  // 2. Remove leading speaker prefix if present (e.g. "Alex: Hello" -> "Hello")
  cleaned = cleaned.replace(/^[A-Za-z0-9\s._'-]{2,25}:\s+/, '');

  // 3. Remove dialogue hyphens and bullet markers
  cleaned = cleaned.replace(/^[-—*•]\s*/, '');

  // 4. Natural punctuation rhythm:
  // Convert ellipses to a soft comma pause
  cleaned = cleaned.replace(/\.{3,}/g, ', ');
  // Convert multiple exclamation or question marks to a single one
  cleaned = cleaned.replace(/!{2,}/g, '!');
  cleaned = cleaned.replace(/\?{2,}/g, '?');

  // 5. Expand symbols to spoken words for high natural clarity
  cleaned = cleaned.replace(/\s*&\s*/g, ' and ');
  cleaned = cleaned.replace(/\s*%\s*/g, ' percent ');
  cleaned = cleaned.replace(/\s*\+\s*/g, ' plus ');
  cleaned = cleaned.replace(/\s*@\s*/g, ' at ');

  // 6. Clean up multiple spaces
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
}

/**
 * Computes natural dynamic cadence (rate) so the spoken line
 * completes organically within the subtitle cue duration without truncation.
 */
export function calculateNaturalCadence(
  text: string,
  cueDuration: number,
  baseRate = 1.0,
  rateOffset = 0.0
): number {
  if (!text || cueDuration <= 0) return baseRate + rateOffset;

  const words = text.split(/\s+/).filter(Boolean).length;
  // Natural speaking speed is roughly 2.5 to 3 words per second (150-180 WPM)
  const estimatedNormalSeconds = words / 2.7;

  let adaptiveRate = baseRate + rateOffset;

  // If the cue window is tight, slightly speed up naturally (max +20%)
  if (cueDuration < estimatedNormalSeconds * 0.85) {
    const requiredSpeed = estimatedNormalSeconds / cueDuration;
    adaptiveRate = Math.min(1.35, adaptiveRate * Math.min(requiredSpeed, 1.2));
  } else if (cueDuration > estimatedNormalSeconds * 1.6) {
    // If the window is very generous, speak with a relaxed natural cadence (min -10%)
    adaptiveRate = Math.max(0.85, adaptiveRate * 0.95);
  }

  return +adaptiveRate.toFixed(2);
}
