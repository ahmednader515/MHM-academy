"use client";

import { useEffect, useRef } from "react";
import "plyr/dist/plyr.css";

interface PlyrVideoPlayerProps {
  videoUrl?: string;
  youtubeVideoId?: string;
  videoType?: "UPLOAD" | "YOUTUBE";
  className?: string;
  onEnded?: () => void;
  onTimeUpdate?: (currentTime: number) => void;
}

export const PlyrVideoPlayer = ({
  videoUrl,
  youtubeVideoId,
  videoType = "UPLOAD",
  className,
  onEnded,
  onTimeUpdate
}: PlyrVideoPlayerProps) => {
  const html5VideoRef = useRef<HTMLVideoElement>(null);
  const youtubeEmbedRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);

  // Initialize Plyr on mount/update and destroy on unmount
  useEffect(() => {
    let isCancelled = false;

    async function setupPlayer() {
      const targetEl =
        videoType === "YOUTUBE" ? youtubeEmbedRef.current : html5VideoRef.current;
      if (!targetEl) return;

      // Dynamically import Plyr to be SSR-safe
      const plyrModule: any = await import("plyr");
      const Plyr: any = plyrModule.default ?? plyrModule;

      if (isCancelled) return;

      // Destroy any previous instance
      if (playerRef.current && typeof playerRef.current.destroy === "function") {
        playerRef.current.destroy();
        playerRef.current = null;
      }

      const player = new Plyr(targetEl, {
        controls: [
          "play-large",
          "play",
          "progress",
          "current-time",
          "duration",
          "mute",
          "volume",
          "captions",
          "settings",
          "pip",
          "airplay",
          "fullscreen"
        ],
        settings: ["speed", "quality", "loop"],
        speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
        youtube: { 
          rel: 0, 
          modestbranding: 1,
          controls: 0,
          showinfo: 0,
          iv_load_policy: 3,
          fs: 0,
          disablekb: 1,
          noCookie: true,
          cc_load_policy: 0,
          playsinline: 1
        },
        ratio: "16:9"
      });

      playerRef.current = player;

      if (onEnded) player.on("ended", onEnded);
      if (onTimeUpdate)
        player.on("timeupdate", () => onTimeUpdate(player.currentTime || 0));
    }

    setupPlayer();

    return () => {
      isCancelled = true;
      if (playerRef.current && typeof playerRef.current.destroy === "function") {
        playerRef.current.destroy();
      }
      playerRef.current = null;
    };
  }, [videoUrl, youtubeVideoId, videoType, onEnded, onTimeUpdate]);

  const hasVideo = (videoType === "YOUTUBE" && !!youtubeVideoId) || !!videoUrl;

  if (!hasVideo) {
    return (
      <div className={`aspect-video bg-muted rounded-lg flex items-center justify-center ${className || ""}`}>
        <div className="text-muted-foreground">لا يوجد فيديو</div>
      </div>
    );
  }

  return (
    <div className={`aspect-video ${className || ""}`}>
      {videoType === "YOUTUBE" && youtubeVideoId ? (
        <div
          ref={youtubeEmbedRef}
          data-plyr-provider="youtube"
          data-plyr-embed-id={youtubeVideoId}
          className="w-full h-full"
          style={{
            position: 'relative',
            pointerEvents: 'auto'
          }}
        />
      ) : (
        <video ref={html5VideoRef} className="w-full h-full" playsInline crossOrigin="anonymous">
          {videoUrl ? <source src={videoUrl} type="video/mp4" /> : null}
        </video>
      )}
      <style jsx global>{`
        /* Hide YouTube logo and controls overlay */
        .plyr__video-embed iframe {
          pointer-events: none;
        }
        .plyr__video-embed {
          pointer-events: auto;
        }
        .plyr__controls {
          pointer-events: auto !important;
        }
        /* Hide YouTube branding */
        .ytp-chrome-top,
        .ytp-show-cards-title,
        .ytp-watermark,
        .ytp-gradient-top,
        .ytp-chrome-top-buttons {
          display: none !important;
        }
      `}</style>
    </div>
  );
};