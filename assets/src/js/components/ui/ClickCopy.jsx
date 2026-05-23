import { useState } from 'react';
import { CopyIcon, CheckIcon } from '../icons';

export function ClickCopy({ text, label, className = '' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {}
  };

  return (
    <button onClick={handleCopy} className={`flex items-center gap-1 hover:text-white/70 transition-colors ${className}`}>
      <span className="truncate">{label !== undefined ? label : text}</span>
      {copied ? <CheckIcon className="w-3 h-3 text-green-500 shrink-0" /> : <CopyIcon className="w-3 h-3 shrink-0" />}
    </button>
  );
}