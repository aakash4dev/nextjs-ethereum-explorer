'use client';
import { useState } from 'react';
import { FaCheck, FaRegCopy } from 'react-icons/fa';

export default function CopyButton({ value, label = 'Copy to clipboard', className = '' }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(String(value));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable (insecure context) */
    }
  };
  return (
    <button type="button" onClick={copy} title={copied ? 'Copied!' : label} aria-label={label} className={`inline-flex shrink-0 items-center text-muted transition-colors hover:text-primary ${className}`}>
      {copied ? <FaCheck className="h-3.5 w-3.5 text-success" /> : <FaRegCopy className="h-3.5 w-3.5" />}
    </button>
  );
}
