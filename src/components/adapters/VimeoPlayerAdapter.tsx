import React, { useEffect, useRef } from 'react';
import { VideoSourceInfo, PlayerState } from '../../types';

interface VimeoPlayerAdapterProps {
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

export const VimeoPlayerAdapter: React.FC<VimeoPlayerAdapterProps> = ({
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

  const postToVimeo = (method: string, value?: any) => {
    if (!iframeRef.current || !iframeRef.current.contentWindow) return;
    try {
      const data: any = { method };
      if (value !== undefined) data.value = value;
      iframeRef.current.contentWindow.postMessage(JSON.stringify(data), '*');
    } catch (e) {
      console.warn('Vimeo postMessage error', e);
    }
  };

  useEffect(() => {
    if (playerState.isPlaying) {
      postToVimeo('play');
    } else {
      postToVimeo('pause');
    }
  }, [playerState.isPlaying]);

  useEffect(() => {
    if (seekCommand !== null) {
      postToVimeo('seekTo', seekCommand);
      onSeekHandled();
    }
  }, [seekCommand, onSeekHandled]);

  useEffect(() => {
    postToVimeo('setVolume', isDubbingActive || playerState.isMuted ? 0 : playerState.volume);
  }, [playerState.volume, playerState.isMuted, isDubbingActive]);

  useEffect(() => {
    postToVimeo('setPlaybackRate', playerState.playbackRate);
  }, [playerState.playbackRate]);

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (!e.data) return;
      let data: any = null;
      try {
        data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
      } catch {
        return;
      }

      if (!data) return;

      if (data.event === 'ready') {
        postToVimeo('addEventListener', 'timeupdate');
        postToVimeo('addEventListener', 'play');
        postToVimeo('addEventListener', 'pause');
        postToVimeo('addEventListener', 'ended');
      }

      if (data.event === 'timeupdate' && data.data) {
        if (typeof data.data.seconds === 'number') {
          onTimeUpdate(data.data.seconds, data.data.duration);
        }
        if (typeof data.data.duration === 'number' && data.data.duration > 0) {
          onDurationChange(data.data.duration);
        }
      }

      if (data.event === 'play') onStateChange(true, false);
      if (data.event === 'pause') onStateChange(false, false);
      if (data.event === 'ended') onEnded();
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <iframe
      ref={iframeRef}
      id="vimeo-player-frame"
      src={sourceInfo.embedUrl}
      className="w-full h-full border-0 bg-black"
      allow="autoplay; fullscreen; picture-in-picture"
      allowFullScreen
      title={sourceInfo.title}
    />
  );
};
