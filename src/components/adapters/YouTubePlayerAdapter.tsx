import React, { useEffect, useRef } from 'react';
import { VideoSourceInfo, PlayerState } from '../../types';

interface YouTubePlayerAdapterProps {
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

export const YouTubePlayerAdapter: React.FC<YouTubePlayerAdapterProps> = ({
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
  const currentTimeRef = useRef<number>(playerState.currentTime);
  const isPlayingRef = useRef<boolean>(playerState.isPlaying);

  currentTimeRef.current = playerState.currentTime;
  isPlayingRef.current = playerState.isPlaying;

  const sendCommand = (func: string, args: any[] = []) => {
    if (!iframeRef.current || !iframeRef.current.contentWindow) return;
    try {
      const message = JSON.stringify({
        event: 'command',
        func,
        args
      });
      iframeRef.current.contentWindow.postMessage(message, '*');
    } catch (e) {
      console.warn('YouTube postMessage error', e);
    }
  };

  // Play / Pause synchronization
  useEffect(() => {
    if (playerState.isPlaying) {
      sendCommand('playVideo');
    } else {
      sendCommand('pauseVideo');
    }
  }, [playerState.isPlaying]);

  // Seek synchronization
  useEffect(() => {
    if (seekCommand !== null) {
      sendCommand('seekTo', [seekCommand, true]);
      onSeekHandled();
    }
  }, [seekCommand, onSeekHandled]);

  // Volume & Mute synchronization
  useEffect(() => {
    if (isDubbingActive || playerState.isMuted || playerState.volume === 0) {
      sendCommand('mute');
      sendCommand('setVolume', [0]);
    } else {
      sendCommand('unMute');
      sendCommand('setVolume', [Math.max(5, Math.round(playerState.volume * 100))]);
    }
  }, [playerState.volume, playerState.isMuted, isDubbingActive]);

  // Playback Rate synchronization
  useEffect(() => {
    sendCommand('setPlaybackRate', [playerState.playbackRate]);
  }, [playerState.playbackRate]);

  // PostMessage listener for YouTube events
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data) return;

      let data: any = null;
      if (typeof event.data === 'string') {
        try {
          data = JSON.parse(event.data);
        } catch {
          return;
        }
      } else if (typeof event.data === 'object') {
        data = event.data;
      }

      if (!data) return;

      // YouTube API delivery
      if (data.event === 'infoDelivery' && data.info) {
        const info = data.info;
        if (typeof info.currentTime === 'number') {
          onTimeUpdate(info.currentTime, info.duration);
        }
        if (typeof info.duration === 'number' && info.duration > 0) {
          onDurationChange(info.duration);
        }
        if (typeof info.playerState === 'number') {
          // -1: unstarted, 0: ended, 1: playing, 2: paused, 3: buffering, 5: video cued
          if (info.playerState === 1) {
            onStateChange(true, false);
          } else if (info.playerState === 2) {
            onStateChange(false, false);
          } else if (info.playerState === 3) {
            onStateChange(isPlayingRef.current, true);
          } else if (info.playerState === 0) {
            onEnded();
          }
        }
      }

      // Initial onReady / listening handshake
      if (data.event === 'onReady') {
        sendCommand('addEventListener', ['onStateChange']);
        sendCommand('setVolume', [Math.round(playerState.volume * 100)]);
      }
    };

    window.addEventListener('message', handleMessage);

    // Initial handshake ping
    const pingInterval = setInterval(() => {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'listening' }),
          '*'
        );
      }
    }, 1000);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearInterval(pingInterval);
    };
  }, []);

  return (
    <iframe
      ref={iframeRef}
      id="youtube-player-frame"
      src={sourceInfo.embedUrl}
      className="w-full h-full border-0 bg-black"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
      title={sourceInfo.title}
    />
  );
};
