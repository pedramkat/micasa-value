"use client";

import { useState } from "react";
import { ClipboardCopy } from "lucide-react";

interface CodeBlockProps {
  code: string;
}

export function CodeBlock({ code }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <div className="relative rounded-md overflow-hidden bg-card text-card-foreground ring-1 ring-border">
      <div className="flex items-center justify-between px-4 py-2 bg-muted">
        <span className="text-xs text-muted-foreground">Terminal</span>
        <button
          onClick={copyToClipboard}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Copy to clipboard"
        >
          {copied ? (
            <span className="text-emerald-600 text-xs">Copied!</span>
          ) : (
            <ClipboardCopy size={16} />
          )}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-sm">
        <code>{code}</code>
      </pre>
    </div>
  );
}