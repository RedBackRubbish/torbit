import { describe, it, expect } from 'vitest'
import { GOD_PROMPT, GOD_PROMPT_COMPACT } from './god-prompt'

describe('God Prompt', () => {
  describe('GOD_PROMPT', () => {
    it('should be defined and non-empty', () => {
      expect(GOD_PROMPT).toBeDefined()
      expect(GOD_PROMPT.length).toBeGreaterThan(1000)
    })

    describe('Identity Section', () => {
      it('should establish TORBIT identity', () => {
        expect(GOD_PROMPT).toContain('TORBIT')
        expect(GOD_PROMPT).toContain('autonomous')
      })

      it('should describe body metaphor', () => {
        expect(GOD_PROMPT).toContain('Hands')
        expect(GOD_PROMPT).toContain('Muscle')
        expect(GOD_PROMPT).toContain('Eyes')
        expect(GOD_PROMPT).toContain('Nerves')
      })

      it('should explain WebContainer context', () => {
        expect(GOD_PROMPT).toContain('WebContainer')
        expect(GOD_PROMPT).toContain('Node.js')
        expect(GOD_PROMPT).toContain('browser')
      })
    })

    describe('Tools Section', () => {
      it('should list file operations', () => {
        expect(GOD_PROMPT).toContain('createFile')
        expect(GOD_PROMPT).toContain('editFile')
        expect(GOD_PROMPT).toContain('readFile')
        expect(GOD_PROMPT).toContain('listFiles')
        expect(GOD_PROMPT).toContain('deleteFile')
      })

      it('should list terminal operations', () => {
        expect(GOD_PROMPT).toContain('runTerminal')
        expect(GOD_PROMPT).toContain('installPackage')
        expect(GOD_PROMPT).toContain('runTests')
      })

      it('should emphasize tool usage', () => {
        expect(GOD_PROMPT).toContain('USE THEM')
        expect(GOD_PROMPT).toMatch(/don.*t just describe/i)
      })
    })

    describe('Nervous System Section', () => {
      it('should explain pain signals', () => {
        expect(GOD_PROMPT).toContain('SYSTEM ALERT')
        expect(GOD_PROMPT).toContain('pain')
      })

      it('should list error types', () => {
        expect(GOD_PROMPT).toContain('DEPENDENCY_ERROR')
        expect(GOD_PROMPT).toContain('SYNTAX_ERROR')
        expect(GOD_PROMPT).toContain('TYPE_ERROR')
        expect(GOD_PROMPT).toContain('HYDRATION_ERROR')
        expect(GOD_PROMPT).toContain('BUILD_ERROR')
      })

      it('should emphasize immediate fixing', () => {
        expect(GOD_PROMPT).toContain('FIX IMMEDIATELY')
        expect(GOD_PROMPT).toMatch(/don.*t.*ask.*permission/i)
      })
    })

    describe('Fuel System Section', () => {
      it('should explain fuel economics', () => {
        expect(GOD_PROMPT).toContain('fuel')
        expect(GOD_PROMPT).toContain('Fuel Cost')
      })

      it('should list fuel costs', () => {
        expect(GOD_PROMPT).toContain('Read a file')
        expect(GOD_PROMPT).toContain('Create/Edit')
        expect(GOD_PROMPT).toContain('Run terminal')
      })

      it('should promote efficiency', () => {
        expect(GOD_PROMPT).toContain('EFFICIENCY')
        expect(GOD_PROMPT).toContain('efficient')
      })
    })

    describe('Auditor Guarantee Section', () => {
      it('should explain refund mechanism', () => {
        expect(GOD_PROMPT).toContain('REFUND')
        expect(GOD_PROMPT).toContain('Auditor')
      })

      it('should set quality expectations', () => {
        expect(GOD_PROMPT).toContain('COMPILES')
        expect(GOD_PROMPT).toContain('TypeScript')
      })
    })

    describe('Workflow Protocol', () => {
      it('should outline phases', () => {
        expect(GOD_PROMPT).toContain('Reconnaissance')
        expect(GOD_PROMPT).toContain('Execution')
        expect(GOD_PROMPT).toContain('Verification')
      })

      it('should mention key steps', () => {
        expect(GOD_PROMPT).toContain('listFiles')
        expect(GOD_PROMPT).toContain('readFile')
        expect(GOD_PROMPT).toContain('npm run build')
      })
    })

    describe('Behavioral Directives', () => {
      it('should list DO directives', () => {
        expect(GOD_PROMPT).toContain('autonomous')
        expect(GOD_PROMPT).toContain('proactive')
        expect(GOD_PROMPT).toContain('thorough')
      })

      it("should list DON'T directives", () => {
        expect(GOD_PROMPT).toContain("Don't hallucinate")
        expect(GOD_PROMPT).toContain('TODO')
        expect(GOD_PROMPT).toContain('permission')
      })
    })

    describe('Tech Stack Section', () => {
      it('should specify Next.js version', () => {
        expect(GOD_PROMPT).toContain('Next.js 15')
      })

      it('should mention React version', () => {
        expect(GOD_PROMPT).toContain('React 19')
      })

      it('should list key technologies', () => {
        expect(GOD_PROMPT).toContain('TypeScript')
        expect(GOD_PROMPT).toContain('Tailwind')
        expect(GOD_PROMPT).toContain('Zustand')
        expect(GOD_PROMPT).toContain('App Router')
      })

      it('should list file conventions', () => {
        expect(GOD_PROMPT).toContain('app/')
        expect(GOD_PROMPT).toContain('components/')
        expect(GOD_PROMPT).toContain('lib/')
      })
    })

    describe('Failure Modes', () => {
      it('should list anti-patterns', () => {
        expect(GOD_PROMPT).toContain('Apologizer')
        expect(GOD_PROMPT).toContain('Narrator')
        expect(GOD_PROMPT).toContain('Asker')
        expect(GOD_PROMPT).toContain('Stubber')
        expect(GOD_PROMPT).toContain('Hallucinator')
      })
    })

    describe('Format and Structure', () => {
      it('should use markdown formatting', () => {
        expect(GOD_PROMPT).toContain('##')
        expect(GOD_PROMPT).toContain('**')
        expect(GOD_PROMPT).toContain('```')
        expect(GOD_PROMPT).toContain('|')
      })

      it('should have proper sections', () => {
        expect(GOD_PROMPT).toContain('## 🧠 YOUR IDENTITY')
        expect(GOD_PROMPT).toContain('## 🛠️ YOUR TOOLS')
        expect(GOD_PROMPT).toContain('## 🔴 THE NERVOUS SYSTEM')
        expect(GOD_PROMPT).toContain('## ⛽ THE FUEL SYSTEM')
      })
    })
  })

  describe('GOD_PROMPT_COMPACT', () => {
    it('should be defined and shorter than full prompt', () => {
      expect(GOD_PROMPT_COMPACT).toBeDefined()
      expect(GOD_PROMPT_COMPACT.length).toBeLessThan(GOD_PROMPT.length)
      expect(GOD_PROMPT_COMPACT.length).toBeLessThan(1000)
    })

    it('should contain essential elements', () => {
      expect(GOD_PROMPT_COMPACT).toContain('TORBIT')
      expect(GOD_PROMPT_COMPACT).toContain('WebContainer')
    })

    it('should list tools', () => {
      expect(GOD_PROMPT_COMPACT).toContain('createFile')
      expect(GOD_PROMPT_COMPACT).toContain('runTerminal')
    })

    it('should have core rules', () => {
      expect(GOD_PROMPT_COMPACT).toContain('USE TOOLS')
      expect(GOD_PROMPT_COMPACT).toContain('SYSTEM ALERT')
      expect(GOD_PROMPT_COMPACT).toContain('fuel')
    })

    it('should mention tech stack', () => {
      expect(GOD_PROMPT_COMPACT).toContain('Next.js')
      expect(GOD_PROMPT_COMPACT).toContain('TypeScript')
      expect(GOD_PROMPT_COMPACT).toContain('App Router')
    })
  })

  describe('Prompt Quality', () => {
    it('should not have incomplete placeholder text', () => {
      expect(GOD_PROMPT).not.toContain('FIXME')
      expect(GOD_PROMPT).not.toContain('lorem ipsum')
      expect(GOD_PROMPT).not.toContain('[INSERT')
      expect(GOD_PROMPT).not.toContain('XXX')
    })

    it('should mention TODO as an anti-pattern', () => {
      // The prompt tells the AI not to leave TODOs
      expect(GOD_PROMPT).toContain('TODO')
      expect(GOD_PROMPT).toMatch(/don.*t.*leave.*TODO/i)
    })

    it('should have consistent TORBIT terminology', () => {
      // Should use consistent terms throughout
      const torbitCount = (GOD_PROMPT.match(/TORBIT/gi) || []).length
      expect(torbitCount).toBeGreaterThan(0)
    })

    it('should be properly escaped for use in code', () => {
      // Should not break when used as a string
      expect(() => {
        const _ = `${GOD_PROMPT}`
      }).not.toThrow()
    })
  })
})
