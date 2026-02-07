'use client'

import { useRef, useCallback } from 'react'
import Editor, { OnMount, OnChange } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { useBuilderStore } from '@/store/builder'

// Premium dark Monaco theme - clean and modern
const TORBIT_THEME: editor.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '525252', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'c084fc' },       // Purple keywords
    { token: 'keyword.control', foreground: 'c084fc' },
    { token: 'string', foreground: '86efac' },        // Green strings
    { token: 'number', foreground: 'fcd34d' },        // Amber numbers
    { token: 'type', foreground: '67e8f9' },          // Cyan types
    { token: 'type.identifier', foreground: '67e8f9' },
    { token: 'function', foreground: '93c5fd' },      // Blue functions
    { token: 'variable', foreground: 'e5e5e5' },      // Light gray variables
    { token: 'variable.parameter', foreground: 'fdba74' },
    { token: 'constant', foreground: 'f9a8d4' },      // Pink constants
    { token: 'operator', foreground: 'a1a1a1' },
    { token: 'delimiter', foreground: '525252' },
    { token: 'tag', foreground: 'f87171' },           // Red JSX tags
    { token: 'attribute.name', foreground: 'c084fc' },
    { token: 'attribute.value', foreground: '86efac' },
  ],
  colors: {
    'editor.background': '#0a0a0a',
    'editor.foreground': '#e5e5e5',
    'editor.lineHighlightBackground': '#141414',
    'editor.lineHighlightBorder': '#00000000',
    'editor.selectionBackground': '#3b82f630',
    'editor.inactiveSelectionBackground': '#3b82f615',
    'editorLineNumber.foreground': '#333333',
    'editorLineNumber.activeForeground': '#737373',
    'editorCursor.foreground': '#fafafa',
    'editor.wordHighlightBackground': '#3b82f620',
    'editorBracketMatch.background': '#3b82f625',
    'editorBracketMatch.border': '#3b82f650',
    'editorIndentGuide.background': '#1f1f1f',
    'editorIndentGuide.activeBackground': '#333333',
    'scrollbar.shadow': '#00000000',
    'scrollbarSlider.background': '#262626',
    'scrollbarSlider.hoverBackground': '#333333',
    'scrollbarSlider.activeBackground': '#404040',
    'editorWidget.background': '#141414',
    'editorWidget.border': '#262626',
    'editorSuggestWidget.background': '#141414',
    'editorSuggestWidget.border': '#262626',
    'editorSuggestWidget.selectedBackground': '#1f1f1f',
    'editorHoverWidget.background': '#141414',
    'editorHoverWidget.border': '#262626',
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
      fontSize: 13,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, monospace",
      fontLigatures: true,
      lineHeight: 1.7,
      letterSpacing: 0.3,
      renderWhitespace: 'none',
      smoothScrolling: true,
      cursorBlinking: 'smooth',
      cursorSmoothCaretAnimation: 'on',
      cursorStyle: 'line',
      cursorWidth: 2,
      minimap: {
        enabled: false,
      },
      scrollbar: {
        verticalScrollbarSize: 8,
        horizontalScrollbarSize: 8,
        useShadows: false,
      },
      overviewRulerBorder: false,
      hideCursorInOverviewRuler: true,
      padding: {
        top: 16,
        bottom: 16,
      },
      folding: true,
      foldingHighlight: false,
      renderLineHighlight: 'line',
      renderLineHighlightOnlyWhenFocus: true,
      guides: {
        indentation: true,
        bracketPairs: false,
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
        <div className="text-center max-w-[280px]">
          <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-[#141414] border border-[#1f1f1f] flex items-center justify-center">
            <svg className="w-6 h-6 text-[#404040]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
            </svg>
          </div>
          <h3 className="text-[14px] font-medium text-[#a1a1a1] mb-1">No file selected</h3>
          <p className="text-[12px] text-[#525252] leading-relaxed">
            Select a file from the sidebar or wait for the AI to generate code
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`h-full flex flex-col ${className}`}>
      {/* File tab */}
      <div className="h-10 bg-[#0a0a0a] border-b border-[#1f1f1f] flex items-center px-3 shrink-0">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#141414] rounded-lg border border-[#1f1f1f]" title={activeFile.path || activeFile.name}>
          <svg className="w-3.5 h-3.5 text-[#525252]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <span className="text-[12px] text-[#a1a1a1] font-mono">{activeFile.name}</span>
          {activeFile.isModified && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          )}
        </div>
      </div>
      
      {/* Editor */}
      <Editor
        height="calc(100% - 40px)"
        language={activeFile.language}
        value={activeFile.content}
        onChange={handleChange}
        onMount={handleEditorMount}
        theme="torbit"
        loading={
          <div className="flex items-center justify-center h-full bg-[#0a0a0a]">
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[13px] text-[#525252]">Loading editor...</span>
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
