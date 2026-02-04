'use client'

import { motion } from 'framer-motion'

interface ChatInputProps {
  input: string
  isLoading: boolean
  onInputChange: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
}

/**
 * ChatInput - Message input area with submit button
 */
export function ChatInput({ input, isLoading, onInputChange, onSubmit }: ChatInputProps) {
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
      className="p-4 border-t border-neutral-800"
    >
      <div className="relative">
        <textarea
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What would you like to build?"
          rows={1}
          className="w-full bg-neutral-800/50 border border-neutral-700 rounded-xl px-4 py-3 pr-12
            text-neutral-100 text-sm placeholder:text-neutral-500 resize-none
            focus:outline-none focus:border-blue-500/50 transition-colors"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className={`absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg
            flex items-center justify-center transition-all ${
              input.trim() && !isLoading
                ? 'bg-blue-600 text-white hover:bg-blue-500'
                : 'bg-neutral-700/50 text-neutral-500 cursor-not-allowed'
            }`}
        >
          {isLoading ? (
            <motion.div
              className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          )}
        </button>
      </div>
      
      <p className="text-neutral-500 text-xs mt-3 text-center">
        Enter to send · Shift+Enter for new line
      </p>
    </motion.form>
  )
}
