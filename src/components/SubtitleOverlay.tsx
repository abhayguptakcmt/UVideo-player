import React from 'react';
import { SubtitleCue, SubtitleSettings } from '../types';
import { Volume2, User, Sparkles } from 'lucide-react';
import { CHARACTER_VIBES, extractSpeakerAndText } from '../services/characterVoiceService';

interface SubtitleOverlayProps {
  cue: SubtitleCue | null;
  settings: SubtitleSettings;
  isDubbingSpeaking?: boolean;
}

export const SubtitleOverlay: React.FC<SubtitleOverlayProps> = ({
  cue,
  settings,
  isDubbingSpeaking = false
}) => {
  if (!settings.enabled || !cue) {
    return null;
  }

  const getFontSizeClass = () => {
    switch (settings.fontSize) {
      case 'sm':
        return 'text-xs sm:text-sm';
      case 'lg':
        return 'text-base sm:text-xl';
      case 'xl':
        return 'text-lg sm:text-2xl';
      case '2xl':
        return 'text-xl sm:text-3xl';
      case 'base':
      default:
        return 'text-sm sm:text-base md:text-lg';
    }
  };

  const getPositionClass = () => {
    switch (settings.position) {
      case 'top':
        return 'top-10 items-start';
      case 'middle':
        return 'top-1/2 -translate-y-1/2 items-center';
      case 'bottom':
      default:
        return 'bottom-16 sm:bottom-20 items-end';
    }
  };

  // Determine speaker & text cleanups
  const extracted = extractSpeakerAndText(cue.text);
  const speakerName = cue.speaker || extracted.speaker;
  const rawSpokenText = extracted.text || cue.text;

  const extractedTrans = cue.translation ? extractSpeakerAndText(cue.translation) : null;
  const displayTranslation = extractedTrans ? extractedTrans.text : cue.translation;
  const hasTranslation = Boolean(displayTranslation && displayTranslation.trim());

  const vibeDef = cue.vibe ? CHARACTER_VIBES[cue.vibe] : null;

  return (
    <div
      className={`pointer-events-none absolute inset-x-0 flex justify-center px-4 sm:px-8 z-30 transition-all duration-150 ${getPositionClass()}`}
      style={{
        ...(settings.position === 'bottom' && settings.bottomOffset
          ? { bottom: `${settings.bottomOffset}px` }
          : {})
      }}
    >
      <div
        dir={settings.isRTL ? 'rtl' : 'ltr'}
        className={`max-w-3xl text-center px-4 py-2.5 rounded-xl backdrop-blur-md transition-all shadow-2xl ${
          settings.isRTL ? 'text-right' : ''
        }`}
        style={{
          backgroundColor: settings.backgroundColor || 'rgba(10, 15, 29, 0.85)',
          border: '1px solid rgba(255, 255, 255, 0.12)'
        }}
      >
        {/* Indicators bar: Dubbing status and Character badge */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-1.5">
          {isDubbingSpeaking && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-cyan-950/60 border border-cyan-500/30 text-[10px] font-semibold text-cyan-300">
              <Volume2 className="w-3 h-3 animate-pulse text-cyan-400" />
              <span>AI Voice Dubbing</span>
            </div>
          )}

          {speakerName && (
            <div
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10.5px] font-semibold tracking-wide border shadow-sm"
              style={{
                backgroundColor: vibeDef ? vibeDef.badgeBg : 'rgba(168, 85, 247, 0.2)',
                color: vibeDef ? vibeDef.color : '#c084fc',
                borderColor: vibeDef ? `${vibeDef.color}50` : 'rgba(168, 85, 247, 0.35)'
              }}
            >
              <User className="w-3 h-3 opacity-90" />
              <span>{speakerName}</span>
              {vibeDef && (
                <span className="text-[9px] opacity-80 font-normal flex items-center gap-0.5">
                  <Sparkles className="w-2.5 h-2.5 inline" />
                  {vibeDef.label.split(' ')[0]}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Dual Language display or Translated text */}
        {settings.showDualLanguage && hasTranslation ? (
          <div className="space-y-1">
            <p
              className={`${getFontSizeClass()} font-semibold text-white leading-relaxed tracking-wide`}
              style={{
                textShadow: '0 2px 4px rgba(0,0,0,0.8), 0 0 10px rgba(0,0,0,0.6)'
              }}
            >
              {displayTranslation}
            </p>
            <p
              className="text-xs sm:text-sm text-slate-300 font-medium opacity-80 leading-snug"
              style={{
                textShadow: '0 1px 3px rgba(0,0,0,0.8)'
              }}
            >
              {rawSpokenText}
            </p>
          </div>
        ) : hasTranslation ? (
          <p
            className={`${getFontSizeClass()} font-semibold text-white leading-relaxed tracking-wide`}
            style={{
              textShadow: '0 2px 4px rgba(0,0,0,0.8), 0 0 10px rgba(0,0,0,0.6)'
            }}
          >
            {displayTranslation}
          </p>
        ) : (
          <p
            className={`${getFontSizeClass()} font-semibold text-white leading-relaxed tracking-wide`}
            style={{
              textShadow: '0 2px 4px rgba(0,0,0,0.8), 0 0 10px rgba(0,0,0,0.6)'
            }}
          >
            {rawSpokenText}
          </p>
        )}
      </div>
    </div>
  );
};
