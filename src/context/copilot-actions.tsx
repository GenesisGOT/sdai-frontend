"use client"

/**
 * copilot-actions.tsx
 *
 * A lightweight, framework-free action layer that gives the in-app AI assistant
 * the ability to DO things in the dashboard — navigate, set goals, open forms —
 * with the same developer ergonomics as CopilotKit's `useCopilotAction` /
 * `useCopilotReadable`, but WITHOUT the crash-prone CopilotKit AGUI runtime that
 * previously took down the portal.
 *
 * How it's used:
 *   // register an action a page/component can perform
 *   useCopilotAction({
 *     name: "navigate",
 *     description: "Go to a page in the app",
 *     chipLabel: "Open Analytics",          // optional → shows as a one-tap chip
 *     keywords: ["analytics", "stats"],     // optional → local intent matching
 *     handler: () => navigate("/analytics"),
 *   })
 *
 *   // expose live data so the assistant can reason about it
 *   useCopilotReadable({ description: "Dashboard stats", value: data })
 *
 * The assistant widget (ai-assistant.tsx) consumes this registry to render
 * suggested-action chips, match simple navigation intents locally, and forward
 * readable context to the backend.
 */

import * as React from "react"
import {
  createContext, useContext, useEffect, useMemo, useRef, useState,
} from "react"

export interface CopilotAction {
  /** Unique, stable action name. */
  name: string
  /** Plain-language description of what the action does. */
  description: string
  /** If set, the assistant shows a one-tap chip with this label. */
  chipLabel?: string
  /** Lucide icon name hint for the chip (optional). */
  chipIcon?: string
  /** Phrases that should locally trigger this action when the user types them. */
  keywords?: string[]
  /** Performs the action. May receive args (from a future structured tool-call). */
  handler: (args?: Record<string, unknown>) => void | Promise<void>
}

export interface ReadableEntry {
  id: string
  description: string
  value: unknown
}

interface CopilotActionsContextValue {
  actions: CopilotAction[]
  readables: ReadableEntry[]
  registerAction: (action: CopilotAction) => () => void
  registerReadable: (entry: ReadableEntry) => () => void
  runAction: (name: string, args?: Record<string, unknown>) => Promise<boolean>
  /** Conservative local matcher: returns an action if the text reads like a command. */
  matchIntent: (text: string) => CopilotAction | null
}

const CopilotActionsContext = createContext<CopilotActionsContextValue | null>(null)

const INTENT_VERBS = [
  "go", "open", "show", "take me", "navigate", "view", "see", "bring", "jump", "switch",
]

let idCounter = 0
function nextId() {
  idCounter += 1
  return `copilot-${idCounter}`
}

export function CopilotActionsProvider({ children }: { children: React.ReactNode }) {
  const [actions, setActions] = useState<CopilotAction[]>([])
  const [readables, setReadables] = useState<ReadableEntry[]>([])
  // Keep a live ref so runAction/matchIntent always see the latest registry.
  const actionsRef = useRef<CopilotAction[]>([])
  actionsRef.current = actions

  const registerAction = React.useCallback((action: CopilotAction) => {
    setActions(prev => {
      const filtered = prev.filter(a => a.name !== action.name)
      return [...filtered, action]
    })
    return () => {
      setActions(prev => prev.filter(a => a !== action))
    }
  }, [])

  const registerReadable = React.useCallback((entry: ReadableEntry) => {
    setReadables(prev => [...prev, entry])
    return () => {
      setReadables(prev => prev.filter(r => r !== entry))
    }
  }, [])

  const runAction = React.useCallback(async (name: string, args?: Record<string, unknown>) => {
    const action = actionsRef.current.find(a => a.name === name)
    if (!action) return false
    await action.handler(args)
    return true
  }, [])

  const matchIntent = React.useCallback((text: string): CopilotAction | null => {
    const lower = text.toLowerCase().trim()
    if (lower.length < 3) return null
    const looksLikeCommand =
      lower.split(/\s+/).length <= 6 || INTENT_VERBS.some(v => lower.includes(v))
    if (!looksLikeCommand) return null

    let best: { action: CopilotAction; score: number } | null = null
    for (const action of actionsRef.current) {
      if (!action.keywords?.length) continue
      let score = 0
      for (const kw of action.keywords) {
        if (lower.includes(kw.toLowerCase())) score += kw.length
      }
      if (score > 0 && (!best || score > best.score)) best = { action, score }
    }
    return best?.action ?? null
  }, [])

  const value = useMemo<CopilotActionsContextValue>(
    () => ({ actions, readables, registerAction, registerReadable, runAction, matchIntent }),
    [actions, readables, registerAction, registerReadable, runAction, matchIntent],
  )

  return (
    <CopilotActionsContext.Provider value={value}>
      {children}
    </CopilotActionsContext.Provider>
  )
}

/** Read the registry. Returns a no-op-safe value if used outside the provider. */
export function useCopilotActions(): CopilotActionsContextValue {
  const ctx = useContext(CopilotActionsContext)
  if (ctx) return ctx
  // Graceful fallback so the assistant never crashes if mounted without provider.
  return {
    actions: [],
    readables: [],
    registerAction: () => () => {},
    registerReadable: () => () => {},
    runAction: async () => false,
    matchIntent: () => null,
  }
}

/**
 * Register an action for the lifetime of the calling component.
 * Re-registers if the identifying fields change.
 */
export function useCopilotAction(action: CopilotAction) {
  const { registerAction } = useCopilotActions()
  const ref = useRef(action)
  ref.current = action

  const depKey = `${action.name}|${action.chipLabel ?? ""}|${action.description}|${(action.keywords ?? []).join(",")}`

  useEffect(() => {
    // Register a proxy that always delegates to the latest props via ref.
    return registerAction({
      name: ref.current.name,
      description: ref.current.description,
      chipLabel: ref.current.chipLabel,
      chipIcon: ref.current.chipIcon,
      keywords: ref.current.keywords,
      handler: args => ref.current.handler(args),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registerAction, depKey])
}

/** Expose a piece of live app state to the assistant. */
export function useCopilotReadable(entry: { description: string; value: unknown }) {
  const { registerReadable } = useCopilotActions()
  const ref = useRef(entry)
  ref.current = entry
  const idRef = useRef<string>(nextId())

  const serialized = (() => {
    try { return JSON.stringify(entry.value) } catch { return "" }
  })()

  useEffect(() => {
    return registerReadable({
      id: idRef.current,
      description: ref.current.description,
      value: ref.current.value,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registerReadable, entry.description, serialized])
}
