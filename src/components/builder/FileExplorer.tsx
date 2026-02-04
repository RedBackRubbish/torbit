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

// File extension to icon mapping
function getFileIcon(filename: string): React.ReactNode {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  
  const iconClass = 'w-3.5 h-3.5'
  
  switch (ext) {
    case 'tsx':
    case 'jsx':
      return (
        <svg className={`${iconClass} text-blue-400`} viewBox="0 0 24 24" fill="currentColor">
          <path d="M14.23 12.004a2.236 2.236 0 0 1-2.235 2.236 2.236 2.236 0 0 1-2.236-2.236 2.236 2.236 0 0 1 2.235-2.236 2.236 2.236 0 0 1 2.236 2.236zm2.648-10.69c-1.346 0-3.107.96-4.888 2.622-1.78-1.653-3.542-2.602-4.887-2.602-.41 0-.783.093-1.106.278-1.375.793-1.683 3.264-.973 6.365C1.98 8.917 0 10.42 0 12.004c0 1.59 1.99 3.097 5.043 4.03-.704 3.113-.39 5.588.988 6.38.32.187.69.275 1.102.275 1.345 0 3.107-.96 4.888-2.624 1.78 1.654 3.542 2.603 4.887 2.603.41 0 .783-.09 1.106-.275 1.374-.792 1.683-3.263.973-6.365C22.02 15.096 24 13.59 24 12.004c0-1.59-1.99-3.097-5.043-4.032.704-3.11.39-5.587-.988-6.38-.318-.184-.688-.277-1.092-.278zm-.005 1.09v.006c.225 0 .406.044.558.127.666.382.955 1.835.73 3.704-.054.46-.142.945-.25 1.44-.96-.236-2.006-.417-3.107-.534-.66-.905-1.345-1.727-2.035-2.447 1.592-1.48 3.087-2.292 4.105-2.295zm-9.77.02c1.012 0 2.514.808 4.11 2.28-.686.72-1.37 1.537-2.02 2.442-1.107.117-2.154.298-3.113.538-.112-.49-.195-.964-.254-1.42-.23-1.868.054-3.32.714-3.707.19-.09.4-.127.563-.132zm4.882 3.05c.455.468.91.992 1.36 1.564-.44-.02-.89-.034-1.345-.034-.46 0-.915.01-1.36.034.44-.572.895-1.096 1.345-1.565zM12 8.1c.74 0 1.477.034 2.202.093.406.582.802 1.203 1.183 1.86.372.64.71 1.29 1.018 1.946-.308.655-.646 1.31-1.013 1.95-.38.66-.773 1.288-1.18 1.87-.728.063-1.466.098-2.21.098-.74 0-1.477-.035-2.202-.093-.406-.582-.802-1.204-1.183-1.86-.372-.64-.71-1.29-1.018-1.946.303-.657.646-1.313 1.013-1.954.38-.66.773-1.286 1.18-1.868.728-.064 1.466-.098 2.21-.098zm-3.635.254c-.24.377-.48.763-.704 1.16-.225.39-.435.782-.635 1.174-.265-.656-.49-1.31-.676-1.947.64-.15 1.315-.283 2.015-.386zm7.26 0c.695.103 1.365.23 2.006.387-.18.632-.405 1.282-.66 1.933-.2-.39-.41-.783-.64-1.174-.225-.392-.465-.774-.705-1.146zm3.063.675c.484.15.944.317 1.375.498 1.732.74 2.852 1.708 2.852 2.476-.005.768-1.125 1.74-2.857 2.475-.42.18-.88.342-1.355.493-.28-.958-.646-1.956-1.1-2.98.45-1.017.81-2.01 1.085-2.964zm-13.395.004c.278.96.645 1.957 1.1 2.98-.45 1.017-.812 2.01-1.086 2.964-.484-.15-.944-.318-1.37-.5-1.732-.737-2.852-1.706-2.852-2.474 0-.768 1.12-1.742 2.852-2.476.42-.18.88-.342 1.356-.494zm11.678 4.28c.265.657.49 1.312.676 1.948-.64.157-1.316.29-2.016.39.24-.375.48-.762.705-1.158.225-.39.435-.788.636-1.18zm-9.945.02c.2.392.41.783.64 1.175.23.39.465.772.705 1.143-.695-.102-1.365-.23-2.006-.386.18-.63.406-1.282.66-1.933zM17.92 16.32c.112.493.2.968.254 1.423.23 1.868-.054 3.32-.714 3.708-.147.09-.338.128-.563.128-1.012 0-2.514-.807-4.11-2.28.686-.72 1.37-1.536 2.02-2.44 1.107-.118 2.154-.3 3.113-.54zm-11.83.01c.96.234 2.006.415 3.107.532.66.905 1.345 1.727 2.035 2.446-1.595 1.483-3.092 2.295-4.11 2.295-.22-.005-.406-.05-.553-.132-.666-.38-.955-1.834-.73-3.703.054-.46.142-.944.25-1.438zm4.56.64c.44.02.89.034 1.345.034.46 0 .915-.01 1.36-.034-.44.572-.895 1.095-1.345 1.565-.455-.47-.91-.993-1.36-1.565z"/>
        </svg>
      )
    case 'ts':
    case 'js':
      return (
        <svg className={`${iconClass} text-yellow-400`} viewBox="0 0 24 24" fill="currentColor">
          <path d="M0 0h24v24H0V0zm22.034 18.276c-.175-1.095-.888-2.015-3.003-2.873-.736-.345-1.554-.585-1.797-1.14-.091-.33-.105-.51-.046-.705.15-.646.915-.84 1.515-.66.39.12.75.42.976.9 1.034-.676 1.034-.676 1.755-1.125-.27-.42-.405-.6-.586-.78-.63-.705-1.469-1.065-2.834-1.034l-.705.089c-.676.165-1.32.525-1.71 1.005-1.14 1.291-.811 3.541.569 4.471 1.365 1.02 3.361 1.244 3.616 2.205.24 1.17-.87 1.545-1.966 1.41-.811-.18-1.26-.586-1.755-1.336l-1.83 1.051c.21.48.45.689.81 1.109 1.74 1.756 6.09 1.666 6.871-1.004.029-.09.24-.705.074-1.65l.046.067zm-8.983-7.245h-2.248c0 1.938-.009 3.864-.009 5.805 0 1.232.063 2.363-.138 2.711-.33.689-1.18.601-1.566.48-.396-.196-.597-.466-.83-.855-.063-.105-.11-.196-.127-.196l-1.825 1.125c.305.63.75 1.172 1.324 1.517.855.51 2.004.675 3.207.405.783-.226 1.458-.691 1.811-1.411.51-.93.402-2.07.397-3.346.012-2.054 0-4.109 0-6.179l.004-.056z"/>
        </svg>
      )
    case 'css':
    case 'scss':
    case 'sass':
      return (
        <svg className={`${iconClass} text-purple-400`} viewBox="0 0 24 24" fill="currentColor">
          <path d="M1.5 0h21l-1.91 21.563L11.977 24l-8.564-2.438L1.5 0zm17.09 4.413L5.41 4.41l.213 2.622 10.125.002-.255 2.716h-6.64l.24 2.573h6.182l-.366 3.523-2.91.804-2.956-.81-.188-2.11h-2.61l.29 3.855L12 19.288l5.373-1.53L18.59 4.414z"/>
        </svg>
      )
    case 'json':
      return (
        <svg className={`${iconClass} text-amber-400`} viewBox="0 0 24 24" fill="currentColor">
          <path d="M5.759 3.975h1.783V5.76H5.759v4.458A1.783 1.783 0 013.975 12a1.783 1.783 0 011.784 1.783v4.459h1.783v1.783H5.759c-.954-.24-1.784-.803-1.784-1.783v-3.567a1.783 1.783 0 00-1.783-1.783H1.3v-1.783h.892a1.783 1.783 0 001.783-1.783V5.759c0-.98.83-1.543 1.784-1.784zm12.482 0c.954.24 1.784.803 1.784 1.784v3.566a1.783 1.783 0 001.783 1.783h.892v1.783h-.892a1.783 1.783 0 00-1.783 1.783v3.567c0 .98-.83 1.543-1.784 1.783h-1.783V18.24h1.783v-4.459A1.783 1.783 0 0120.025 12a1.783 1.783 0 01-1.783-1.783V5.759h-1.783V3.975h1.783z"/>
        </svg>
      )
    case 'md':
    case 'mdx':
      return (
        <svg className={`${iconClass} text-[#525252]`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      )
    default:
      return (
        <svg className={`${iconClass} text-[#525252]`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      )
  }
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
        className={`w-full flex items-center gap-2 px-2 py-1.5 text-left transition-colors rounded-md ${
          isSelected
            ? 'bg-blue-500/10 text-blue-400'
            : 'text-[#a1a1a1] hover:bg-[#1f1f1f] hover:text-[#fafafa]'
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        whileHover={{ x: 1 }}
        transition={{ duration: 0.1 }}
      >
        {/* Icon */}
        <span className="shrink-0">
          {node.type === 'folder' ? (
            <svg 
              className={`w-3.5 h-3.5 text-[#525252] transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor" 
              strokeWidth={1.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          ) : (
            getFileIcon(node.name)
          )}
        </span>
        
        {/* Name */}
        <span className="truncate text-[12px]">{node.name}</span>
        
        {/* Badges */}
        {node.file?.isNew && (
          <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-medium uppercase tracking-wide">
            new
          </span>
        )}
        {node.file?.isModified && (
          <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />
        )}
      </motion.button>
      
      {/* Children */}
      {node.type === 'folder' && expanded && node.children && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.15 }}
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
 * FileExplorer - Clean file tree with proper icons
 */
export default function FileExplorer() {
  const { files } = useBuilderStore()
  
  const fileTree = useMemo(() => buildFileTree(files), [files])

  if (files.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-[#1a1a1a] border border-[#262626] flex items-center justify-center">
            <svg className="w-5 h-5 text-[#404040]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
            </svg>
          </div>
          <p className="text-[13px] text-[#737373] mb-1">No files yet</p>
          <p className="text-[12px] text-[#525252]">Files will appear as code is generated</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto py-2 px-2 custom-scrollbar">
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
