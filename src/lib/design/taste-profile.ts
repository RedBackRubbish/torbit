export interface TasteProfile {
  likes: string[]
  avoids: string[]
  directives: string[]
  runStats: {
    total: number
    successful: number
    failed: number
  }
  updatedAt: number
}

export interface TasteUpdate {
  likes: string[]
  avoids: string[]
  directives: string[]
}

const LIKE_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bminimal\b|\bclean\b|\bsimple\b/, label: 'minimal visual hierarchy' },
  { pattern: /\bpremium\b|\bluxury\b|\bhigh[- ]end\b/, label: 'premium polished styling' },
  { pattern: /\bbold\b|\bexpressive\b|\bstatement\b/, label: 'bold expressive presentation' },
  { pattern: /\bfast\b|\bsnappy\b|\bperformance\b/, label: 'snappy interactions and performance-first UI' },
  { pattern: /\bmobile[- ]first\b|\bresponsive\b/, label: 'mobile-first responsive layouts' },
  { pattern: /\baccessible\b|\ba11y\b/, label: 'accessibility-first UX decisions' },
  { pattern: /\banimation\b|\bmotion\b|\bmicro[- ]interaction\b/, label: 'purposeful motion and transitions' },
  { pattern: /\btypography\b|\bfont\b/, label: 'strong typography direction' },
]

const AVOID_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bno clutter\b|\bavoid clutter\b|\btoo busy\b/, label: 'cluttered layouts' },
  { pattern: /\bno purple\b|\bavoid purple\b/, label: 'purple-heavy color systems' },
  { pattern: /\bno dark mode\b|\bavoid dark mode\b/, label: 'dark-only theme assumptions' },
  { pattern: /\bno boilerplate\b|\bgeneric\b|\bai slop\b/, label: 'generic boilerplate UI patterns' },
  { pattern: /\bavoid gradients everywhere\b|\bno rainbow\b/, label: 'overdecorated gradient treatments' },
]

const DIRECTIVE_HINT_PATTERN = /\b(ui|design|layout|theme|color|typography|animation|motion|style|aesthetic|brand|vibe|look|feel)\b/i
const EXPLICIT_AVOID_PATTERN = /\b(?:no|avoid|without)\s+([a-z0-9][a-z0-9\s-]{2,40})/gi

function normalizePhrase(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\.$/, '')
}

function uniqueOrdered(values: string[], limit: number): string[] {
  const unique: string[] = []
  const seen = new Set<string>()

  for (const value of values) {
    const normalized = normalizePhrase(value)
    if (!normalized) continue
    const key = normalized.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(normalized)
    if (unique.length >= limit) break
  }

  return unique
}

export function createEmptyTasteProfile(now: number = Date.now()): TasteProfile {
  return {
    likes: [],
    avoids: [],
    directives: [],
    runStats: {
      total: 0,
      successful: 0,
      failed: 0,
    },
    updatedAt: now,
  }
}

export function deriveTasteUpdateFromPrompt(prompt: string): TasteUpdate {
  const normalized = prompt.trim().toLowerCase()
  if (!normalized) {
    return { likes: [], avoids: [], directives: [] }
  }

  const likes = LIKE_PATTERNS
    .filter((entry) => entry.pattern.test(normalized))
    .map((entry) => entry.label)

  const avoids = AVOID_PATTERNS
    .filter((entry) => entry.pattern.test(normalized))
    .map((entry) => entry.label)

  for (const match of normalized.matchAll(EXPLICIT_AVOID_PATTERN)) {
    const phrase = normalizePhrase(match[1] || '')
    if (phrase.length >= 3) {
      avoids.push(phrase)
    }
  }

  const directives = prompt
    .split(/\n+|(?<=[.!?])\s+/)
    .map((sentence) => normalizePhrase(sentence))
    .filter((sentence) => sentence.length >= 8 && sentence.length <= 180)
    .filter((sentence) => DIRECTIVE_HINT_PATTERN.test(sentence))

  return {
    likes: uniqueOrdered(likes, 10),
    avoids: uniqueOrdered(avoids, 10),
    directives: uniqueOrdered(directives, 8),
  }
}

export function mergeTasteProfile(
  profile: TasteProfile,
  update: TasteUpdate,
  now: number = Date.now()
): TasteProfile {
  const existingDirectiveKeys = new Set(
    profile.directives.map((directive) => normalizePhrase(directive).toLowerCase())
  )
  const freshDirectives = update.directives.filter((directive) => (
    !existingDirectiveKeys.has(normalizePhrase(directive).toLowerCase())
  ))

  return {
    ...profile,
    likes: uniqueOrdered([...update.likes, ...profile.likes], 10),
    avoids: uniqueOrdered([...update.avoids, ...profile.avoids], 10),
    directives: uniqueOrdered([...freshDirectives, ...profile.directives], 8),
    updatedAt: now,
  }
}

export function recordTasteRunOutcome(
  profile: TasteProfile,
  success: boolean,
  now: number = Date.now()
): TasteProfile {
  return {
    ...profile,
    runStats: {
      total: profile.runStats.total + 1,
      successful: profile.runStats.successful + (success ? 1 : 0),
      failed: profile.runStats.failed + (success ? 0 : 1),
    },
    updatedAt: now,
  }
}

function appendSection(lines: string[], title: string, values: string[]) {
  if (values.length === 0) return
  lines.push(title)
  for (const value of values) {
    lines.push(`- ${value}`)
  }
  lines.push('')
}

export function buildTasteProfilePrompt(profile: TasteProfile): string | null {
  const hasSignals = profile.likes.length > 0 || profile.avoids.length > 0 || profile.directives.length > 0
  if (!hasSignals) return null

  const lines: string[] = [
    '## PERSISTED USER TASTE PROFILE',
    'Respect these preferences unless the latest user request explicitly overrides them.',
    '',
  ]

  appendSection(lines, 'Preferred style directions:', profile.likes)
  appendSection(lines, 'Avoid these directions:', profile.avoids)
  appendSection(lines, 'Recent explicit design directives:', profile.directives.slice(0, 5))

  if (profile.runStats.total > 0) {
    lines.push(
      `Execution reliability: ${profile.runStats.successful}/${profile.runStats.total} successful implementation runs.`
    )
  }

  lines.push('Prioritize newest user instructions if they conflict with older preferences.')
  return lines.join('\n').trim()
}
