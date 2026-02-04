'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTaskStore, type Task, type TaskStatus } from '@/store/tasks'

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; icon: string }> = {
  'not-started': { label: 'To Do', color: '#6b7280', icon: '○' },
  'in-progress': { label: 'In Progress', color: '#f59e0b', icon: '◐' },
  'completed': { label: 'Done', color: '#22c55e', icon: '●' },
  'blocked': { label: 'Blocked', color: '#ef4444', icon: '✕' },
}

const PRIORITY_CONFIG = {
  low: { label: 'Low', color: '#6b7280' },
  medium: { label: 'Med', color: '#f59e0b' },
  high: { label: 'High', color: '#f97316' },
  critical: { label: 'Critical', color: '#ef4444' },
}

function TaskCard({ task, onUpdate, onDelete }: { 
  task: Task
  onUpdate: (id: string, updates: Partial<Task>) => void
  onDelete: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const status = STATUS_CONFIG[task.status]
  const priority = PRIORITY_CONFIG[task.priority]

  const cycleStatus = () => {
    const statuses: TaskStatus[] = ['not-started', 'in-progress', 'completed']
    const currentIndex = statuses.indexOf(task.status)
    const nextStatus = statuses[(currentIndex + 1) % statuses.length]
    onUpdate(task.id, { status: nextStatus })
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className={`bg-white/5 border rounded-lg overflow-hidden ${
        task.status === 'completed' ? 'border-green-500/20 opacity-60' : 'border-white/10'
      }`}
    >
      <div className="px-3 py-2 flex items-start gap-2">
        {/* Status toggle */}
        <button
          onClick={cycleStatus}
          className="mt-0.5 text-lg transition-colors hover:scale-110"
          style={{ color: status.color }}
          title={`Status: ${status.label}`}
        >
          {status.icon}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span 
              className={`text-sm ${task.status === 'completed' ? 'line-through text-white/40' : 'text-white/90'}`}
            >
              {task.title}
            </span>
            <span 
              className="text-[10px] px-1.5 py-0.5 rounded"
              style={{ backgroundColor: `${priority.color}20`, color: priority.color }}
            >
              {priority.label}
            </span>
          </div>
          
          {task.agentId && (
            <span className="text-xs text-white/30 capitalize">{task.agentId}</span>
          )}
        </div>

        {/* Expand/collapse */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-white/30 hover:text-white/60 transition-colors"
        >
          <svg 
            className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-neutral-800"
          >
            <div className="px-3 py-2 space-y-2">
              {task.description && (
                <p className="text-xs text-neutral-400">{task.description}</p>
              )}
              
              <div className="flex items-center gap-2">
                {/* Status selector */}
                <select
                  value={task.status}
                  onChange={(e) => onUpdate(task.id, { status: e.target.value as TaskStatus })}
                  className="text-xs bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-neutral-300"
                >
                  {Object.entries(STATUS_CONFIG).map(([value, { label }]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>

                {/* Priority selector */}
                <select
                  value={task.priority}
                  onChange={(e) => onUpdate(task.id, { priority: e.target.value as Task['priority'] })}
                  className="text-xs bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-neutral-300"
                >
                  {Object.entries(PRIORITY_CONFIG).map(([value, { label }]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>

                {/* Delete button */}
                <button
                  onClick={() => onDelete(task.id)}
                  className="ml-auto text-xs text-red-400/60 hover:text-red-400 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/**
 * TasksPanel - Visual task management for TORBIT
 * Agents can create tasks, track progress, and show work
 */
export default function TasksPanel() {
  const { tasks, addTask, updateTask, deleteTask, clearCompleted } = useTaskStore()
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [filter, setFilter] = useState<TaskStatus | 'all'>('all')

  const filteredTasks = filter === 'all' 
    ? tasks 
    : tasks.filter(t => t.status === filter)

  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'completed').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
  }

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskTitle.trim()) return
    
    addTask({
      title: newTaskTitle.trim(),
      description: '',
      status: 'not-started',
      priority: 'medium',
    })
    setNewTaskTitle('')
  }

  return (
    <div 
      className="h-full flex flex-col bg-neutral-900"
      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
    >
      {/* Header */}
      <div className="p-4 border-b border-neutral-800">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-neutral-200 font-medium flex items-center gap-2">
            <span className="text-blue-400">▣</span> Tasks
          </h2>
          <span className="text-xs text-neutral-500">
            {stats.completed}/{stats.total}
          </span>
        </div>

        {/* Progress bar */}
        {stats.total > 0 && (
          <div className="h-1 bg-neutral-800 rounded-full overflow-hidden mb-3">
            <motion.div
              className="h-full bg-blue-500"
              initial={{ width: 0 }}
              animate={{ width: `${(stats.completed / stats.total) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        )}

        {/* Add task form */}
        <form onSubmit={handleAddTask} className="flex gap-2">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Add a task..."
            className="flex-1 bg-neutral-800/50 border border-neutral-700 rounded-lg px-3 py-2 text-sm
              text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-blue-500/50"
          />
          <button
            type="submit"
            disabled={!newTaskTitle.trim()}
            className="px-3 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg
              text-blue-400 text-sm hover:bg-blue-500/20 transition-colors
              disabled:opacity-30 disabled:cursor-not-allowed"
          >
            +
          </button>
        </form>
      </div>

      {/* Filters */}
      <div className="px-4 py-2 border-b border-neutral-800 flex gap-1 overflow-x-auto">
        {(['all', 'not-started', 'in-progress', 'completed', 'blocked'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-2 py-1 text-xs rounded transition-colors whitespace-nowrap ${
              filter === status
                ? 'bg-neutral-700/50 text-neutral-200'
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {status === 'all' ? 'All' : STATUS_CONFIG[status].label}
          </button>
        ))}
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
        <AnimatePresence mode="popLayout">
          {filteredTasks.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8"
            >
              <div className="text-2xl mb-2 opacity-20">📋</div>
              <p className="text-neutral-400 text-sm">No tasks yet</p>
              <p className="text-neutral-500 text-xs">Agents will add tasks as they work</p>
            </motion.div>
          ) : (
            filteredTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onUpdate={updateTask}
                onDelete={deleteTask}
              />
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Footer actions */}
      {stats.completed > 0 && (
        <div className="p-3 border-t border-neutral-800">
          <button
            onClick={clearCompleted}
            className="w-full text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            Clear {stats.completed} completed task{stats.completed > 1 ? 's' : ''}
          </button>
        </div>
      )}
    </div>
  )
}
