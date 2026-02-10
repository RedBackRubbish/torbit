export type IntentKind = 'chat' | 'create' | 'edit' | 'debug' | 'deploy'
export type IntentMode = 'auto' | 'chat' | 'action'

const DEPLOY_PATTERNS = [
  /\bdeploy\b/,
  /\bship\b/,
  /\brelease\b/,
  /\bpublish\b/,
  /\bproduction\b/,
  /\bvercel\b/,
  /\bnetlify\b/,
  /\bapp store\b/,
  /\btestflight\b/,
]

const DEBUG_PATTERNS = [
  /\bdebug\b/,
  /\bfix\b/,
  /\bbug\b/,
  /\berror\b/,
  /\bfailing\b/,
  /\bcrash\b/,
  /\bstack trace\b/,
  /\b500\b/,
  /\b404\b/,
  /\bnot working\b/,
]

const EDIT_PATTERNS = [
  /\bedit\b/,
  /\bchange\b/,
  /\bupdate\b/,
  /\bmodify\b/,
  /\brefactor\b/,
  /\boptimi[sz]e\b/,
  /\badd\b/,
  /\bremove\b/,
  /\brename\b/,
  /\bimprove\b/,
]

const CREATE_PATTERNS = [
  /\bcreate\b/,
  /\bbuild\b/,
  /\bgenerate\b/,
  /\bmake\b/,
  /\bscaffold\b/,
  /\bstart\b/,
  /\bnew app\b/,
  /\bnew project\b/,
  /\bfrom scratch\b/,
]

const CHAT_LEAD_PATTERNS = [
  /^hey\b/,
  /^hi\b/,
  /^hello\b/,
  /^what\b/,
  /^why\b/,
  /^how\b/,
  /^when\b/,
  /^where\b/,
  /^who\b/,
  /^can you explain\b/,
  /^should we\b/,
  /^is it\b/,
  /^help me understand\b/,
]

const SUPPORT_CHAT_PATTERNS = [
  /\bencouragement\b/,
  /\bmotivat(e|ion)\b/,
  /\boverwhelm(ed|ing)?\b/,
  /\bstress(ed|ful)?\b/,
  /\bstuck\b/,
  /\bconfidence\b/,
  /\bpep talk\b/,
  /\bimposter syndrome\b/,
  /\bi need support\b/,
  /\bi need advice\b/,
]

const ACTION_CUE_PATTERNS = [
  /\bfix\b/,
  /\bdebug\b/,
  /\bdeploy\b/,
  /\bship\b/,
  /\brelease\b/,
  /\bbuild\b/,
  /\bcreate\b/,
  /\bedit\b/,
  /\bupdate\b/,
  /\bmodify\b/,
  /\brefactor\b/,
  /\bimplement\b/,
  /\badd\b/,
  /\bremove\b/,
]

function hasAnyPattern(input: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(input))
}

export function classifyIntent(message: string): IntentKind {
  const normalized = message.toLowerCase().trim()
  if (!normalized) return 'chat'

  const isQuestion = normalized.endsWith('?')
  const hasActionCue = hasAnyPattern(normalized, ACTION_CUE_PATTERNS)
  const looksConversational = hasAnyPattern(normalized, CHAT_LEAD_PATTERNS)
  const supportChatCue = hasAnyPattern(normalized, SUPPORT_CHAT_PATTERNS)

  if (supportChatCue && !hasActionCue) {
    return 'chat'
  }

  if (isQuestion && looksConversational && !hasActionCue) {
    return 'chat'
  }

  if (hasAnyPattern(normalized, DEPLOY_PATTERNS)) return 'deploy'
  if (hasAnyPattern(normalized, DEBUG_PATTERNS)) return 'debug'
  if (hasAnyPattern(normalized, EDIT_PATTERNS)) return 'edit'
  if (hasAnyPattern(normalized, CREATE_PATTERNS)) return 'create'

  if (isQuestion || looksConversational) return 'chat'

  return 'chat'
}

export function resolveIntent(message: string, mode: IntentMode = 'auto'): IntentKind {
  const classified = classifyIntent(message)

  if (mode === 'chat') {
    return 'chat'
  }

  if (mode === 'action') {
    return classified === 'chat' ? 'create' : classified
  }

  return classified
}

export function isActionIntent(intent: IntentKind): boolean {
  return intent !== 'chat'
}
