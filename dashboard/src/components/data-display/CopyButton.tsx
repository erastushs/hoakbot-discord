import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

import { IconButton } from '../base/IconButton.js';

export interface CopyButtonProps {
  label?: string;
  value: string;
}

export function CopyButton({ label = 'Copy to clipboard', value }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function copyValue() {
    await navigator.clipboard?.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <IconButton label={copied ? 'Copied' : label} onClick={() => void copyValue()} variant="ghost">
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </IconButton>
  );
}
