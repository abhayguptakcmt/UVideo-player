import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Space', action: 'Play / Pause' },
    { key: '← / →', action: 'Seek backward / forward (10 seconds)' },
    { key: '↑ / ↓', action: 'Increase / decrease volume (10%)' },
    { key: 'M', action: 'Mute / Unmute' },
    { key: 'F', action: 'Toggle Fullscreen mode' },
    { key: 'C', action: 'Toggle Subtitles on / off' },
    { key: 'T', action: 'Open AI Subtitle Translation' },
    { key: 'S', action: 'Open Subtitle & Sync Settings' },
    { key: 'D', action: 'Toggle AI Voice Dubbing' },
    { key: 'A', action: 'Open Audio Manager & Latency Monitor' },
    { key: 'Esc', action: 'Close active modal / Exit fullscreen' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 text-white space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Keyboard className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Keyboard Shortcuts</h2>
              <p className="text-xs text-slate-400">
                Quick media player controls &amp; subtitle hotkeys
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

        {/* List */}
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {shortcuts.map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60"
            >
              <span className="text-xs text-slate-300 font-medium">{item.action}</span>
              <kbd className="px-2.5 py-1 text-xs font-mono font-semibold bg-slate-950 text-cyan-300 border border-slate-700 rounded-md shadow-sm">
                {item.key}
              </kbd>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
