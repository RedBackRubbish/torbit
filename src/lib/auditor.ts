/**
 * TORBIT - File Auditor Service
 * 
 * Validates files against the codebase for:
 * - Import/export consistency
 * - Type safety
 * - Missing dependencies
 * - Code quality issues
 */

export type AuditStatus = 'new' | 'auditing' | 'passed' | 'warning' | 'error'

export interface AuditIssue {
  type: 'error' | 'warning' | 'info'
  message: string
  line?: number
  column?: number
}

export interface AuditResult {
  status: AuditStatus
  issues: AuditIssue[]
  auditedAt: number
  duration: number
}

interface FileContext {
  path: string
  content: string
}

/**
 * Auditor - Validates files against the codebase
 */
export class Auditor {
  private static instance: Auditor
  private auditQueue: Map<string, NodeJS.Timeout> = new Map()
  private results: Map<string, AuditResult> = new Map()
  private listeners: Set<(fileId: string, result: AuditResult) => void> = new Set()
  
  static getInstance(): Auditor {
    if (!Auditor.instance) {
      Auditor.instance = new Auditor()
    }
    return Auditor.instance
  }
  
  /**
   * Subscribe to audit updates
   */
  subscribe(callback: (fileId: string, result: AuditResult) => void): () => void {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }
  
  /**
   * Notify all listeners
   */
  private notify(fileId: string, result: AuditResult) {
    this.listeners.forEach(cb => cb(fileId, result))
  }
  
  /**
   * Queue a file for audit (debounced)
   */
  queueAudit(fileId: string, file: FileContext, allFiles: FileContext[], delay: number = 500): void {
    // Cancel existing audit
    const existing = this.auditQueue.get(fileId)
    if (existing) {
      clearTimeout(existing)
    }
    
    // Notify that auditing will start
    this.notify(fileId, {
      status: 'new',
      issues: [],
      auditedAt: Date.now(),
      duration: 0
    })
    
    // Queue new audit
    const timeout = setTimeout(() => {
      this.runAudit(fileId, file, allFiles)
      this.auditQueue.delete(fileId)
    }, delay)
    
    this.auditQueue.set(fileId, timeout)
  }
  
  /**
   * Run audit on a file
   */
  private async runAudit(fileId: string, file: FileContext, allFiles: FileContext[]): Promise<void> {
    const startTime = Date.now()
    
    // Notify auditing started
    this.notify(fileId, {
      status: 'auditing',
      issues: [],
      auditedAt: startTime,
      duration: 0
    })
    
    // Simulate audit time based on file size
    const auditTime = Math.min(300 + (file.content.length / 100), 1500)
    await new Promise(resolve => setTimeout(resolve, auditTime))
    
    // Run validation checks
    const issues = this.validateFile(file, allFiles)
    
    // Determine status
    let status: AuditStatus = 'passed'
    if (issues.some(i => i.type === 'error')) {
      status = 'error'
    } else if (issues.some(i => i.type === 'warning')) {
      status = 'warning'
    }
    
    const result: AuditResult = {
      status,
      issues,
      auditedAt: Date.now(),
      duration: Date.now() - startTime
    }
    
    this.results.set(fileId, result)
    this.notify(fileId, result)
  }
  
  /**
   * Validate a file against the codebase
   */
  private validateFile(file: FileContext, allFiles: FileContext[]): AuditIssue[] {
    const issues: AuditIssue[] = []
    const ext = file.path.split('.').pop()?.toLowerCase() || ''
    
    // Skip non-code files
    if (!['ts', 'tsx', 'js', 'jsx'].includes(ext)) {
      return issues
    }
    
    const lines = file.content.split('\n')
    
    // Check for common issues
    lines.forEach((line, index) => {
      const lineNum = index + 1
      
      // Check for console.log (warning)
      if (line.includes('console.log') && !file.path.includes('debug')) {
        issues.push({
          type: 'warning',
          message: 'console.log statement found',
          line: lineNum
        })
      }
      
      // Check for TODO/FIXME comments (info)
      if (/\/\/\s*(TODO|FIXME|HACK|XXX)/i.test(line)) {
        issues.push({
          type: 'info',
          message: 'TODO comment found',
          line: lineNum
        })
      }
      
      // Check for any type usage (warning)
      if (/:\s*any\b/.test(line) || /<any>/.test(line)) {
        issues.push({
          type: 'warning',
          message: 'Usage of "any" type detected',
          line: lineNum
        })
      }
    })
    
    // Check imports resolve to existing files
    const importMatches = file.content.matchAll(/from\s+['"]([^'"]+)['"]/g)
    for (const match of importMatches) {
      const importPath = match[1]
      
      // Skip node_modules and alias imports
      if (importPath.startsWith('@/') || 
          importPath.startsWith('.') ||
          !importPath.startsWith('.')) {
        // For relative imports, check if file exists
        if (importPath.startsWith('.')) {
          const resolvedPath = this.resolveImport(file.path, importPath)
          const exists = allFiles.some(f => 
            f.path === resolvedPath || 
            f.path === resolvedPath + '.ts' ||
            f.path === resolvedPath + '.tsx' ||
            f.path === resolvedPath + '/index.ts' ||
            f.path === resolvedPath + '/index.tsx'
          )
          
          if (!exists && !importPath.includes('node_modules')) {
            // Don't error on common framework imports
            if (!['react', 'next', 'framer-motion', 'lucide-react'].some(pkg => 
              importPath.includes(pkg)
            )) {
              issues.push({
                type: 'warning',
                message: `Import "${importPath}" may not resolve`,
                line: this.findImportLine(lines, importPath)
              })
            }
          }
        }
      }
    }
    
    // Check for missing exports in components
    if (file.path.includes('components/') && ext === 'tsx') {
      if (!file.content.includes('export ')) {
        issues.push({
          type: 'warning',
          message: 'Component has no exports'
        })
      }
    }
    
    // Check for empty files
    if (file.content.trim().length < 10) {
      issues.push({
        type: 'warning',
        message: 'File appears to be empty or minimal'
      })
    }
    
    return issues
  }
  
  /**
   * Resolve relative import path
   */
  private resolveImport(fromPath: string, importPath: string): string {
    const fromDir = fromPath.split('/').slice(0, -1).join('/')
    const parts = importPath.split('/')
    const result = fromDir.split('/')
    
    for (const part of parts) {
      if (part === '.') continue
      if (part === '..') {
        result.pop()
      } else {
        result.push(part)
      }
    }
    
    return result.join('/')
  }
  
  /**
   * Find line number of import statement
   */
  private findImportLine(lines: string[], importPath: string): number {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(importPath)) {
        return i + 1
      }
    }
    return 1
  }
  
  /**
   * Get audit result for a file
   */
  getResult(fileId: string): AuditResult | undefined {
    return this.results.get(fileId)
  }
  
  /**
   * Clear audit results
   */
  clear(): void {
    this.auditQueue.forEach(timeout => clearTimeout(timeout))
    this.auditQueue.clear()
    this.results.clear()
  }
}

// Export singleton
export const auditor = Auditor.getInstance()
