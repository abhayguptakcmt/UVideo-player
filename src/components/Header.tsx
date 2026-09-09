import React from 'react';
import { Video, ArrowLeft, Keyboard, Sparkles, Globe } from 'lucide-react';

interface HeaderProps {
  onBackToHome?: () => void;
  showBackButton?: boolean;
  onOpenShortcuts?: () => void;
  activeLanguage?: string;
}

export const Header: React.FC<HeaderProps> = ({
  onBackToHome,
  showBackButton = false,
  onOpenShortcuts,
  activeLanguage
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-4 sm:px-6 py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand & Navigation */}
        <div className="flex items-center gap-3">
          {showBackButton && (
            <button
              id="header-back-btn"
              onClick={onBackToHome}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 transition-colors"
              title="Return to Video Input"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </button>
          )}

          <div
            onClick={onBackToHome}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-sky-500 to-cyan-400 p-0.5 shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Video className="w-4 h-4 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-white group-hover:text-cyan-300 transition-colors">
                  OmniPlayer
                </span>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  AI Translator
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Universal Playback &amp; Real-time Multilingual Captions
              </p>
            </div>
          </div>
        </div>

        {/* Status Indicators & Tools */}
        <div className="flex items-center gap-2.5">
          {activeLanguage && (
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300">
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              <span>Target:</span>
              <span className="font-semibold text-cyan-300 uppercase">{activeLanguage}</span>
            </div>
          )}

          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-300">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="font-medium">AI Ready</span>
          </div>

          <button
            id="header-shortcuts-btn"
            onClick={onOpenShortcuts}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Keyboard Shortcuts"
            aria-label="Keyboard Shortcuts"
          >
            <Keyboard className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
