import { describe, it, expect } from 'vitest'
import { GOD_PROMPT, GOD_PROMPT_COMPACT, GOD_PROMPT_ENV } from './god-prompt'

describe('God Prompt', () => {
  describe('GOD_PROMPT', () => {
    it('should be defined and non-empty', () => {
      expect(GOD_PROMPT).toBeDefined()
      expect(GOD_PROMPT.length).toBeGreaterThan(500)
    })

    describe('Identity Section', () => {
      it('should establish TORBIT identity', () => {
        expect(GOD_PROMPT).toContain('TORBIT')
        expect(GOD_PROMPT).toContain('expert AI coding assistant')
      })

      it('should describe personality', () => {
        expect(GOD_PROMPT).toContain('personality')
        expect(GOD_PROMPT).toContain('senior developer')
        expect(GOD_PROMPT).toContain('excited')
      })
    })

    describe('Tools Section', () => {
      it('should list file operations', () => {
        expect(GOD_PROMPT).toContain('createFile')
        expect(GOD_PROMPT).toContain('editFile')
        expect(GOD_PROMPT).toContain('readFile')
      })

      it('should list terminal operations', () => {
        expect(GOD_PROMPT).toContain('runTerminal')
      })

      it('should emphasize tool usage', () => {
        expect(GOD_PROMPT).toContain('ALWAYS use the createFile tool')
        expect(GOD_PROMPT).toContain('NEVER output code blocks')
      })
    })

    describe('Critical Rules', () => {
      it('should have clear rules section', () => {
        expect(GOD_PROMPT).toContain('CRITICAL RULES')
        expect(GOD_PROMPT).toContain('NEVER')
        expect(GOD_PROMPT).toContain('ALWAYS')
      })

      it('should prohibit code blocks in response', () => {
        expect(GOD_PROMPT).toContain('NEVER output code blocks')
        expect(GOD_PROMPT).toContain('NEVER put code in')
      })
    })

    describe('Tech Stack', () => {
      it('should specify the stack', () => {
        expect(GOD_PROMPT).toContain('Next.js')
        expect(GOD_PROMPT).toContain('React')
        expect(GOD_PROMPT).toContain('TypeScript')
        expect(GOD_PROMPT).toContain('Tailwind')
      })

      it('should mention Framer Motion', () => {
        expect(GOD_PROMPT).toContain('Framer Motion')
      })

      it('should mention Zustand', () => {
        expect(GOD_PROMPT).toContain('Zustand')
      })
    })

    describe('Design Approach', () => {
      it('should support multiple themes', () => {
        expect(GOD_PROMPT).toContain('Light mode')
        expect(GOD_PROMPT).toContain('Dark mode')
        expect(GOD_PROMPT).toContain('Colorful')
        expect(GOD_PROMPT).toContain('Luxury')
      })

      it('should have default theme', () => {
        expect(GOD_PROMPT).toContain('Default:')
        expect(GOD_PROMPT).toContain('dark')
      })
    })

    describe('What NOT To Do', () => {
      it('should list anti-patterns', () => {
        expect(GOD_PROMPT).toContain('What NOT To Do')
        expect(GOD_PROMPT).toContain('NEVER show file contents in chat')
        expect(GOD_PROMPT).toContain('NEVER write long walls of text')
        expect(GOD_PROMPT).toContain('NEVER be robotic')
      })
    })

    describe('Communication Style', () => {
      it('should have example response', () => {
        expect(GOD_PROMPT).toContain('Example response')
        expect(GOD_PROMPT).toContain('todo app')
      })

      it('should encourage celebration', () => {
        expect(GOD_PROMPT).toContain('Done!')
        expect(GOD_PROMPT).toContain('🚀')
      })
    })

    describe('Format and Structure', () => {
      it('should use markdown formatting', () => {
        expect(GOD_PROMPT).toContain('##')
        expect(GOD_PROMPT).toContain('**')
      })

      it('should have proper sections', () => {
        expect(GOD_PROMPT).toContain('## YOUR PERSONALITY')
        expect(GOD_PROMPT).toContain('## CRITICAL RULES')
        expect(GOD_PROMPT).toContain('## Tools')
        expect(GOD_PROMPT).toContain('## Tech Stack')
      })
    })
  })

  describe('GOD_PROMPT_COMPACT', () => {
    it('should be defined', () => {
      expect(GOD_PROMPT_COMPACT).toBeDefined()
    })

    it('should equal GOD_PROMPT (simplified version)', () => {
      expect(GOD_PROMPT_COMPACT).toBe(GOD_PROMPT)
    })

    it('should contain essential elements', () => {
      expect(GOD_PROMPT_COMPACT).toContain('TORBIT')
      expect(GOD_PROMPT_COMPACT).toContain('createFile')
    })
  })

  describe('GOD_PROMPT_ENV', () => {
    it('should be defined', () => {
      expect(GOD_PROMPT_ENV).toBeDefined()
    })

    it('should escape newlines for env var use', () => {
      expect(GOD_PROMPT_ENV).toContain('\\n')
      expect(GOD_PROMPT_ENV).not.toContain('\n\n')
    })

    it('should escape backticks', () => {
      expect(GOD_PROMPT_ENV).not.toContain('`')
    })
  })

  describe('Prompt Quality', () => {
    it('should be concise but complete', () => {
      // The prompt should be reasonably sized (not bloated)
      expect(GOD_PROMPT.length).toBeLessThan(5000)
      expect(GOD_PROMPT.length).toBeGreaterThan(1000)
    })

    it('should have clear structure', () => {
      const sections = GOD_PROMPT.match(/## /g)
      expect(sections).not.toBeNull()
      expect(sections!.length).toBeGreaterThanOrEqual(5)
    })

    it('should be action-oriented', () => {
      expect(GOD_PROMPT).toContain('Build')
      expect(GOD_PROMPT).toContain('ship')
    })
  })
})
