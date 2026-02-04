'use client'

import { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'

interface ChatInputProps {
  input: string
  isLoading: boolean
  onInputChange: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
}

/**
 * ChatInput - Premium expandable input with keyboard hints
 */
export function ChatInput({ input, isLoading, onInputChange, onSubmit }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }, [input])

  // Focus on mount
  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSubmit(e as unknown as React.FormEvent)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="p-4 border-t border-[#1f1f1f] bg-[#0a0a0a]"
    >
      <form onSubmit={onSubmit} className="relative">
        <div className="relative rounded-xl bg-[#141414] border border-[#262626] focus-within:border-[#333] focus-within:bg-[#1a1a1a] transition-all overflow-hidden shadow-lg shadow-black/20">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe what you want to build..."
            disabled={isLoading}
            rows={1}
            className="w-full px-4 py-3.5 pr-14 bg-transparent text-[14px] text-[#fafafa] placeholder:text-[#525252] resize-none outline-none disabled:opacity-50 disabled:cursor-not-allowed leading-relaxed"
            style={{ minHeight: '52px', maxHeight: '200px' }}
          />
          
          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="absolute right-3 bottom-3 w-8 h-8 flex items-center justify-center rounded-lg bg-[#fafafa] text-[#0a0a0a] disabled:bg-[#262626] disabled:text-[#525252] disabled:cursor-not-allowed hover:bg-white transition-all shadow-sm"
          >
            {isLoading ? (
              <motion.div
                className="w-4 h-4 border-2 border-[#525252] border-t-[#0a0a0a] rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
              </svg>
            )}
          </button>
        </div>
        
        {/* Keyboard hints */}
        <div className="mt-2.5 flex items-center justify-between px-1">
          <div className="flex items-center gap-4">
            <span className="text-[11px] text-[#404040] flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-[#1a1a1a] border border-[#262626] rounded text-[10px] text-[#525252] font-mono">Enter</kbd>
              <span>send</span>
            </span>
            <span className="text-[11px] text-[#404040] flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-[#1a1a1a] border border-[#262626] rounded text-[10px] text-[#525252] font-mono">Shift+Enter</kbd>
              <span>new line</span>
            </span>
          </div>
          
          {input.length > 0 && (
            <span className="text-[11px] text-[#404040]">
              {input.length} chars
            </span>
          )}
        </div>
      </form>
    </motion.div>
  )
}
