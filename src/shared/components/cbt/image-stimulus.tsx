"use client";

import React, { useState } from "react";
import Image from "next/image";
import { ZoomIn, X } from "lucide-react";

interface ImageStimulusProps {
  src: string;
  alt?: string;
  caption?: string;
  className?: string;
}

export function ImageStimulus({
  src,
  alt = "Stimulus Soal Ujian",
  caption,
  className = "",
}: ImageStimulusProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!src) return null;

  return (
    <>
      <div className={`relative my-2.5 inline-block group ${className}`}>
        <div
          onClick={() => setIsOpen(true)}
          className="relative max-w-md max-h-80 rounded-xl overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 cursor-zoom-in transition-all group-hover:shadow-md"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className="w-full h-auto max-h-80 object-contain rounded-xl"
            loading="lazy"
          />
          {/* Overlay hover cue */}
          <div className="absolute inset-0 bg-slate-900/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="px-2.5 py-1 rounded-full bg-black/70 text-white text-[11px] font-mono font-medium flex items-center gap-1.5 backdrop-blur-xs">
              <ZoomIn className="h-3.5 w-3.5" />
              Perbesar Gambar
            </span>
          </div>
        </div>

        {caption && (
          <p className="text-[11px] text-slate-500 font-mono mt-1 text-center italic">{caption}</p>
        )}
      </div>

      {/* Lightbox Fullscreen Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute -top-12 right-0 p-2 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors cursor-pointer"
              title="Tutup (Esc)"
            >
              <X className="h-6 w-6" />
            </button>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt}
              className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl border border-white/10"
            />

            {caption && (
              <p className="text-white/80 font-mono text-xs mt-3 text-center bg-black/50 px-4 py-1.5 rounded-full">
                {caption}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
