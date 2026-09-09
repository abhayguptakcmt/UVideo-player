import React, { useRef, useState } from 'react';
import {
  X,
  Upload,
  Download,
  Clock,
  Type,
  MoveVertical,
  Sparkles,
  Check,
  FileText,
  RotateCcw
} from 'lucide-react';
import { SubtitleCue, SubtitleSettings } from '../../types';
import {
  parseSRTorVTT,
  exportToSRT,
  exportToVTT
} from '../../services/subtitleService';

interface SubtitleSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SubtitleSettings;
  cues: SubtitleCue[];
  videoTitle: string;
  videoDuration: number;
  platform: string;
  onUpdateSettings: (newSettings: Partial<SubtitleSettings>) => void;
  onLoadSubtitles: (cues: SubtitleCue[], trackLabel?: string) => void;
}

export const SubtitleSettingsModal: React.FC<SubtitleSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  cues,
  videoTitle,
  videoDuration,
  platform,
  onUpdateSettings,
  onLoadSubtitles
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const parsed = parseSRTorVTT(content);
        if (parsed.length > 0) {
          onLoadSubtitles(parsed, file.name);
          setStatusMessage(`Loaded ${parsed.length} subtitles from ${file.name}`);
        } else {
          setStatusMessage('Could not find any valid subtitle cues in the file.');
        }
      }
    };
    reader.readAsText(file);
  };

  const handleGenerateAISubtitles = async () => {
    setIsGenerating(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/generate-subtitles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: videoTitle,
          duration: videoDuration || 120,
          platform,
          language: settings.sourceLanguage === 'auto' ? 'en' : settings.sourceLanguage
        })
      });

      if (!res.ok) throw new Error('Network response was not ok');
      const data = await res.json();
      if (data.cues && data.cues.length > 0) {
        onLoadSubtitles(data.cues, 'AI Generated');
        setStatusMessage(data.note || `Generated ${data.cues.length} synchronized AI subtitle cues!`);
      } else {
        setStatusMessage('AI could not generate subtitles for this video.');
      }
    } catch (err: any) {
      console.warn('Subtitle generation client notice:', err);
      setStatusMessage('Service temporarily busy. Please try again in a moment or upload an SRT/VTT file.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = (format: 'srt' | 'vtt') => {
    if (cues.length === 0) return;
    const content = format === 'srt' ? exportToSRT(cues) : exportToVTT(cues);
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subtitles_${Date.now()}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 text-white space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Type className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Subtitle Customization</h2>
              <p className="text-xs text-slate-400">
                Adjust font sizing, placement, sync delay, and upload files
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-5">
          {/* Subtitle Visibility Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
            <div>
              <div className="text-xs font-semibold text-slate-200">
                Enable Subtitles
              </div>
              <p className="text-[11px] text-slate-400">
                Display synchronized captions on the video player
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => onUpdateSettings({ enabled: e.target.checked })}
              className="w-4 h-4 rounded text-indigo-500 accent-indigo-500 cursor-pointer"
            />
          </div>

          {/* Font Size Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Font Size
            </label>
            <div className="grid grid-cols-5 gap-2">
              {(['sm', 'base', 'lg', 'xl', '2xl'] as const).map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => onUpdateSettings({ fontSize: size })}
                  className={`py-2 px-1 text-xs font-medium rounded-xl border transition-all text-center uppercase ${
                    settings.fontSize === size
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Position Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Screen Position
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['bottom', 'middle', 'top'] as const).map((pos) => (
                <button
                  key={pos}
                  type="button"
                  onClick={() => onUpdateSettings({ position: pos })}
                  className={`py-2 px-2 text-xs font-medium rounded-xl border transition-all capitalize ${
                    settings.position === pos
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {pos}
                </button>
              ))}
            </div>
          </div>

          {/* Timing Sync / Delay Adjustment */}
          <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span>Subtitle Timing Sync / Delay</span>
              </div>
              <span className="font-mono text-xs font-bold text-cyan-400">
                {settings.delaySeconds >= 0
                  ? `+${settings.delaySeconds.toFixed(1)}s`
                  : `${settings.delaySeconds.toFixed(1)}s`}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  onUpdateSettings({
                    delaySeconds: Math.max(-5, +(settings.delaySeconds - 0.2).toFixed(1))
                  })
                }
                className="px-2.5 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-200"
              >
                -0.2s
              </button>
              <input
                type="range"
                min={-5}
                max={5}
                step={0.1}
                value={settings.delaySeconds}
                onChange={(e) =>
                  onUpdateSettings({ delaySeconds: parseFloat(e.target.value) })
                }
                className="flex-1 accent-indigo-500 h-1 bg-slate-700 rounded cursor-pointer"
              />
              <button
                type="button"
                onClick={() =>
                  onUpdateSettings({
                    delaySeconds: Math.min(5, +(settings.delaySeconds + 0.2).toFixed(1))
                  })
                }
                className="px-2.5 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-200"
              >
                +0.2s
              </button>
              <button
                type="button"
                onClick={() => onUpdateSettings({ delaySeconds: 0 })}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
                title="Reset to 0s"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Positive values delay subtitles; negative values display them earlier.
            </p>
          </div>

          {/* Upload & AI Generation */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="text-xs font-semibold text-slate-300">
              Manage Subtitle File
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* File Upload Input */}
              <input
                type="file"
                ref={fileInputRef}
                accept=".srt,.vtt,text/vtt,text/plain"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-xs font-semibold text-slate-200 transition-colors"
              >
                <Upload className="w-4 h-4 text-indigo-400" />
                <span>Upload SRT / VTT</span>
              </button>

              {/* Generate AI Subtitles */}
              <button
                type="button"
                disabled={isGenerating}
                onClick={handleGenerateAISubtitles}
                className="flex items-center justify-center gap-2 p-3 rounded-xl bg-gradient-to-r from-indigo-900/60 to-purple-900/60 hover:from-indigo-800/80 hover:to-purple-800/80 border border-indigo-700/60 text-xs font-semibold text-indigo-200 transition-colors disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>{isGenerating ? 'Generating...' : 'Generate with AI'}</span>
              </button>
            </div>

            {/* Export buttons */}
            {cues.length > 0 && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-slate-400">
                  Export {cues.length} cues:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownload('srt')}
                    className="px-2.5 py-1 text-[11px] font-mono bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 border border-slate-700"
                  >
                    .SRT
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownload('vtt')}
                    className="px-2.5 py-1 text-[11px] font-mono bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 border border-slate-700"
                  >
                    .VTT
                  </button>
                </div>
              </div>
            )}

            {statusMessage && (
              <p className="text-xs text-cyan-300 p-2 rounded-lg bg-cyan-950/40 border border-cyan-800/60">
                {statusMessage}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
