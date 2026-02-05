'use client'

import { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'

interface ChatInputProps {
  input: string
  isLoading: boolean
  onInputChange: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
  currentStep?: number
}

/**
 * ChatInput - Emergent-style clean input with trust signals
 */
export function ChatInput({ input, isLoading, onInputChange, onSubmit, currentStep = 1 }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`
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
      className="p-3 border-t border-[#151515] bg-[#000000]"
    >
      <form onSubmit={onSubmit} className="relative">
        <div className="relative rounded-xl bg-[#050505] border border-[#1a1a1a] focus-within:border-[#404040] transition-all overflow-hidden">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe what you want Torbit to produce"
            disabled={isLoading}
            rows={1}
            className="w-full px-4 py-3 pr-12 bg-transparent text-[14px] text-[#ffffff] placeholder:text-[#505050] resize-none outline-none disabled:opacity-50 disabled:cursor-not-allowed leading-relaxed"
            style={{ minHeight: '46px', maxHeight: '160px' }}
          />
          
          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="absolute right-2.5 bottom-2.5 w-7 h-7 flex items-center justify-center rounded-lg bg-[#c0c0c0] text-[#000000] disabled:bg-[#1a1a1a] disabled:text-[#404040] disabled:cursor-not-allowed hover:bg-[#d4d4d4] transition-all"
          >
            {isLoading ? (
              <motion.div
                className="w-3.5 h-3.5 border-2 border-[#404040] border-t-[#0a0a0a] rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
              </svg>
            )}
          </button>
        </div>
        
        {/* Trust signals - subtle reassurance */}
        <div className="flex items-center justify-center gap-4 mt-3 text-[11px] text-white/25">
          <span className="flex items-center gap-1">
            <Check className="w-3 h-3" />
            Auditor-gated execution
          </span>
          <span className="flex items-center gap-1">
            <Check className="w-3 h-3" />
            Pinned dependencies
          </span>
          <span className="flex items-center gap-1">
            <Check className="w-3 h-3" />
            Refund on failed builds
          </span>
        </div>
      </form>
      
      {/* Workflow stepper */}
      <div className="flex items-center justify-center gap-1 mt-4 text-[11px]">
        {[
          { num: 1, label: 'Describe' },
          { num: 2, label: 'Build' },
          { num: 3, label: 'Verify' },
          { num: 4, label: 'Export' },
        ].map((step, i) => (
          <div key={step.num} className="flex items-center">
            <span className={`flex items-center gap-1 px-2 py-0.5 rounded ${
              currentStep === step.num 
                ? 'text-white bg-white/[0.08]' 
                : currentStep > step.num
                  ? 'text-white/40'
                  : 'text-white/20'
            }`}>
              <span className={`w-4 h-4 flex items-center justify-center rounded-full text-[10px] font-medium ${
                currentStep === step.num 
                  ? 'bg-white text-black' 
                  : currentStep > step.num
                    ? 'bg-white/20 text-white/60'
                    : 'bg-white/[0.06] text-white/30'
              }`}>
                {currentStep > step.num ? <Check className="w-2.5 h-2.5" /> : step.num}
              </span>
              {step.label}
            </span>
            {i < 3 && (
              <div className={`w-4 h-px mx-1 ${currentStep > step.num ? 'bg-white/20' : 'bg-white/[0.06]'}`} />
            )}
          </div>
        ))}
      </div>
    </motion.div>
  )
}
