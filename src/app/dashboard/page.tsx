'use client'

/**
 * TORBIT - Projects Dashboard
 * 
 * View and manage all user projects.
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useProjects } from '@/hooks/useProjects'
import { 
  Plus, 
  Folder, 
  Globe, 
  Smartphone, 
  MoreVertical, 
  Trash2, 
  Pencil,
  Loader2,
  Sparkles,
  Clock
} from 'lucide-react'
import { UserMenu } from '@/components/builder/UserMenu'

export default function DashboardPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { projects, loading: projectsLoading, deleteProject } = useProjects()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Redirect to login if not authenticated
  if (!authLoading && !user) {
    router.push('/login')
    return null
  }

  const handleNewProject = () => {
    router.push('/')
  }

  const handleOpenProject = (projectId: string) => {
    // Store project ID and navigate to builder
    sessionStorage.setItem('torbit_project_id', projectId)
    router.push('/builder')
  }

  const handleDelete = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return
    
    setDeletingId(projectId)
    try {
      await deleteProject(projectId)
    } catch (err) {
      console.error('Failed to delete project:', err)
    } finally {
      setDeletingId(null)
    }
  }

  const formatDate = (date: string) => {
    const d = new Date(date)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days} days ago`
    return d.toLocaleDateString()
  }

  const loading = authLoading || projectsLoading

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="h-14 border-b border-neutral-800 bg-black/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="h-full max-w-7xl mx-auto px-6 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <Sparkles className="w-6 h-6 text-white group-hover:text-neutral-300 transition-colors" />
            <span className="text-lg font-bold tracking-tight text-white">TORBIT</span>
          </Link>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleNewProject}
              className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-neutral-200 text-black text-sm font-medium rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Project
            </button>
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Your Projects</h1>
          <p className="text-neutral-400 mt-1">Manage and continue building your applications</p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-neutral-500 animate-spin" />
          </div>
        )}

        {/* Empty State */}
        {!loading && projects.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-900 flex items-center justify-center">
              <Folder className="w-8 h-8 text-neutral-600" />
            </div>
            <h2 className="text-lg font-medium text-white mb-2">No projects yet</h2>
            <p className="text-neutral-500 mb-6">Create your first project to get started</p>
            <button
              onClick={handleNewProject}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white hover:bg-neutral-200 text-black font-medium rounded-xl transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Project
            </button>
          </motion.div>
        )}

        {/* Projects Grid */}
        {!loading && projects.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {projects.map((project, index) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                  className="group relative bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden hover:border-neutral-700 transition-colors"
                >
                  {/* Card Content */}
                  <button
                    onClick={() => handleOpenProject(project.id)}
                    className="w-full p-5 text-left"
                  >
                    {/* Icon + Title */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`
                        w-10 h-10 rounded-lg flex items-center justify-center shrink-0
                        ${project.project_type === 'mobile' 
                          ? 'bg-purple-500/20 text-purple-400' 
                          : 'bg-blue-500/20 text-blue-400'}
                      `}>
                        {project.project_type === 'mobile' 
                          ? <Smartphone className="w-5 h-5" />
                          : <Globe className="w-5 h-5" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-white truncate group-hover:text-neutral-200 transition-colors">
                          {project.name}
                        </h3>
                        <p className="text-xs text-neutral-500 mt-0.5">
                          {project.project_type === 'mobile' ? 'Mobile App' : 'Web App'}
                        </p>
                      </div>
                    </div>

                    {/* Description */}
                    {project.description && (
                      <p className="text-sm text-neutral-400 line-clamp-2 mb-3">
                        {project.description}
                      </p>
                    )}

                    {/* Meta */}
                    <div className="flex items-center gap-3 text-xs text-neutral-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDate(project.updated_at)}
                      </span>
                    </div>
                  </button>

                  {/* Actions Menu */}
                  <div className="absolute top-3 right-3">
                    <ProjectMenu
                      onEdit={() => {/* TODO */}}
                      onDelete={() => handleDelete(project.id)}
                      deleting={deletingId === project.id}
                    />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  )
}

function ProjectMenu({ 
  onEdit, 
  onDelete, 
  deleting 
}: { 
  onEdit: () => void
  onDelete: () => void
  deleting: boolean 
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(!isOpen)
        }}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-500 hover:text-white hover:bg-neutral-800 transition-colors opacity-0 group-hover:opacity-100"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)} 
            />
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.95 }}
              transition={{ duration: 0.1 }}
              className="absolute right-0 top-full mt-1 w-36 bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl overflow-hidden z-50"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setIsOpen(false)
                  onEdit()
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800 transition-colors"
              >
                <Pencil className="w-4 h-4" />
                Rename
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setIsOpen(false)
                  onDelete()
                }}
                disabled={deleting}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
              >
                {deleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Delete
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
