'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

interface ReadableIdProps {
  id: string
  className?: string
}

export function ReadableId({ id, className = '' }: ReadableIdProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 font-mono text-xs bg-[#F1F5F9] text-[#0F172A] px-2 py-1 rounded-md hover:bg-[#E2E8F0] transition-colors ${className}`}
    >
      {id}
      {copied
        ? <Check className="w-3 h-3 text-green-600" />
        : <Copy className="w-3 h-3 text-[#64748B]" />
      }
    </button>
  )
}