import React, { useState } from 'react';
import { X, Languages, Sparkles, Check, ArrowRight, Globe, Layers } from 'lucide-react';
import { SUPPORTED_LANGUAGES, isLanguageRTL } from '../../services/languages';
import { SubtitleCue, SubtitleSettings } from '../../types';

interface TranslationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: SubtitleSettings;
  cues: SubtitleCue[];
  onApplyTranslation: (
    targetLang: string,
    sourceLang: string,
    showDual: boolean,
    translatedCues: SubtitleCue[]
  ) => void;
}

export const TranslationModal: React.FC<TranslationModalProps> = ({
  isOpen,
  onClose,
  currentSettings,
  cues,
  onApplyTranslation
}) => {
  const [targetLang, setTargetLang] = useState(currentSettings.targetLanguage || 'es');
  const [sourceLang, setSourceLang] = useState(currentSettings.sourceLanguage || 'auto');
  const [showDual, setShowDual] = useState(currentSettings.showDualLanguage ?? true);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationProgress, setTranslationProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStartTranslation = async () => {
    if (cues.length === 0) {
      setError('No subtitles available to translate. Upload an SRT/VTT file or generate subtitles first.');
      return;
    }

    setIsTranslating(true);
    setError(null);
    setTranslationProgress(10);

    try {
      // Chunk cues if large
      const batchPayload = cues.map((c) => ({ id: c.id, text: c.text }));
      setTranslationProgress(35);

      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cues: batchPayload,
          targetLanguage: targetLang,
          sourceLanguage: sourceLang === 'auto' ? undefined : sourceLang
        })
      });

      setTranslationProgress(75);

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const data = await res.json();
      const translations: { id: string; translation: string }[] = data.translations || [];

      // Map translations to cues
      const translatedMap = new Map(translations.map((t) => [t.id, t.translation]));
      const updatedCues = cues.map((cue) => ({
        ...cue,
        translation: translatedMap.get(cue.id) || cue.text
      }));

      setTranslationProgress(100);
      onApplyTranslation(targetLang, sourceLang, showDual, updatedCues);
      onClose();
    } catch (err: any) {
      console.error('Translation error:', err);
      setError(err.message || 'Translation failed. Please try again.');
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 text-white space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center">
              <Languages className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Subtitle Translation</h2>
              <p className="text-xs text-slate-400">
                Translate video captions into any language with timeline precision
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
        <div className="space-y-4">
          {/* Source & Target Language Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Source Language
              </label>
              <select
                value={sourceLang}
                onChange={(e) => setSourceLang(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="auto">Auto-Detect</option>
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={`src-${lang.code}`} value={lang.code}>
                    {lang.name} ({lang.nativeName})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Target Language
              </label>
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-cyan-500"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={`tgt-${lang.code}`} value={lang.code}>
                    {lang.name} ({lang.nativeName}){lang.rtl ? ' [RTL]' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dual Language Option */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
            <div>
              <div className="text-xs font-semibold text-slate-200">
                Dual Language Subtitles
              </div>
              <p className="text-[11px] text-slate-400">
                Show original text and translated text simultaneously
              </p>
            </div>
            <input
              type="checkbox"
              checked={showDual}
              onChange={(e) => setShowDual(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-500 accent-indigo-500 cursor-pointer"
            />
          </div>

          {/* Subtitle count indicator */}
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>Available Subtitles:</span>
            <span className="font-mono text-slate-200 font-semibold">
              {cues.length} {cues.length === 1 ? 'cue' : 'cues'}
            </span>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800/70 text-rose-300 text-xs">
              {error}
            </div>
          )}

          {isTranslating && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-cyan-300">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  Translating with Gemini AI...
                </span>
                <span>{translationProgress}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-indigo-500 transition-all duration-300"
                  style={{ width: `${translationProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            id="translate-modal-apply-btn"
            type="button"
            disabled={isTranslating || cues.length === 0}
            onClick={handleStartTranslation}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isTranslating ? 'Translating...' : 'Translate Subtitles'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
