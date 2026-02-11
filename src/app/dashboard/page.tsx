'use client'

/**
 * TORBIT - Projects Dashboard
 * 
 * Premium, minimal dashboard. Clean and sophisticated.
 */

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthContext } from '@/providers/AuthProvider'
import { useProjects } from '@/hooks/useProjects'
import { 
  Plus, 
  Search,
  Globe, 
  Smartphone, 
  MoreHorizontal, 
  Trash2, 
  Pencil,
  LayoutGrid,
  List,
  ArrowUpRight,
  Command,
  Copy,
  ExternalLink,
  ChevronRight
} from 'lucide-react'
import { UserMenu } from '@/components/builder/UserMenu'
import { TorbitLogo, TorbitSpinner } from '@/components/ui/TorbitLogo'
import { DashboardProjectGridSkeleton } from '@/components/ui/skeletons'
import type { Project } from '@/lib/supabase/types'

type ViewMode = 'grid' | 'list'
type SortOption = 'updated' | 'created' | 'name'

export default function DashboardPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuthContext()
  const { projects, loading: projectsLoading, deleteProject, updateProject, createProject } = useProjects()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [mutatingId, setMutatingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [sortBy, setSortBy] = useState<SortOption>('updated')

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        document.getElementById('search-input')?.focus()
        document.getElementById('search-input-mobile')?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login?next=/dashboard')
    }
  }, [authLoading, user, router])

  const filteredProjects = useMemo(() => {
    let result = [...projects]
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query)
      )
    }
    
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'created':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'updated':
        default:
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      }
    })
    
    return result
  }, [projects, searchQuery, sortBy])

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <TorbitSpinner size="lg" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <TorbitSpinner size="lg" />
      </div>
    )
  }

  const handleNewProject = () => router.push('/builder')
  const handleOpenProject = (projectId: string) => {
    sessionStorage.setItem('torbit_project_id', projectId)
    router.push('/builder')
  }

  const handleDelete = async (projectId: string) => {
    if (!confirm('Delete this project? This cannot be undone.')) return
    setDeletingId(projectId)
    try {
      await deleteProject(projectId)
    } catch (err) {
      console.error('Failed to delete:', err)
    } finally {
      setDeletingId(null)
    }
  }

  const handleRename = async (project: Project) => {
    const nextName = window.prompt('Rename project', project.name)?.trim()
    if (!nextName || nextName === project.name) return

    setMutatingId(project.id)
    try {
      await updateProject(project.id, {
        name: nextName,
        updated_at: new Date().toISOString(),
      })
    } catch (err) {
      console.error('Failed to rename project:', err)
      window.alert('Could not rename this project. Please try again.')
    } finally {
      setMutatingId(null)
    }
  }

  const handleDuplicate = async (project: Project) => {
    setMutatingId(project.id)
    try {
      await createProject({
        name: `${project.name} (Copy)`,
        description: project.description,
        project_type: project.project_type,
        files: project.files,
        settings: project.settings,
        knowledge_snapshot: project.knowledge_snapshot,
      })
    } catch (err) {
      console.error('Failed to duplicate project:', err)
      window.alert('Could not duplicate this project. Please try again.')
    } finally {
      setMutatingId(null)
    }
  }

  const formatDate = (date: string) => {
    const d = new Date(date)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days}d ago`
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const loading = authLoading || projectsLoading
  const totalProjects = projects.length

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <header className="h-14 border-b border-white/[0.08] bg-[#0A0A0A] sticky top-0 z-50">
        <div className="h-full max-w-[1200px] mx-auto px-4 sm:px-6 flex items-center justify-between gap-3">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <TorbitLogo size="sm" animated />
            <span className="text-[15px] font-semibold tracking-tight text-white">TORBIT</span>
          </Link>

          <div className="hidden md:flex flex-1 max-w-[400px] mx-12">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                id="search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects..."
                className="w-full h-9 pl-9 pr-14 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 focus:bg-white/[0.06] transition-all"
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 px-1.5 py-0.5 bg-white/[0.06] rounded text-[10px] text-white/40 font-medium">
                <Command className="w-2.5 h-2.5" />K
              </kbd>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleNewProject}
              className="flex items-center gap-2 h-9 px-4 bg-white text-black text-sm font-medium rounded-lg hover:bg-white/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Project</span>
            </button>
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Welcome Section */}
        <div className="mb-10">
          <h1 className="text-[28px] font-semibold text-white tracking-tight mb-1">
            Welcome back, {user?.email?.split('@')[0] || 'there'}
          </h1>
          <p className="text-[15px] text-white/50">
            {totalProjects === 0 
              ? 'Create your first project to get started'
              : `${totalProjects} project${totalProjects !== 1 ? 's' : ''} in your workspace`
            }
          </p>
        </div>

        {/* Mobile Search */}
        <div className="md:hidden mb-6">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              id="search-input-mobile"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects..."
              className="w-full h-10 pl-9 pr-3 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 focus:bg-white/[0.06] transition-all"
            />
          </div>
        </div>

        {/* Toolbar - only show when there are projects */}
        {totalProjects > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div className="text-sm text-white/40">
              {filteredProjects.length !== totalProjects && (
                <span>{filteredProjects.length} of {totalProjects} projects</span>
              )}
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="h-8 px-3 pr-8 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white/70 focus:outline-none hover:bg-white/[0.06] transition-colors appearance-none cursor-pointer"
                style={{ 
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, 
                  backgroundPosition: 'right 8px center', 
                  backgroundRepeat: 'no-repeat' 
                }}
              >
                <option value="updated">Last updated</option>
                <option value="created">Date created</option>
                <option value="name">Name</option>
              </select>

              <div className="flex items-center bg-white/[0.04] border border-white/[0.08] rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded transition-colors ${viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'}`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded transition-colors ${viewMode === 'list' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="space-y-5 py-4">
            <p className="text-sm text-white/40">Loading projects...</p>
            <DashboardProjectGridSkeleton />
          </div>
        )}

        {/* Empty State */}
        {!loading && projects.length === 0 && <EmptyState onNewProject={handleNewProject} />}

        {/* No Search Results */}
        {!loading && projects.length > 0 && filteredProjects.length === 0 && (
          <div className="text-center py-20">
            <p className="text-white/50 mb-4">No projects match your search</p>
            <button 
              onClick={() => setSearchQuery('')} 
              className="text-sm text-white/70 hover:text-white transition-colors"
            >
              Clear search
            </button>
          </div>
        )}

        {/* Grid View */}
        {!loading && filteredProjects.length > 0 && viewMode === 'grid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredProjects.map((project, index) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  index={index}
                  onOpen={() => handleOpenProject(project.id)}
                  onRename={() => handleRename(project)}
                  onDuplicate={() => handleDuplicate(project)}
                  onDelete={() => handleDelete(project.id)}
                  deleting={deletingId === project.id}
                  mutating={mutatingId === project.id}
                  formatDate={formatDate}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* List View */}
        {!loading && filteredProjects.length > 0 && viewMode === 'list' && (
          <div className="border border-white/[0.08] rounded-xl overflow-hidden">
            <AnimatePresence mode="popLayout">
              {filteredProjects.map((project, index) => (
                <ProjectListItem
                  key={project.id}
                  project={project}
                  index={index}
                  onOpen={() => handleOpenProject(project.id)}
                  onRename={() => handleRename(project)}
                  onDuplicate={() => handleDuplicate(project)}
                  onDelete={() => handleDelete(project.id)}
                  deleting={deletingId === project.id}
                  mutating={mutatingId === project.id}
                  formatDate={formatDate}
                  isLast={index === filteredProjects.length - 1}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  )
}

function EmptyState({ onNewProject }: { onNewProject: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="max-w-lg mx-auto text-center py-20"
    >
      {/* Abstract graphic - simple geometric shape */}
      <div className="relative w-24 h-24 mx-auto mb-8">
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] to-transparent rounded-2xl rotate-6" />
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] to-transparent rounded-2xl -rotate-6" />
        <div className="absolute inset-2 bg-[#0A0A0A] rounded-xl flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-white/20 rounded-lg" />
        </div>
      </div>

      <h2 className="text-xl font-semibold text-white mb-2">No projects yet</h2>
      <p className="text-[15px] text-white/50 mb-8 leading-relaxed">
        Create your first project and start building with AI-powered code generation.
      </p>

      <button
        onClick={onNewProject}
        className="inline-flex items-center gap-2 h-11 px-6 bg-white text-black text-sm font-medium rounded-lg hover:bg-white/90 transition-colors"
      >
        Create Project
        <ChevronRight className="w-4 h-4" />
      </button>
    </motion.div>
  )
}

function ProjectCard({
  project,
  index,
  onOpen,
  onRename,
  onDuplicate,
  onDelete,
  deleting,
  mutating,
  formatDate,
}: {
  project: Project
  index: number
  onOpen: () => void
  onRename: () => void
  onDuplicate: () => void
  onDelete: () => void
  deleting: boolean
  mutating: boolean
  formatDate: (date: string) => string
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ delay: index * 0.02 }}
      className="group relative bg-white/[0.02] border border-white/[0.08] rounded-xl overflow-hidden hover:bg-white/[0.04] hover:border-white/[0.12] transition-all duration-200"
    >
      {/* Preview Area */}
      <button 
        onClick={onOpen} 
        className="w-full aspect-[16/10] relative bg-[#0D0D0D] overflow-hidden"
      >
        {/* Subtle grid pattern */}
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)`,
            backgroundSize: '24px 24px'
          }}
        />

        {/* Device mockup */}
        <div className="absolute inset-0 flex items-center justify-center">
          {project.project_type === 'mobile' ? (
            <div className="w-10 h-16 bg-white/[0.06] rounded-lg border border-white/[0.08]" />
          ) : (
            <div className="w-28 h-18 bg-white/[0.06] rounded-md border border-white/[0.08] flex flex-col overflow-hidden">
              <div className="h-2 bg-white/[0.04] border-b border-white/[0.06] flex items-center gap-0.5 px-1">
                <div className="w-1 h-1 rounded-full bg-white/20" />
                <div className="w-1 h-1 rounded-full bg-white/20" />
                <div className="w-1 h-1 rounded-full bg-white/20" />
              </div>
              <div className="flex-1" />
            </div>
          )}
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="flex items-center gap-2 text-sm text-white font-medium">
            Open
            <ArrowUpRight className="w-4 h-4" />
          </span>
        </div>
      </button>

      {/* Project Info */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-medium text-white truncate">{project.name}</h3>
            <p className="text-xs text-white/40 mt-1">
              {formatDate(project.updated_at)}
            </p>
          </div>
          
          {/* Menu */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen) }}
              aria-label="Project actions"
              className="w-7 h-7 flex items-center justify-center rounded text-white/40 hover:text-white hover:bg-white/[0.08] transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            <AnimatePresence>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={{ duration: 0.1 }}
                    className="absolute right-0 top-full mt-1 w-32 bg-[#1A1A1A] border border-white/[0.1] rounded-lg shadow-2xl overflow-hidden z-50"
                  >
                    <button 
                      onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onOpen() }} 
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onRename() }} 
                      disabled={mutating || deleting}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {mutating ? <TorbitSpinner size="xs" speed="fast" /> : <Pencil className="w-3.5 h-3.5" />}
                      Rename
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDuplicate() }} 
                      disabled={mutating || deleting}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {mutating ? <TorbitSpinner size="xs" speed="fast" /> : <Copy className="w-3.5 h-3.5" />}
                      Duplicate
                    </button>
                    <div className="border-t border-white/[0.08]" />
                    <button
                      onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete() }}
                      disabled={deleting || mutating}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deleting ? <TorbitSpinner size="xs" speed="fast" /> : <Trash2 className="w-3.5 h-3.5" />}
                      Delete
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function ProjectListItem({
  project,
  index,
  onOpen,
  onRename,
  onDuplicate,
  onDelete,
  deleting,
  mutating,
  formatDate,
  isLast,
}: {
  project: Project
  index: number
  onOpen: () => void
  onRename: () => void
  onDuplicate: () => void
  onDelete: () => void
  deleting: boolean
  mutating: boolean
  formatDate: (date: string) => string
  isLast: boolean
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ delay: index * 0.02 }}
      className={`group flex items-center gap-4 px-4 py-3 hover:bg-white/[0.03] transition-colors cursor-pointer ${!isLast ? 'border-b border-white/[0.06]' : ''}`}
      onClick={onOpen}
    >
      {/* Icon */}
      <div className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0">
        {project.project_type === 'mobile' ? (
          <Smartphone className="w-4 h-4 text-white/40" />
        ) : (
          <Globe className="w-4 h-4 text-white/40" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium text-white truncate">{project.name}</h3>
        {project.description && (
          <p className="text-xs text-white/40 truncate mt-0.5">{project.description}</p>
        )}
      </div>

      {/* Timestamp */}
      <div className="hidden sm:block text-xs text-white/30">
        {formatDate(project.updated_at)}
      </div>

      {/* Actions */}
      <div className="relative flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        <button 
          onClick={(e) => { e.stopPropagation(); onOpen() }} 
          className="p-2 text-white/40 hover:text-white rounded hover:bg-white/[0.08] transition-colors"
        >
          <ArrowUpRight className="w-4 h-4" />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen) }} 
          className="p-2 text-white/40 hover:text-white rounded hover:bg-white/[0.08] transition-colors"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>

        <AnimatePresence>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setMenuOpen(false) }} />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.1 }}
                className="absolute right-0 top-full mt-1 w-32 bg-[#1A1A1A] border border-white/[0.1] rounded-lg shadow-2xl overflow-hidden z-50"
                onClick={(e) => e.stopPropagation()}
              >
                <button 
                  onClick={() => { setMenuOpen(false); onRename() }} 
                  disabled={mutating || deleting}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {mutating ? <TorbitSpinner size="xs" speed="fast" /> : <Pencil className="w-3.5 h-3.5" />}
                  Rename
                </button>
                <button 
                  onClick={() => { setMenuOpen(false); onDuplicate() }} 
                  disabled={mutating || deleting}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {mutating ? <TorbitSpinner size="xs" speed="fast" /> : <Copy className="w-3.5 h-3.5" />}
                  Duplicate
                </button>
                <div className="border-t border-white/[0.08]" />
                <button
                  onClick={() => { setMenuOpen(false); onDelete() }}
                  disabled={deleting || mutating}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleting ? <TorbitSpinner size="xs" speed="fast" /> : <Trash2 className="w-3.5 h-3.5" />}
                  Delete
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
