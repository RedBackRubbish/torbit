'use client'

import { useMemo } from 'react'

interface MarkdownRendererProps {
  content: string
  className?: string
}

interface ParsedBlock {
  type: 'paragraph' | 'heading' | 'code' | 'list' | 'blockquote'
  content: string
  language?: string
  level?: number
  items?: string[]
}

/**
 * Lightweight markdown renderer optimized for AI chat output
 * Supports: paragraphs, headings, inline code, code blocks, lists, bold, italic
 */
export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const blocks = useMemo(() => parseMarkdown(content), [content])

  return (
    <div className={`markdown-content space-y-3 ${className}`}>
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
        1: 'text-[16px] font-semibold text-[#fafafa]',
        2: 'text-[15px] font-semibold text-[#fafafa]',
        3: 'text-[14px] font-medium text-[#fafafa]',
        4: 'text-[13px] font-medium text-[#e5e5e5]',
      }[block.level || 3]
      return (
        <HeadingTag className={headingStyles}>
          {renderInline(block.content)}
        </HeadingTag>
      )

    case 'code':
      return (
        <div className="rounded-lg overflow-hidden border border-[#262626] bg-[#0a0a0a]">
          {block.language && (
            <div className="px-3 py-1.5 bg-[#141414] border-b border-[#262626] flex items-center justify-between">
              <span className="text-[11px] text-[#737373] font-medium uppercase tracking-wide">
                {block.language}
              </span>
              <button 
                onClick={() => navigator.clipboard.writeText(block.content)}
                className="text-[11px] text-[#525252] hover:text-[#a1a1a1] transition-colors"
              >
                Copy
              </button>
            </div>
          )}
          <pre className="p-3 overflow-x-auto">
            <code className="text-[12px] leading-relaxed text-[#e5e5e5] font-mono">
              {block.content}
            </code>
          </pre>
        </div>
      )

    case 'list':
      return (
        <ul className="space-y-1.5 pl-4">
          {block.items?.map((item, i) => (
            <li key={i} className="text-[14px] text-[#e5e5e5] leading-relaxed relative before:absolute before:left-[-16px] before:top-[10px] before:w-1 before:h-1 before:rounded-full before:bg-[#525252]">
              {renderInline(item)}
            </li>
          ))}
        </ul>
      )

    case 'blockquote':
      return (
        <blockquote className="border-l-2 border-[#333] pl-4 text-[14px] text-[#a1a1a1] italic">
          {renderInline(block.content)}
        </blockquote>
      )

    case 'paragraph':
    default:
      if (!block.content.trim()) return null
      return (
        <p className="text-[14px] text-[#e5e5e5] leading-relaxed">
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

    // Inline code `code`
    const codeMatch = remaining.match(/^`([^`]+)`/)
    if (codeMatch) {
      parts.push(
        <code key={key++} className="px-1.5 py-0.5 bg-[#1a1a1a] border border-[#262626] rounded text-[13px] text-[#e5e5e5] font-mono">
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

    // Code block ```
    if (line.startsWith('```')) {
      const language = line.slice(3).trim()
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      blocks.push({
        type: 'code',
        content: codeLines.join('\n'),
        language: language || undefined,
      })
      i++
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
    while (i < lines.length && lines[i].trim() && !lines[i].startsWith('#') && !lines[i].startsWith('```') && !lines[i].startsWith('- ') && !lines[i].startsWith('* ') && !lines[i].startsWith('> ')) {
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
