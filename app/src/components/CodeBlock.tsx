import React, { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

type CodeBlockProps = {
  code: string;
  language?: string; // "python" by default
  className?: string;
};

export default function CodeBlock({
  code,
  language = "python",
  className = "",
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      // navigator.clipboard is the preferred API
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        // fallback
        const ta = document.createElement("textarea");
        ta.value = code;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Copy failed", err);
    }
  }

  return (
    <div
      className={
        "relative rounded-2xl overflow-hidden shadow-lg " +
        "bg-[#0b0f14] border border-[#1f2937] " +
        "text-sm " +
        className
      }
    >
      {/* Copy button (top-right) */}
      <div className="absolute right-3 top-3 z-10">
        <button
          onClick={handleCopy}
          aria-label="Copy code"
          className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-black/40 backdrop-blur-sm border border-white/10 hover:brightness-110 focus:outline-none"
        >
          <span className="text-xs text-white/90">Copy</span>
        </button>
      </div>

      {/* Optional "Copied!" badge (appears near the button) */}
      {copied && (
        <div className="absolute right-3 top-12 z-20">
          <div className="px-2 py-1 rounded-md bg-white/10 text-xs text-white">
            Copied!
          </div>
        </div>
      )}

      {/* Syntax highlighter content */}
      <div className="pt-6 pb-6 px-6">
        <SyntaxHighlighter
          language={language}
          style={oneDark}
          customStyle={{
            background: "transparent", // keep parent's bg
            margin: 0,
            padding: 0,
            fontSize: 13,
            lineHeight: "1.45",
          }}
          showLineNumbers={false}
          wrapLines={true}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
