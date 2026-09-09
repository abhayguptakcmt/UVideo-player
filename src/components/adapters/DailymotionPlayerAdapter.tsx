import React, { useEffect, useRef } from 'react';
import { VideoSourceInfo, PlayerState } from '../../types';

interface DailymotionPlayerAdapterProps {
  sourceInfo: VideoSourceInfo;
  playerState: PlayerState;
  isDubbingActive?: boolean;
  onTimeUpdate: (currentTime: number, duration?: number) => void;
  onDurationChange: (duration: number) => void;
  onStateChange: (isPlaying: boolean, isBuffering?: boolean) => void;
  onEnded: () => void;
  onError: (msg: string) => void;
  seekCommand: number | null;
  onSeekHandled: () => void;
}

export const DailymotionPlayerAdapter: React.FC<DailymotionPlayerAdapterProps> = ({
  sourceInfo,
  playerState,
  isDubbingActive = false,
  onTimeUpdate,
  onDurationChange,
  onStateChange,
  onEnded,
  onError,
  seekCommand,
  onSeekHandled
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const postToDM = (command: string, args: any[] = []) => {
    if (!iframeRef.current || !iframeRef.current.contentWindow) return;
    try {
      const payload = `dmp:${JSON.stringify({ command, parameters: args })}`;
      iframeRef.current.contentWindow.postMessage(payload, '*');
    } catch (e) {
      console.warn('Dailymotion postMessage error', e);
    }
  };

  useEffect(() => {
    if (playerState.isPlaying) {
      postToDM('play');
    } else {
      postToDM('pause');
    }
  }, [playerState.isPlaying]);

  useEffect(() => {
    if (seekCommand !== null) {
      postToDM('seek', [seekCommand]);
      onSeekHandled();
    }
  }, [seekCommand, onSeekHandled]);

  useEffect(() => {
    postToDM('volume', [isDubbingActive ? 0 : playerState.volume]);
    postToDM('muted', [isDubbingActive ? true : playerState.isMuted]);
  }, [playerState.volume, playerState.isMuted, isDubbingActive]);

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (typeof e.data !== 'string' || !e.data.startsWith('dmp:')) return;
      try {
        const parsed = JSON.parse(e.data.substring(4));
        if (parsed.event === 'timeupdate' && typeof parsed.time === 'number') {
          onTimeUpdate(parsed.time, parsed.duration);
        }
        if (typeof parsed.duration === 'number' && parsed.duration > 0) {
          onDurationChange(parsed.duration);
        }
        if (parsed.event === 'play') onStateChange(true, false);
        if (parsed.event === 'pause') onStateChange(false, false);
        if (parsed.event === 'end') onEnded();
      } catch {
        // Ignore
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <iframe
      ref={iframeRef}
      id="dailymotion-player-frame"
      src={sourceInfo.embedUrl}
      className="w-full h-full border-0 bg-black"
      allow="autoplay; fullscreen"
      allowFullScreen
      title={sourceInfo.title}
    />
  );
};
