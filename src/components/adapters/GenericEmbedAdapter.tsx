import React, { useEffect, useRef } from 'react';
import { VideoSourceInfo, PlayerState } from '../../types';

interface GenericEmbedAdapterProps {
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

export const GenericEmbedAdapter: React.FC<GenericEmbedAdapterProps> = ({
  sourceInfo,
  playerState,
  onTimeUpdate,
  onDurationChange,
  onStateChange,
  onEnded,
  onError,
  seekCommand,
  onSeekHandled
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const internalTimeRef = useRef<number>(playerState.currentTime);
  internalTimeRef.current = playerState.currentTime;

  // Handle seek command
  useEffect(() => {
    if (seekCommand !== null) {
      internalTimeRef.current = seekCommand;
      onTimeUpdate(seekCommand, playerState.duration);
      onSeekHandled();
    }
  }, [seekCommand, onSeekHandled]);

  // Set initial duration if provided in sourceInfo
  useEffect(() => {
    if (sourceInfo.duration && sourceInfo.duration > 0) {
      onDurationChange(sourceInfo.duration);
    } else if (playerState.duration <= 0) {
      // Default to 180s estimate for generic embeds if unknown
      onDurationChange(180);
    }
  }, [sourceInfo.duration]);

  // Timeline progression timer when playing
  useEffect(() => {
    if (!playerState.isPlaying) return;

    const interval = setInterval(() => {
      const nextTime =
        internalTimeRef.current + 0.25 * playerState.playbackRate;

      if (playerState.duration > 0 && nextTime >= playerState.duration) {
        internalTimeRef.current = playerState.duration;
        onTimeUpdate(playerState.duration, playerState.duration);
        onEnded();
      } else {
        internalTimeRef.current = nextTime;
        onTimeUpdate(nextTime, playerState.duration);
      }
    }, 250);

    return () => clearInterval(interval);
  }, [playerState.isPlaying, playerState.playbackRate, playerState.duration]);

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center">
      <iframe
        ref={iframeRef}
        id="generic-embed-player-frame"
        src={sourceInfo.embedUrl}
        className="w-full h-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        title={sourceInfo.title}
        onError={() => {
          onError(
            'Failed to load video embed. The source may restrict cross-origin framing.'
          );
        }}
      />
    </div>
  );
};
