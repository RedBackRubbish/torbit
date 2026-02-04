'use client'

import { useMemo } from 'react'

interface MarkdownRendererProps {
  content: string
  className?: string
}

/**
 * MarkdownRenderer - Premium v0-style markdown
 * 
 * Features:
 * - Checkmark lists (like v0's feature summaries)
 * - Bold section headers
 * - Clean bullet points
 * - Inline code styling
 * 
 * Does NOT render code blocks - those go to the Code panel
 */
export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const rendered = useMemo(() => parseAndRender(content), [content])
  
  if (!rendered) return null
  
  return <div className={className}>{rendered}</div>
}

function parseAndRender(content: string): React.ReactNode {
  if (!content?.trim()) return null
  
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let listItems: React.ReactNode[] = []
  let listType: 'check' | 'bullet' | null = null
  let key = 0
  let inCodeBlock = false
  
  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${key++}`} className="space-y-1 my-2">
          {listItems}
        </ul>
      )
      listItems = []
      listType = null
    }
  }
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    
    // Skip code blocks entirely
    if (trimmed.startsWith('```')) {
      inCodeBlock = !inCodeBlock
      continue
    }
    if (inCodeBlock) continue
    
    // Empty line
    if (!trimmed) {
      flushList()
      continue
    }
    
    // H2 - Section header (bold title style like v0)
    if (trimmed.startsWith('## ')) {
      flushList()
      elements.push(
        <h2 key={`h2-${key++}`} className="text-[14px] font-semibold text-[#fafafa] mt-4 mb-2 first:mt-0">
          {renderInline(trimmed.slice(3))}
        </h2>
      )
      continue
    }
    
    // H3 - Subsection
    if (trimmed.startsWith('### ')) {
      flushList()
      elements.push(
        <h3 key={`h3-${key++}`} className="text-[13px] font-semibold text-[#e5e5e5] mt-3 mb-1.5 first:mt-0">
          {renderInline(trimmed.slice(4))}
        </h3>
      )
      continue
    }
    
    // Bold line acting as header (common in v0: **Core Features:**)
    if (trimmed.startsWith('**') && trimmed.endsWith(':**')) {
      flushList()
      const headerText = trimmed.slice(2, -3)
      elements.push(
        <h3 key={`bh-${key++}`} className="text-[13px] font-semibold text-[#fafafa] mt-3 mb-1.5 first:mt-0">
          {headerText}:
        </h3>
      )
      continue
    }
    
    // Checkmark list item (v0 style: - ✓ Feature or * [x] Feature)
    const checkPatterns = [
      /^[-*]\s*[✓✔☑️⚡]\s*(.+)$/,
      /^[-*]\s*\[x\]\s*(.+)$/i,
      /^[-*]\s*:white_check_mark:\s*(.+)$/,
    ]
    
    let checkMatch = null
    for (const pattern of checkPatterns) {
      checkMatch = trimmed.match(pattern)
      if (checkMatch) break
    }
    
    if (checkMatch) {
      if (listType !== 'check') flushList()
      listType = 'check'
      listItems.push(
        <li key={`cli-${key++}`} className="flex items-start gap-2.5">
          <span className="text-[#c0c0c0] mt-[3px] shrink-0">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </span>
          <span className="text-[13px] text-[#e5e5e5] leading-relaxed">{renderInline(checkMatch[1])}</span>
        </li>
      )
      continue
    }
    
    // Regular bullet list
    const bulletMatch = trimmed.match(/^[-*•]\s+(.+)$/)
    if (bulletMatch) {
      if (listType !== 'bullet') flushList()
      listType = 'bullet'
      listItems.push(
        <li key={`bli-${key++}`} className="flex items-start gap-2.5">
          <span className="text-[#404040] mt-[9px] shrink-0">
            <svg className="w-1 h-1" fill="currentColor" viewBox="0 0 8 8">
              <circle cx="4" cy="4" r="4" />
            </svg>
          </span>
          <span className="text-[13px] text-[#e5e5e5] leading-relaxed">{renderInline(bulletMatch[1])}</span>
        </li>
      )
      continue
    }
    
    // Numbered list
    const numberedMatch = trimmed.match(/^(\d+)[.)]\s+(.+)$/)
    if (numberedMatch) {
      flushList()
      elements.push(
        <div key={`num-${key++}`} className="flex items-start gap-2 my-1">
          <span className="text-[#525252] font-mono text-[12px] w-4 shrink-0 text-right">{numberedMatch[1]}.</span>
          <span className="text-[13px] text-[#e5e5e5] leading-relaxed">{renderInline(numberedMatch[2])}</span>
        </div>
      )
      continue
    }
    
    // Blockquote
    if (trimmed.startsWith('> ')) {
      flushList()
      elements.push(
        <blockquote key={`bq-${key++}`} className="border-l-2 border-[#333] pl-3 my-2 text-[13px] text-[#a1a1a1] italic">
          {renderInline(trimmed.slice(2))}
        </blockquote>
      )
      continue
    }
    
    // Regular paragraph
    flushList()
    elements.push(
      <p key={`p-${key++}`} className="text-[13px] text-[#e5e5e5] leading-relaxed my-2 first:mt-0 last:mb-0">
        {renderInline(trimmed)}
      </p>
    )
  }
  
  flushList()
  return elements.length > 0 ? <>{elements}</> : null
}

function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = []
  let remaining = text
  let key = 0

  while (remaining.length > 0) {
    // Bold **text**
    const boldMatch = remaining.match(/^\*\*(.+?)\*\*/)
    if (boldMatch) {
      parts.push(<strong key={`b-${key++}`} className="font-semibold text-[#fafafa]">{boldMatch[1]}</strong>)
      remaining = remaining.slice(boldMatch[0].length)
      continue
    }

    // Italic *text* (single asterisk, not followed by another)
    const italicMatch = remaining.match(/^\*([^*]+)\*(?!\*)/)
    if (italicMatch) {
      parts.push(<em key={`i-${key++}`} className="italic text-[#a1a1a1]">{italicMatch[1]}</em>)
      remaining = remaining.slice(italicMatch[0].length)
      continue
    }

    // Inline code `code`
    const codeMatch = remaining.match(/^`([^`]+)`/)
    if (codeMatch) {
      parts.push(
        <code key={`c-${key++}`} className="px-1.5 py-0.5 bg-[#1a1a1a] border border-[#262626] rounded text-[12px] text-[#a1a1a1] font-mono">
          {codeMatch[1]}
        </code>
      )
      remaining = remaining.slice(codeMatch[0].length)
      continue
    }

    // Link [text](url)
    const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/)
    if (linkMatch) {
      parts.push(
        <a 
          key={`l-${key++}`} 
          href={linkMatch[2]} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 underline underline-offset-2 decoration-blue-400/50"
        >
          {linkMatch[1]}
        </a>
      )
      remaining = remaining.slice(linkMatch[0].length)
      continue
    }

    // Plain text until next special character
    const nextSpecial = remaining.search(/\*|`|\[/)
    if (nextSpecial === -1) {
      parts.push(remaining)
      break
    } else if (nextSpecial === 0) {
      parts.push(remaining[0])
      remaining = remaining.slice(1)
    } else {
      parts.push(remaining.slice(0, nextSpecial))
      remaining = remaining.slice(nextSpecial)
    }
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>
}
