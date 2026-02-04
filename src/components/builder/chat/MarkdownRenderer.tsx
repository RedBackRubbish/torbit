'use client'

import { useMemo } from 'react'

interface MarkdownRendererProps {
  content: string
  className?: string
}

interface ParsedBlock {
  type: 'paragraph' | 'heading' | 'list' | 'blockquote'
  content: string
  level?: number
  items?: string[]
}

/**
 * Lightweight markdown renderer for AI chat output
 * 
 * NOTE: Code blocks are NOT rendered here - they belong in the Code panel.
 * This only renders conversational elements: text, headings, lists, quotes.
 */
export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const blocks = useMemo(() => parseMarkdown(content), [content])

  if (blocks.length === 0) return null

  return (
    <div className={`space-y-2 ${className}`}>
      {blocks.map((block, i) => (
        <BlockRenderer key={i} block={block} />
      ))}
    </div>
  )
}

function BlockRenderer({ block }: { block: ParsedBlock }) {
  switch (block.type) {
    case 'heading':
      const HeadingTag = `h${block.level || 3}` as keyof JSX.IntrinsicElements
      const headingStyles = {
        1: 'text-[14px] font-semibold text-[#fafafa] mt-3 first:mt-0',
        2: 'text-[13px] font-semibold text-[#fafafa] mt-2 first:mt-0',
        3: 'text-[13px] font-medium text-[#e5e5e5] mt-2 first:mt-0',
        4: 'text-[13px] font-medium text-[#a1a1a1] mt-1 first:mt-0',
      }[block.level || 3]
      return (
        <HeadingTag className={headingStyles}>
          {renderInline(block.content)}
        </HeadingTag>
      )

    case 'list':
      return (
        <ul className="space-y-1 pl-3">
          {block.items?.map((item, i) => (
            <li key={i} className="text-[13px] text-[#e5e5e5] leading-relaxed relative before:absolute before:left-[-10px] before:top-[8px] before:w-1 before:h-1 before:rounded-full before:bg-[#525252]">
              {renderInline(item)}
            </li>
          ))}
        </ul>
      )

    case 'blockquote':
      return (
        <blockquote className="border-l-2 border-[#333] pl-3 text-[13px] text-[#a1a1a1] italic">
          {renderInline(block.content)}
        </blockquote>
      )

    case 'paragraph':
    default:
      if (!block.content.trim()) return null
      return (
        <p className="text-[13px] text-[#e5e5e5] leading-relaxed">
          {renderInline(block.content)}
        </p>
      )
  }
}

function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = []
  let remaining = text
  let key = 0

  while (remaining.length > 0) {
    // Bold **text**
    const boldMatch = remaining.match(/^\*\*(.+?)\*\*/)
    if (boldMatch) {
      parts.push(<strong key={key++} className="font-semibold text-[#fafafa]">{boldMatch[1]}</strong>)
      remaining = remaining.slice(boldMatch[0].length)
      continue
    }

    // Italic *text*
    const italicMatch = remaining.match(/^\*(.+?)\*/)
    if (italicMatch) {
      parts.push(<em key={key++} className="italic">{italicMatch[1]}</em>)
      remaining = remaining.slice(italicMatch[0].length)
      continue
    }

    // Inline code `code` - render as subtle inline element
    const codeMatch = remaining.match(/^`([^`]+)`/)
    if (codeMatch) {
      parts.push(
        <code key={key++} className="px-1 py-0.5 bg-[#1a1a1a] rounded text-[12px] text-[#a1a1a1] font-mono">
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
          key={key++} 
          href={linkMatch[2]} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
        >
          {linkMatch[1]}
        </a>
      )
      remaining = remaining.slice(linkMatch[0].length)
      continue
    }

    // Plain text until next special character
    const plainMatch = remaining.match(/^[^*`\[]+/)
    if (plainMatch) {
      parts.push(plainMatch[0])
      remaining = remaining.slice(plainMatch[0].length)
      continue
    }

    // If nothing matches, consume one character
    parts.push(remaining[0])
    remaining = remaining.slice(1)
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>
}

function parseMarkdown(content: string): ParsedBlock[] {
  const blocks: ParsedBlock[] = []
  const lines = content.split('\n')
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // SKIP code blocks entirely - they don't belong in chat
    if (line.startsWith('```')) {
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        i++
      }
      i++ // skip closing ```
      continue
    }

    // Heading # ## ### ####
    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/)
    if (headingMatch) {
      blocks.push({
        type: 'heading',
        content: headingMatch[2],
        level: headingMatch[1].length,
      })
      i++
      continue
    }

    // List item - or *
    if (line.match(/^[-*]\s+/)) {
      const items: string[] = []
      while (i < lines.length && lines[i].match(/^[-*]\s+/)) {
        items.push(lines[i].replace(/^[-*]\s+/, ''))
        i++
      }
      blocks.push({
        type: 'list',
        content: '',
        items,
      })
      continue
    }

    // Numbered list 1. 2. etc
    if (line.match(/^\d+\.\s+/)) {
      const items: string[] = []
      while (i < lines.length && lines[i].match(/^\d+\.\s+/)) {
        items.push(lines[i].replace(/^\d+\.\s+/, ''))
        i++
      }
      blocks.push({
        type: 'list',
        content: '',
        items,
      })
      continue
    }

    // Blockquote >
    if (line.startsWith('> ')) {
      const quoteLines: string[] = []
      while (i < lines.length && lines[i].startsWith('> ')) {
        quoteLines.push(lines[i].slice(2))
        i++
      }
      blocks.push({
        type: 'blockquote',
        content: quoteLines.join(' '),
      })
      continue
    }

    // Empty line - skip
    if (!line.trim()) {
      i++
      continue
    }

    // Paragraph - collect consecutive non-empty lines
    const paraLines: string[] = []
    while (
      i < lines.length && 
      lines[i].trim() && 
      !lines[i].startsWith('#') && 
      !lines[i].startsWith('```') && 
      !lines[i].startsWith('- ') && 
      !lines[i].startsWith('* ') && 
      !lines[i].startsWith('> ') &&
      !lines[i].match(/^\d+\.\s+/)
    ) {
      paraLines.push(lines[i])
      i++
    }
    if (paraLines.length > 0) {
      blocks.push({
        type: 'paragraph',
        content: paraLines.join(' '),
      })
    }
  }

  return blocks
}
