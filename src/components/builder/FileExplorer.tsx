'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useBuilderStore, ProjectFile } from '@/store/builder'

interface FileNode {
  name: string
  type: 'file' | 'folder'
  path: string
  file?: ProjectFile
  children?: FileNode[]
}

const FILE_ICONS: Record<string, string> = {
  tsx: '⚛',
  ts: '◇',
  jsx: '⚛',
  js: '◇',
  css: '◆',
  json: '{ }',
  md: '◈',
  prisma: '◆',
  default: '◇',
}

function getFileIcon(filename: string): string {
  const ext = filename.split('.').pop() || ''
  return FILE_ICONS[ext] || FILE_ICONS.default
}

function buildFileTree(files: ProjectFile[]): FileNode[] {
  const root: FileNode[] = []
  
  for (const file of files) {
    const parts = file.path.split('/')
    let current = root
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isFile = i === parts.length - 1
      const path = parts.slice(0, i + 1).join('/')
      
      let existing = current.find(n => n.name === part)
      
      if (!existing) {
        existing = {
          name: part,
          type: isFile ? 'file' : 'folder',
          path,
          file: isFile ? file : undefined,
          children: isFile ? undefined : [],
        }
        current.push(existing)
      }
      
      if (!isFile && existing.children) {
        current = existing.children
      }
    }
  }
  
  return root
}

interface FileTreeItemProps {
  node: FileNode
  depth: number
}

function FileTreeItem({ node, depth }: FileTreeItemProps) {
  const [expanded, setExpanded] = useState(depth < 2)
  const { activeFileId, setActiveFile } = useBuilderStore()
  const isSelected = node.file?.id === activeFileId

  const handleClick = () => {
    if (node.type === 'folder') {
      setExpanded(!expanded)
    } else if (node.file) {
      setActiveFile(node.file.id)
    }
  }

  return (
    <div>
      <motion.button
        onClick={handleClick}
        className={`w-full flex items-center gap-2 px-2 py-1.5 text-left text-sm transition-colors rounded ${
          isSelected
            ? 'bg-blue-500/10 text-blue-400'
            : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200'
        }`}
        style={{ 
          paddingLeft: `${depth * 12 + 8}px`,
          fontFamily: "'Space Grotesk', sans-serif",
        }}
        whileHover={{ x: 2 }}
        transition={{ duration: 0.1 }}
      >
        <span className="text-xs opacity-60">
          {node.type === 'folder' 
            ? (expanded ? '▼' : '▶')
            : getFileIcon(node.name)
          }
        </span>
        <span className="truncate">{node.name}</span>
        {node.file?.isNew && (
          <span className="ml-auto text-[10px] text-blue-400 uppercase tracking-wider">new</span>
        )}
        {node.file?.isModified && (
          <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />
        )}
      </motion.button>
      
      {node.type === 'folder' && expanded && node.children && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
        >
          {node.children.map((child) => (
            <FileTreeItem
              key={child.path}
              node={child}
              depth={depth + 1}
            />
          ))}
        </motion.div>
      )}
    </div>
  )
}

/**
 * FileExplorer - Tree view of generated project files
 */
export default function FileExplorer() {
  const { files } = useBuilderStore()
  
  const fileTree = useMemo(() => buildFileTree(files), [files])

  if (files.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-2xl mb-2 opacity-20">📁</div>
          <p 
            className="text-neutral-400 text-xs"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            No files yet
          </p>
          <p 
            className="text-neutral-500 text-xs mt-1"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Files will appear as agents generate code
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto py-2 custom-scrollbar">
      {fileTree.map((node) => (
        <FileTreeItem
          key={node.path}
          node={node}
          depth={0}
        />
      ))}
    </div>
  )
}
