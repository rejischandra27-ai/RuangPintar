"use client";

import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, AlertCircle, Headphones } from "lucide-react";

interface AudioStimulusPlayerProps {
  src: string;
  maxPlayCount?: number;
  title?: string;
  allowScrubbing?: boolean;
  onFinishedAllPlays?: () => void;
}

export function AudioStimulusPlayer({
  src,
  maxPlayCount = 2,
  title = "Audio Listening Stimulus",
  allowScrubbing = false,
  onFinishedAllPlays,
}: AudioStimulusPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [remainingPlays, setRemainingPlays] = useState(maxPlayCount);
  const [isMuted, setIsMuted] = useState(false);
  const [hasStartedThisTrack, setHasStartedThisTrack] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      setHasStartedThisTrack(false);
      setRemainingPlays((prev) => {
        const next = Math.max(0, prev - 1);
        if (next === 0 && onFinishedAllPlays) {
          onFinishedAllPlays();
        }
        return next;
      });
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [onFinishedAllPlays]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      if (remainingPlays <= 0) return;
      if (!hasStartedThisTrack) {
        setHasStartedThisTrack(true);
      }
      audio.play().catch(() => {
        setIsPlaying(false);
      });
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const isExhausted = remainingPlays === 0 && !isPlaying;

  return (
    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Header Info & Play Counter Badge */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 shrink-0">
            <Headphones className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
              {title}
            </h5>
            <p className="text-[10px] text-slate-500 font-mono">Format Audio Berstandar Ujian</p>
          </div>
        </div>

        {/* Counter Pill */}
        <div
          className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold flex items-center gap-1.5 shrink-0 border ${
            isExhausted
              ? "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/50 dark:border-red-900"
              : remainingPlays === 1
                ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:border-amber-900"
                : "bg-blue-50 text-[#2563EB] border-blue-200 dark:bg-blue-950/50 dark:border-blue-900"
          }`}
        >
          {isExhausted ? (
            <>
              <AlertCircle className="h-3 w-3" />
              <span>Batas Habis (0x)</span>
            </>
          ) : (
            <span>Sisa Putar: {remainingPlays}x</span>
          )}
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={togglePlay}
          disabled={isExhausted}
          className={`p-2.5 rounded-xl font-bold transition-all flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
            isPlaying
              ? "bg-amber-500 hover:bg-amber-600 text-white shadow-xs"
              : "bg-[#2563EB] hover:bg-blue-700 text-white shadow-xs shadow-blue-500/20"
          }`}
          title={isPlaying ? "Jeda Audio" : isExhausted ? "Batas Pemutaran Habis" : "Putar Audio"}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
        </button>

        {/* Progress Bar & Time */}
        <div className="flex-1 space-y-1">
          <div className="relative w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <div
              className="absolute left-0 top-0 bottom-0 bg-[#2563EB] transition-all duration-150"
              style={{ width: `${progressPercent}%` }}
            />
            {allowScrubbing && (
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={(e) => {
                  if (audioRef.current) {
                    audioRef.current.currentTime = Number(e.target.value);
                  }
                }}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
            )}
          </div>
          <div className="flex justify-between text-[10px] font-mono text-slate-500">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Volume Mute Toggle */}
        <button
          type="button"
          onClick={toggleMute}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          title={isMuted ? "Bunyikan" : "Senyapkan"}
        >
          {isMuted ? <VolumeX className="h-4 w-4 text-red-500" /> : <Volume2 className="h-4 w-4" />}
        </button>
      </div>

      {/* Warning Notice if play count is strictly enforced */}
      {!allowScrubbing && (
        <p className="text-[10px] text-slate-400 font-mono italic">
          * Catatan: Audio tidak dapat digeser (scrubbing dinonaktifkan) untuk menjaga validitas
          ujian listening.
        </p>
      )}
    </div>
  );
}
