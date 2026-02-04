'use client'

import { useRef, useCallback } from 'react'
import Editor, { OnMount, OnChange } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { useBuilderStore } from '@/store/builder'

// Matrix-inspired Monaco theme
const TORBIT_THEME: editor.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '4a5568', fontStyle: 'italic' },
    { token: 'keyword', foreground: '00ff41' },
    { token: 'string', foreground: '68d391' },
    { token: 'number', foreground: '00d4ff' },
    { token: 'type', foreground: 'a855f7' },
    { token: 'function', foreground: '00d4ff' },
    { token: 'variable', foreground: 'e2e8f0' },
    { token: 'constant', foreground: 'f6ad55' },
    { token: 'operator', foreground: '00ff41' },
    { token: 'delimiter', foreground: '718096' },
  ],
  colors: {
    'editor.background': '#0a0a0a',
    'editor.foreground': '#e2e8f0',
    'editor.lineHighlightBackground': '#00ff4108',
    'editor.selectionBackground': '#00ff4130',
    'editor.inactiveSelectionBackground': '#00ff4115',
    'editorLineNumber.foreground': '#4a5568',
    'editorLineNumber.activeForeground': '#00ff41',
    'editorCursor.foreground': '#00ff41',
    'editor.wordHighlightBackground': '#00ff4120',
    'editorBracketMatch.background': '#00ff4130',
    'editorBracketMatch.border': '#00ff4150',
    'editorIndentGuide.background': '#1a1a1a',
    'editorIndentGuide.activeBackground': '#2a2a2a',
    'scrollbar.shadow': '#000000',
    'scrollbarSlider.background': '#ffffff10',
    'scrollbarSlider.hoverBackground': '#ffffff20',
    'scrollbarSlider.activeBackground': '#00ff4130',
  },
}

interface CodeEditorProps {
  className?: string
}

/**
 * CodeEditor - Monaco Editor with TORBIT theme
 */
export default function CodeEditor({ className = '' }: CodeEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const { files, activeFileId, updateFile } = useBuilderStore()
  
  const activeFile = files.find((f) => f.id === activeFileId)

  const handleEditorMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor
    
    // Define custom theme
    monaco.editor.defineTheme('torbit', TORBIT_THEME)
    monaco.editor.setTheme('torbit')
    
    // Configure editor
    editor.updateOptions({
      fontSize: 14,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, monospace",
      fontLigatures: true,
      lineHeight: 1.6,
      letterSpacing: 0.5,
      renderWhitespace: 'selection',
      smoothScrolling: true,
      cursorBlinking: 'smooth',
      cursorSmoothCaretAnimation: 'on',
      minimap: {
        enabled: true,
        scale: 1,
        showSlider: 'mouseover',
      },
      scrollbar: {
        verticalScrollbarSize: 8,
        horizontalScrollbarSize: 8,
      },
      padding: {
        top: 16,
        bottom: 16,
      },
    })
  }, [])

  const handleChange: OnChange = useCallback((value) => {
    if (activeFileId && value !== undefined) {
      updateFile(activeFileId, value)
    }
  }, [activeFileId, updateFile])

  if (!activeFile) {
    return (
      <div className={`flex items-center justify-center h-full bg-[#0a0a0a] ${className}`}>
        <div className="text-center">
          <div className="text-4xl mb-4 opacity-20">{'</>'}</div>
          <p className="text-white/30 text-sm">Select a file to edit</p>
          <p className="text-white/20 text-xs mt-2">
            Or wait for agents to generate code
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`h-full ${className}`}>
      {/* File tab */}
      <div className="h-9 bg-[#0f0f0f] border-b border-white/5 flex items-center px-4">
        <div className="flex items-center gap-2 px-3 py-1 bg-[#0a0a0a] rounded-t border-t border-l border-r border-white/10 -mb-px">
          <span className="text-white/60 text-xs">{activeFile.name}</span>
          {activeFile.isModified && (
            <span className="w-2 h-2 rounded-full bg-[#00ff41]" />
          )}
        </div>
      </div>
      
      {/* Editor */}
      <Editor
        height="calc(100% - 36px)"
        language={activeFile.language}
        value={activeFile.content}
        onChange={handleChange}
        onMount={handleEditorMount}
        theme="torbit"
        loading={
          <div className="flex items-center justify-center h-full bg-[#0a0a0a]">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-[#00ff41] animate-pulse" />
              <span className="text-white/40 text-sm">Loading editor...</span>
            </div>
          </div>
        }
        options={{
          readOnly: false,
          automaticLayout: true,
        }}
      />
    </div>
  )
}
