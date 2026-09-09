import { SubtitleCue } from '../types';

export function parseTimestamp(timeStr: string): number {
  const clean = timeStr.trim().replace(',', '.');
  const parts = clean.split(':');
  if (parts.length === 3) {
    const hours = parseFloat(parts[0]);
    const minutes = parseFloat(parts[1]);
    const seconds = parseFloat(parts[2]);
    return hours * 3600 + minutes * 60 + seconds;
  } else if (parts.length === 2) {
    const minutes = parseFloat(parts[0]);
    const seconds = parseFloat(parts[1]);
    return minutes * 60 + seconds;
  } else {
    return parseFloat(clean) || 0;
  }
}

export function formatTimestamp(seconds: number, format: 'srt' | 'vtt' = 'srt'): string {
  const validSec = Math.max(0, seconds);
  const hrs = Math.floor(validSec / 3600);
  const mins = Math.floor((validSec % 3600) / 60);
  const secs = Math.floor(validSec % 60);
  const ms = Math.floor((validSec % 1) * 1000);

  const hh = String(hrs).padStart(2, '0');
  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');
  const mmm = String(ms).padStart(3, '0');

  const sep = format === 'srt' ? ',' : '.';
  return `${hh}:${mm}:${ss}${sep}${mmm}`;
}

export function parseSRTorVTT(content: string): SubtitleCue[] {
  const cues: SubtitleCue[] = [];
  // Normalize line breaks
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = normalized.split(/\n\s*\n/);

  let cueIdx = 1;

  for (const block of blocks) {
    const lines = block.trim().split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    // Check if line contains timestamp arrow "-->"
    let timeLineIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('-->')) {
        timeLineIdx = i;
        break;
      }
    }

    if (timeLineIdx === -1) continue;

    const timeLine = lines[timeLineIdx];
    const [startStr, endStr] = timeLine.split('-->').map((s) => s.trim());
    if (!startStr || !endStr) continue;

    const startTime = parseTimestamp(startStr.split(' ')[0]);
    const endTime = parseTimestamp(endStr.split(' ')[0]);

    const textLines = lines.slice(timeLineIdx + 1);
    const text = textLines.join(' ');

    if (text.trim().length > 0 && endTime > startTime) {
      cues.push({
        id: `cue-${cueIdx++}`,
        startTime,
        endTime,
        text: text.replace(/<[^>]*>/g, '') // strip HTML/cue styling tags
      });
    }
  }

  return cues.sort((a, b) => a.startTime - b.startTime);
}

export function findActiveCue(
  cues: SubtitleCue[],
  currentTime: number,
  delaySeconds: number = 0
): SubtitleCue | null {
  const adjustedTime = currentTime - delaySeconds;
  // Subtitle cue is active if adjustedTime is between startTime and endTime
  for (const cue of cues) {
    if (adjustedTime >= cue.startTime && adjustedTime <= cue.endTime) {
      return cue;
    }
  }
  return null;
}

export function exportToSRT(cues: SubtitleCue[], useTranslation: boolean = false): string {
  return cues
    .map((cue, idx) => {
      const start = formatTimestamp(cue.startTime, 'srt');
      const end = formatTimestamp(cue.endTime, 'srt');
      const text = (useTranslation && cue.translation) ? cue.translation : cue.text;
      return `${idx + 1}\n${start} --> ${end}\n${text}\n`;
    })
    .join('\n');
}

export function exportToVTT(cues: SubtitleCue[], useTranslation: boolean = false): string {
  const header = 'WEBVTT\n\n';
  const body = cues
    .map((cue, idx) => {
      const start = formatTimestamp(cue.startTime, 'vtt');
      const end = formatTimestamp(cue.endTime, 'vtt');
      const text = (useTranslation && cue.translation) ? cue.translation : cue.text;
      return `${idx + 1}\n${start} --> ${end}\n${text}\n`;
    })
    .join('\n');
  return header + body;
}
