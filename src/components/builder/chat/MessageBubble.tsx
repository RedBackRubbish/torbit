'use client'

import { motion } from 'framer-motion'
import { StreamingMessage } from './StreamingMessage'
import type { Message } from './types'

interface MessageBubbleProps {
  message: Message
  isLast: boolean
  isLoading: boolean
  index: number
}

/**
 * MessageBubble - Routes to user or agent message style
 */
export function MessageBubble({ message, isLast, isLoading }: MessageBubbleProps) {
  // User message - Clean bordered box
  if (message.role === 'user') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="py-3"
      >
        <div className="p-3.5 rounded-xl bg-[#0f0f0f] border border-[#1f1f1f] hover:border-[#2a2a2a] transition-colors">
          <p className="text-[14px] text-[#e5e5e5] leading-relaxed whitespace-pre-wrap">
            {message.content}
          </p>
        </div>
      </motion.div>
    )
  }

  // Assistant message - Enhanced streaming experience
  return (
    <StreamingMessage 
      message={message} 
      isLast={isLast} 
      isLoading={isLoading} 
    />
  )
}
