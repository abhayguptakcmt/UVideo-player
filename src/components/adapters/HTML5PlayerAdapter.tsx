import React, { useEffect, useRef } from 'react';
import { VideoSourceInfo, PlayerState } from '../../types';

interface HTML5PlayerAdapterProps {
  sourceInfo: VideoSourceInfo;
  playerState: PlayerState;
  isDubbingActive?: boolean;
  onTimeUpdate: (currentTime: number, duration?: number) => void;
  onDurationChange: (duration: number) => void;
  onStateChange: (isPlaying: boolean, isBuffering?: boolean) => void;
  onProgress: (bufferedTime: number) => void;
  onEnded: () => void;
  onError: (msg: string) => void;
  seekCommand: number | null;
  onSeekHandled: () => void;
}

export const HTML5PlayerAdapter: React.FC<HTML5PlayerAdapterProps> = ({
  sourceInfo,
  playerState,
  isDubbingActive = false,
  onTimeUpdate,
  onDurationChange,
  onStateChange,
  onProgress,
  onEnded,
  onError,
  seekCommand,
  onSeekHandled
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Helper to strictly enforce zero volume and muting when AI Dubbing is active
  const enforceBleedThroughProtection = () => {
    if (videoRef.current && isDubbingActive) {
      if (videoRef.current.volume !== 0) {
        videoRef.current.volume = 0;
      }
      if (!videoRef.current.muted) {
        videoRef.current.muted = true;
      }
    }
  };

  // Play / Pause synchronization & high-precision frame loop
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let animFrame: number | null = null;
    const loop = () => {
      if (video && !video.paused) {
        enforceBleedThroughProtection();
        onTimeUpdate(video.currentTime, video.duration);
        animFrame = requestAnimationFrame(loop);
      }
    };

    if (playerState.isPlaying && video.paused) {
      video.play().then(() => {
        enforceBleedThroughProtection();
        animFrame = requestAnimationFrame(loop);
      }).catch((err) => {
        console.warn('Autoplay prevented or interrupted', err);
      });
    } else if (!playerState.isPlaying && !video.paused) {
      video.pause();
    } else if (playerState.isPlaying && !video.paused) {
      animFrame = requestAnimationFrame(loop);
    }

    return () => {
      if (animFrame !== null) {
        cancelAnimationFrame(animFrame);
      }
    };
  }, [playerState.isPlaying, isDubbingActive, onTimeUpdate]);

  // Seek command synchronization
  useEffect(() => {
    if (seekCommand !== null && videoRef.current) {
      videoRef.current.currentTime = seekCommand;
      enforceBleedThroughProtection();
      onSeekHandled();
    }
  }, [seekCommand, onSeekHandled]);

  // Volume & Mute synchronization - Strict 0-volume hardware clamping when dubbing is enabled
  useEffect(() => {
    if (videoRef.current) {
      if (isDubbingActive) {
        // Enforce strict zero volume to ensure absolutely zero bleed-through from native audio
        videoRef.current.volume = 0;
        videoRef.current.muted = true;
      } else {
        videoRef.current.volume = playerState.isMuted ? 0 : playerState.volume;
        videoRef.current.muted = playerState.isMuted;
      }
    }
  }, [playerState.volume, playerState.isMuted, isDubbingActive]);

  // Playback Rate synchronization
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playerState.playbackRate;
    }
  }, [playerState.playbackRate]);

  // PIP synchronization
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !('requestPictureInPicture' in video)) return;

    if (playerState.isPip && document.pictureInPictureElement !== video) {
      video.requestPictureInPicture().catch(() => {});
    } else if (!playerState.isPip && document.pictureInPictureElement === video) {
      document.exitPictureInPicture().catch(() => {});
    }
  }, [playerState.isPip]);

  return (
    <video
      ref={videoRef}
      id="html5-video-player"
      src={sourceInfo.embedUrl}
      className="w-full h-full object-contain bg-black"
      playsInline
      autoPlay
      controls={false}
      muted={isDubbingActive ? true : playerState.isMuted}
      onLoadedMetadata={() => {
        enforceBleedThroughProtection();
        if (videoRef.current) {
          const dur = videoRef.current.duration;
          if (dur && !isNaN(dur) && dur > 0) {
            onDurationChange(dur);
          }
        }
      }}
      onDurationChange={() => {
        enforceBleedThroughProtection();
        if (videoRef.current && videoRef.current.duration > 0) {
          onDurationChange(videoRef.current.duration);
        }
      }}
      onTimeUpdate={() => {
        enforceBleedThroughProtection();
        if (videoRef.current) {
          onTimeUpdate(videoRef.current.currentTime, videoRef.current.duration);
        }
      }}
      onProgress={() => {
        if (videoRef.current && videoRef.current.buffered.length > 0) {
          const bufferedEnd = videoRef.current.buffered.end(
            videoRef.current.buffered.length - 1
          );
          onProgress(bufferedEnd);
        }
      }}
      onPlay={() => {
        enforceBleedThroughProtection();
        onStateChange(true, false);
      }}
      onPause={() => onStateChange(false, false)}
      onWaiting={() => onStateChange(playerState.isPlaying, true)}
      onPlaying={() => {
        enforceBleedThroughProtection();
        onStateChange(true, false);
      }}
      onEnded={onEnded}
      onError={(e) => {
        console.error('HTML5 video playback error:', e);
        const code = videoRef.current?.error?.code;
        let msg = 'Unable to play video stream. Please check file format and network connectivity.';
        if (code === 4) {
          msg = 'Video stream inaccessible or blocked by remote host (HTTP 403/404). Please try another source.';
        }
        onError(msg);
      }}
    />
  );
};
