"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
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
  const containerRef = useRef<HTMLDivElement>(null);
  const isUnmountingRef = useRef(false);

  // Clean up Plyr synchronously before React removes DOM nodes
  useLayoutEffect(() => {
    // Reset unmounting flag on mount
    isUnmountingRef.current = false;
    
    return () => {
      isUnmountingRef.current = true;
      // Destroy Plyr synchronously in layout phase before React removes nodes
      if (playerRef.current) {
        try {
          if (typeof playerRef.current.destroy === "function") {
            // Get the target element before destroying
            const targetEl = videoType === "YOUTUBE" ? youtubeEmbedRef.current : html5VideoRef.current;
            // Only destroy if element still exists and is in DOM
            if (targetEl && targetEl.parentNode) {
              playerRef.current.destroy();
            }
          }
        } catch (error) {
          // Silently ignore - Plyr may have already cleaned up
        }
        playerRef.current = null;
      }
    };
  }, [videoType]);

  // Initialize Plyr on mount/update
  useEffect(() => {
    let isCancelled = false;
    
    // Reset unmounting flag when effect runs
    isUnmountingRef.current = false;

    async function setupPlayer() {
      // Don't setup if component is unmounting
      if (isUnmountingRef.current || isCancelled) return;

      const targetEl =
        videoType === "YOUTUBE" ? youtubeEmbedRef.current : html5VideoRef.current;
      if (!targetEl) return;

      // Dynamically import Plyr to be SSR-safe
      const plyrModule: any = await import("plyr");
      const Plyr: any = plyrModule.default ?? plyrModule;

      if (isCancelled || isUnmountingRef.current) return;

      // Destroy any previous instance safely
      if (playerRef.current && typeof playerRef.current.destroy === "function") {
        try {
          const prevTargetEl = videoType === "YOUTUBE" ? youtubeEmbedRef.current : html5VideoRef.current;
          if (prevTargetEl && prevTargetEl.parentNode) {
            playerRef.current.destroy();
          }
        } catch (error) {
          // Ignore errors during cleanup
        }
        playerRef.current = null;
      }

      // Small delay to ensure DOM is ready
      await new Promise(resolve => setTimeout(resolve, 10));

      if (isCancelled || isUnmountingRef.current || !targetEl.parentNode) return;

      try {
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

        if (!isCancelled && !isUnmountingRef.current) {
          playerRef.current = player;

          if (onEnded) player.on("ended", onEnded);
          if (onTimeUpdate)
            player.on("timeupdate", () => onTimeUpdate(player.currentTime || 0));
        } else {
          // Component unmounted during setup, destroy immediately
          try {
            player.destroy();
          } catch (error) {
            // Ignore
          }
        }
      } catch (error) {
        console.error("Plyr setup error:", error);
      }
    }

    setupPlayer();

    return () => {
      isCancelled = true;
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
    <div ref={containerRef} className={`aspect-video ${className || ""}`} key={`player-${videoType}-${videoUrl || youtubeVideoId}`}>
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
        <video 
          ref={html5VideoRef} 
          className="w-full h-full" 
          playsInline 
          crossOrigin="anonymous"
          preload="metadata"
          key={videoUrl}
        >
          {videoUrl ? (
            <>
              <source src={videoUrl} type="video/mp4" />
              <source src={videoUrl} type="video/webm" />
              <source src={videoUrl} type="video/ogg" />
              Your browser does not support the video tag.
            </>
          ) : null}
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