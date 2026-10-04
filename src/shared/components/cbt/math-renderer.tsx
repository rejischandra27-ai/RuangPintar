"use client";

import React, { useMemo } from "react";
import katex from "katex";

interface MathRendererProps {
  content: string;
  className?: string;
  isArabic?: boolean;
}

/**
 * MathRenderer — Merender teks campuran dengan rumus LaTeX / KaTeX ($...$ atau $$...$$)
 * dan mendukung orientasi teks Arab (RTL) secara otomatis atau eksplisit.
 */
export function MathRenderer({ content, className = "", isArabic = false }: MathRendererProps) {
  // Deteksi otomatis jika teks mengandung karakter Arab
  const hasArabicChars = useMemo(() => {
    return (
      isArabic ||
      /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(content)
    );
  }, [content, isArabic]);

  // Parser teks yang memisahkan antara teks biasa, inline math ($...$), dan block math ($$...$$)
  const renderedElements = useMemo(() => {
    if (!content) return null;

    // Regex untuk memisahkan $$block$$ dan $inline$
    const parts: React.ReactNode[] = [];
    const regex = /(\$\$[\s\S]+?\$\$|\$[^\$\n]+?\$)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    let keyIdx = 0;

    while ((match = regex.exec(content)) !== null) {
      // Teks sebelum rumus
      if (match.index > lastIndex) {
        const textBefore = content.substring(lastIndex, match.index);
        parts.push(
          <span key={`text-${keyIdx++}`} className="whitespace-pre-wrap">
            {textBefore}
          </span>
        );
      }

      const mathStr = match[0];
      const isBlock = mathStr.startsWith("$$") && mathStr.endsWith("$$");
      const latex = isBlock ? mathStr.slice(2, -2).trim() : mathStr.slice(1, -1).trim();

      try {
        const html = katex.renderToString(latex, {
          displayMode: isBlock,
          throwOnError: false,
          output: "htmlAndMathml",
        });

        parts.push(
          <span
            key={`math-${keyIdx++}`}
            dangerouslySetInnerHTML={{ __html: html }}
            className={
              isBlock
                ? "block my-2 text-center overflow-x-auto py-1"
                : "inline-block px-1 align-baseline"
            }
          />
        );
      } catch {
        // Fallback jika terjadi error sintaks LaTeX
        parts.push(
          <code
            key={`math-err-${keyIdx++}`}
            className="text-red-500 bg-red-50 px-1 rounded text-xs font-mono"
          >
            {mathStr}
          </code>
        );
      }

      lastIndex = regex.lastIndex;
    }

    // Sisa teks setelah rumus terakhir
    if (lastIndex < content.length) {
      parts.push(
        <span key={`text-${keyIdx++}`} className="whitespace-pre-wrap">
          {content.substring(lastIndex)}
        </span>
      );
    }

    return parts;
  }, [content]);

  return (
    <div
      dir={hasArabicChars ? "rtl" : "ltr"}
      className={`leading-relaxed ${
        hasArabicChars
          ? "font-serif text-lg leading-loose text-right antialiased"
          : "text-slate-800 dark:text-slate-200"
      } ${className}`}
    >
      {renderedElements}
    </div>
  );
}
