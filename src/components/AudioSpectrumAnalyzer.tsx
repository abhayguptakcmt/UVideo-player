import React, { useEffect, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Mic, Volume2 } from 'lucide-react';
import { audioSyncManager } from '../services/audioSyncManager';
import { AudioSyncMetrics, AudioTrackSource } from '../types';

interface AudioSpectrumAnalyzerProps {
  onOpenAudioManager: () => void;
  className?: string;
  compact?: boolean;
}

export const AudioSpectrumAnalyzer: React.FC<AudioSpectrumAnalyzerProps> = ({
  onOpenAudioManager,
  className = '',
  compact = false
}) => {
  const [frequencies, setFrequencies] = useState<number[]>(new Array(14).fill(0.05));
  const [activeSource, setActiveSource] = useState<AudioTrackSource>('original');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [metrics, setMetrics] = useState<AudioSyncMetrics>(() => audioSyncManager.getMetrics());

  useEffect(() => {
    const unsubSpectrum = audioSyncManager.subscribeSpectrum((freqs, source, speaking) => {
      setFrequencies(freqs.slice(0, 14));
      setActiveSource(source);
      setIsSpeaking(speaking);
    });

    const unsubSync = audioSyncManager.subscribe((m) => {
      setMetrics(m);
    });

    return () => {
      unsubSpectrum();
      unsubSync();
    };
  }, []);

  const isDubbed = activeSource === 'dubbed';

  // Dynamic bar colors based on active track
  const getBarColor = (index: number) => {
    if (isDubbed) {
      if (isSpeaking) {
        // High-energy gradient for active character voice speech
        return index % 2 === 0
          ? 'bg-gradient-to-t from-purple-600 via-pink-500 to-cyan-300 shadow-[0_0_8px_rgba(216,180,254,0.6)]'
          : 'bg-gradient-to-t from-indigo-600 via-purple-400 to-amber-300 shadow-[0_0_8px_rgba(244,114,182,0.6)]';
      }
      // Dubbed track active but resting between dialogue turns
      return 'bg-purple-500/40';
    }
    // Original video audio track
    return index % 2 === 0
      ? 'bg-gradient-to-t from-cyan-600 to-blue-400 shadow-[0_0_6px_rgba(6,182,212,0.4)]'
      : 'bg-gradient-to-t from-blue-600 to-teal-300 shadow-[0_0_6px_rgba(45,212,191,0.4)]';
  };

  const getDriftBadge = () => {
    if (!isDubbed) return null;

    if (metrics.isDriftExceeded) {
      return (
        <span className="flex items-center gap-0.5 text-[9px] font-mono font-bold text-rose-400 bg-rose-950/80 border border-rose-600/50 px-1 py-0.2 rounded animate-pulse">
          <AlertTriangle className="w-2.5 h-2.5 text-rose-400" />
          {metrics.driftMs > 0 ? `+${metrics.driftMs}ms` : `${metrics.driftMs}ms`}
        </span>
      );
    }

    return (
      <span className="flex items-center gap-0.5 text-[9px] font-mono text-emerald-400 bg-emerald-950/70 border border-emerald-600/40 px-1 py-0.2 rounded">
        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
        {Math.abs(metrics.driftMs)}ms
      </span>
    );
  };

  return (
    <button
      id="audio-spectrum-analyzer-btn"
      onClick={onOpenAudioManager}
      title={`Audio Track: ${isDubbed ? 'AI Dubbing' : 'Original Audio'}. Click to open Audio Manager & Latency Monitor`}
      className={`group flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all cursor-pointer ${
        isDubbed
          ? 'bg-slate-900/90 border-purple-500/50 hover:border-purple-400 hover:bg-slate-800/90'
          : 'bg-slate-900/80 border-cyan-500/30 hover:border-cyan-400 hover:bg-slate-800/90'
      } ${className}`}
    >
      {/* Track Source Icon */}
      <div className="flex items-center justify-center">
        {isDubbed ? (
          <Mic
            className={`w-3.5 h-3.5 ${
              isSpeaking ? 'text-purple-300 animate-bounce' : 'text-purple-400'
            }`}
          />
        ) : (
          <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
        )}
      </div>

      {/* Real-time Spectrum Bars */}
      <div className="flex items-end gap-[2px] h-4 w-14 sm:w-16 px-0.5 py-0.5 bg-black/40 rounded">
        {frequencies.map((val, idx) => {
          const heightPct = Math.max(8, Math.min(100, Math.round(val * 100)));
          return (
            <div
              key={idx}
              className={`w-1 rounded-t-sm transition-all duration-75 ${getBarColor(idx)}`}
              style={{ height: `${heightPct}%` }}
            />
          );
        })}
      </div>

      {/* Label and Sync State */}
      {!compact && (
        <div className="hidden md:flex flex-col items-start leading-none text-left">
          <div className="flex items-center gap-1">
            <span
              className={`text-[10px] font-bold uppercase tracking-wider ${
                isDubbed ? 'text-purple-300' : 'text-cyan-300'
              }`}
            >
              {isDubbed ? (metrics.activeSpeaker ? `DUB: ${metrics.activeSpeaker}` : 'AI DUBBED') : 'ORIGINAL'}
            </span>
            {getDriftBadge()}
          </div>
          <span className="text-[9px] text-slate-400 font-mono mt-0.5">
            {isDubbed
              ? isSpeaking
                ? 'Voice Speaking'
                : 'Engine Ready'
              : 'Video Audio'}
          </span>
        </div>
      )}

      {/* Subtle indicator beacon */}
      <Activity
        className={`w-3 h-3 ml-0.5 opacity-60 group-hover:opacity-100 transition-opacity ${
          isDubbed ? 'text-purple-400' : 'text-cyan-400'
        }`}
      />
    </button>
  );
};
