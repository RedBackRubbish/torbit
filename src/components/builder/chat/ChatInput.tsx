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
 * ChatInput - Clean, expansive input area like v0
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSubmit(e as unknown as React.FormEvent)
    }
  }

  return (
    <motion.form
      onSubmit={onSubmit}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="p-4 border-t border-[#1f1f1f]"
    >
      <div className="relative bg-[#141414] border border-[#262626] rounded-xl focus-within:border-[#404040] transition-colors">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything..."
          rows={1}
          disabled={isLoading}
          className="w-full bg-transparent px-4 py-3 pr-12 text-[14px] text-[#fafafa] 
            placeholder:text-[#525252] resize-none focus:outline-none
            disabled:opacity-50 disabled:cursor-not-allowed
            min-h-[48px] max-h-[200px]"
        />
        
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className={`absolute right-2 bottom-2 w-8 h-8 rounded-lg flex items-center justify-center 
            transition-all duration-200 ${
            input.trim() && !isLoading
              ? 'bg-[#fafafa] text-[#0a0a0a] hover:bg-[#e5e5e5]'
              : 'bg-[#1f1f1f] text-[#525252] cursor-not-allowed'
          }`}
        >
          {isLoading ? (
            <motion.svg 
              className="w-4 h-4"
              viewBox="0 0 24 24"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <circle 
                cx="12" cy="12" r="10" 
                stroke="currentColor" 
                strokeWidth="2" 
                fill="none"
                strokeDasharray="32"
                strokeLinecap="round"
              />
            </motion.svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
            </svg>
          )}
        </button>
      </div>
      
      <div className="flex items-center justify-between mt-2 px-1">
        <p className="text-[11px] text-[#404040]">
          Press Enter to send
        </p>
        <p className="text-[11px] text-[#404040]">
          Shift + Enter for new line
        </p>
      </div>
    </motion.form>
  )
}
