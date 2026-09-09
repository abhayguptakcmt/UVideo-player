import React from 'react';
import { AlertTriangle, ArrowLeft, RefreshCw, HelpCircle } from 'lucide-react';

interface ErrorDisplayProps {
  error: string;
  onRetry?: () => void;
  onBack: () => void;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onRetry,
  onBack
}) => {
  // Categorize error for actionable advice
  let advice =
    'Please verify the URL or try selecting one of our instant sample presets.';

  if (error.toLowerCase().includes('embed') || error.toLowerCase().includes('framing')) {
    advice =
      'This video publisher may have disabled embedded playback on external domains. Check if embedding is enabled or try a direct media URL.';
  } else if (error.toLowerCase().includes('unsupported') || error.toLowerCase().includes('invalid')) {
    advice =
      'We support YouTube, Bilibili, Vimeo, Dailymotion, Twitch, Facebook, and direct media files (MP4/WebM/Ogg).';
  } else if (error.toLowerCase().includes('network')) {
    advice =
      'Check your internet connection and make sure the video host is accessible.';
  }

  return (
    <div className="w-full max-w-lg mx-auto p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-5 shadow-2xl animate-in fade-in">
      <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
        <AlertTriangle className="w-6 h-6" />
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-bold text-white">Playback Error</h2>
        <p className="text-sm text-rose-300 font-medium">{error}</p>
        <p className="text-xs text-slate-400 leading-relaxed px-4">{advice}</p>
      </div>

      <div className="flex items-center justify-center gap-3 pt-2">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return Home</span>
        </button>

        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors shadow-lg shadow-indigo-600/20"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try Again</span>
          </button>
        )}
      </div>
    </div>
  );
};
