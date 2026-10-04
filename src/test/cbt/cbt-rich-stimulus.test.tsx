import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MathRenderer } from "@/shared/components/cbt/math-renderer";
import { AudioStimulusPlayer } from "@/shared/components/cbt/audio-stimulus-player";
import { ImageStimulus } from "@/shared/components/cbt/image-stimulus";

describe("CBT Rich Stimulus & Multi-Format Engine", () => {
  describe("MathRenderer & Arabic RTL", () => {
    it("renders plain text correctly", () => {
      const { container } = render(<MathRenderer content="Berapakah hasil dari 2 + 2?" />);
      expect(container.textContent).toContain("Berapakah hasil dari 2 + 2?");
    });

    it("renders KaTeX inline math without crashing", () => {
      const { container } = render(<MathRenderer content="Tentukan nilai $x^2 + 5 = 9$" />);
      // KaTeX generates spans with class katex
      expect(container.querySelector(".katex")).not.toBeNull();
    });

    it("renders KaTeX block math without crashing", () => {
      const { container } = render(
        <MathRenderer content="Hitunglah integral berikut:\n$$\\int_{0}^{1} x \\, dx$$" />
      );
      expect(container.querySelector(".katex-display")).not.toBeNull();
    });

    it("detects Arabic text and applies dir='rtl' attribute", () => {
      const arabicText = "ما هي عاصمة إندونيسيا؟";
      const { container } = render(<MathRenderer content={arabicText} />);
      const elWithRtl = container.querySelector('[dir="rtl"]');
      expect(elWithRtl).not.toBeNull();
      expect(container.textContent).toContain("ما هي عاصمة إندونيسيا؟");
    });
  });

  describe("AudioStimulusPlayer", () => {
    it("renders player with initial remaining play count badge", () => {
      render(
        <AudioStimulusPlayer
          src="https://example.com/audio/listening-test.mp3"
          maxPlayCount={2}
          title="Section Listening Dialogue"
        />
      );

      expect(screen.getByText("Section Listening Dialogue")).toBeDefined();
      expect(screen.getByText("Sisa Putar: 2x")).toBeDefined();
    });

    it("disables play button when remaining plays reach 0", () => {
      render(
        <AudioStimulusPlayer
          src="https://example.com/audio/listening-test.mp3"
          maxPlayCount={0}
          title="Exhausted Audio"
        />
      );

      expect(screen.getByText("Batas Habis (0x)")).toBeDefined();
      const playBtn = screen.getByTitle("Batas Pemutaran Habis");
      expect(playBtn).toBeDefined();
      expect(playBtn.getAttribute("disabled")).not.toBeNull();
    });
  });

  describe("ImageStimulus", () => {
    it("renders thumbnail image with zoom cue", () => {
      render(
        <ImageStimulus
          src="https://example.com/images/diagram.png"
          alt="Diagram Biologi Sel"
          caption="Gambar 1.1 Struktur Sel"
        />
      );

      const img = screen.getByAltText("Diagram Biologi Sel");
      expect(img).toBeDefined();
      expect(screen.getByText("Gambar 1.1 Struktur Sel")).toBeDefined();
    });

    it("opens fullscreen lightbox modal on thumbnail click", () => {
      render(
        <ImageStimulus src="https://example.com/images/diagram.png" alt="Diagram Biologi Sel" />
      );

      const thumbnail = screen.getByAltText("Diagram Biologi Sel");
      fireEvent.click(thumbnail);

      // Lightbox has close button with title "Tutup (Esc)"
      expect(screen.getByTitle("Tutup (Esc)")).toBeDefined();
    });
  });
});
