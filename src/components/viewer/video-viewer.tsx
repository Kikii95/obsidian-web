"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Download,
  Maximize,
  Minimize,
  Volume2,
  VolumeX,
  Play,
  Pause,
} from "lucide-react";

interface VideoViewerProps {
  content: string; // Base64 encoded
  mimeType: string;
  fileName: string;
}

export function VideoViewer({ content, mimeType, fileName }: VideoViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const dataUrl = `data:${mimeType};base64,${content}`;

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleFullscreen = async () => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      try {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } catch (err) {
        console.error("Fullscreen failed:", err);
      }
    } else {
      try {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } catch (err) {
        console.error("Exit fullscreen failed:", err);
      }
    }
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = fileName;
    link.click();
  };

  // Listen for fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="h-full w-full flex flex-col bg-black/95"
    >
      {/* Video container */}
      <div className="flex-1 flex items-center justify-center min-h-0 p-4">
        <video
          ref={videoRef}
          src={dataUrl}
          className="max-h-full max-w-full rounded-lg shadow-2xl"
          controls
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onVolumeChange={(e) => setIsMuted(e.currentTarget.muted)}
        >
          Votre navigateur ne supporte pas la lecture vidéo.
        </video>
      </div>

      {/* Controls bar */}
      <div className="shrink-0 flex items-center justify-between gap-4 px-4 py-3 bg-black/80 border-t border-white/10">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePlayPause}
            className="text-white hover:bg-white/20"
          >
            {isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleMute}
            className="text-white hover:bg-white/20"
          >
            {isMuted ? (
              <VolumeX className="h-5 w-5" />
            ) : (
              <Volume2 className="h-5 w-5" />
            )}
          </Button>
        </div>

        <span className="text-sm text-white/70 truncate flex-1 text-center">
          {fileName}
        </span>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleFullscreen}
            className="text-white hover:bg-white/20"
          >
            {isFullscreen ? (
              <Minimize className="h-5 w-5" />
            ) : (
              <Maximize className="h-5 w-5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDownload}
            className="text-white hover:bg-white/20"
          >
            <Download className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
