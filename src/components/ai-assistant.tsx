"use client"

import { Component, useState, useRef, useEffect, type ReactNode } from "react"
import { MessageCircle, X, Send, Bot, Loader2, Sparkles } from "lucide-react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { Button } from "@/components/ui/button"
import { useCopilotActions, type CopilotAction } from "@/context/copilot-actions"

const API_BASE = import.meta.env.VITE_API_URL ?? ""

interface Msg { role: "user" | "assistant"; content: string }

const WELCOME =
  "Hi! I'm your SD AI Solutions assistant. I can help you draft outreach messages, understand your agent performance, or jump you to the right page. What can I help with?"

// Matches an optional action directive a future backend could emit, e.g.
//   "Sure, opening it now. <<action:goto_analytics>>"
const ACTION_DIRECTIVE = /<<action:([a-z0-9_]+)>>/gi

// Isolated error boundary — if the widget ever throws, it disappears
// silently and NEVER takes down the rest of the portal.
class WidgetBoundary extends Component<{ children: ReactNode }, { dead: boolean }> {
  state = { dead: false }
  static getDerivedStateFromError() { return { dead: true } }
  render() { return this.state.dead ? null : this.props.children }
}

function AssistantInner() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([{ role: "assistant", content: WELCOME }])
  const [input, setInput] = useState("")
  const [streaming, setStreaming] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion()

  const { actions, readables, runAction, matchIntent } = useCopilotActions()
  const chipActions = actions.filter(a => a.chipLabel).slice(0, 5)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages, open])

  function pushAssistant(content: string) {
    setMessages(m => [...m, { role: "assistant", content }])
  }

  // Run an action and acknowledge it in the conversation.
  async function executeAction(action: CopilotAction, ack: string) {
    pushAssistant(ack)
    try { await runAction(action.name) } catch { /* handler is best-effort */ }
  }

  // Click on a suggested-action chip.
  async function onChip(action: CopilotAction) {
    setMessages(m => [...m, { role: "user", content: action.chipLabel! }])
    await executeAction(action, `Opening ${action.chipLabel} for you…`)
  }

  // Strip + run any action directive the assistant streamed back.
  function handleDirectives(text: string): string {
    const names = [...text.matchAll(ACTION_DIRECTIVE)].map(m => m[1])
    for (const name of names) {
      runAction(name).catch(() => {})
    }
    return text.replace(ACTION_DIRECTIVE, "").trim()
  }

  async function send(rawText?: string) {
    const text = (rawText ?? input).trim()
    if (!text || streaming) return

    const next = [...messages, { role: "user" as const, content: text }]
    setMessages(next)
    setInput("")

    // 1) Try to satisfy the request locally as a direct action (navigation, etc.)
    const intent = matchIntent(text)
    if (intent) {
      await executeAction(intent, `On it — opening ${intent.chipLabel ?? intent.name.replace(/_/g, " ")}…`)
      return
    }

    // 2) Otherwise stream a normal answer from the backend.
    setStreaming(true)
    setMessages(m => [...m, { role: "assistant", content: "" }])

    try {
      const token = localStorage.getItem("sdai_token")
      // Forward page context (forward-compatible; ignored by older backends).
      const context = readables.map(r => ({ description: r.description, value: r.value }))
      const res = await fetch(`${API_BASE}/api/v1/assistant/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ messages: next, context }),
      })
      if (!res.ok || !res.body) throw new Error(String(res.status))

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n\n")
        buffer = lines.pop() ?? ""
        for (const line of lines) {
          const m = line.match(/^data: (.*)$/s)
          if (!m) continue
          try {
            const evt = JSON.parse(m[1])
            if (evt.token) {
              setMessages(prev => {
                const copy = [...prev]
                copy[copy.length - 1] = {
                  role: "assistant",
                  content: copy[copy.length - 1].content + evt.token,
                }
                return copy
              })
            } else if (evt.error) {
              setMessages(prev => {
                const copy = [...prev]
                copy[copy.length - 1] = { role: "assistant", content: evt.error }
                return copy
              })
            }
          } catch { /* ignore malformed chunk */ }
        }
      }

      // After streaming, execute + strip any action directive in the reply.
      setMessages(prev => {
        const copy = [...prev]
        const last = copy[copy.length - 1]
        if (last?.role === "assistant" && ACTION_DIRECTIVE.test(last.content)) {
          ACTION_DIRECTIVE.lastIndex = 0
          copy[copy.length - 1] = { role: "assistant", content: handleDirectives(last.content) }
        }
        return copy
      })
    } catch {
      setMessages(prev => {
        const copy = [...prev]
        const last = copy[copy.length - 1]
        if (last && last.role === "assistant" && !last.content) {
          copy[copy.length - 1] = {
            role: "assistant",
            content: "Sorry — I couldn't reach the assistant right now. Please try again in a moment.",
          }
        }
        return copy
      })
    } finally {
      setStreaming(false)
    }
  }

  const panelMotion = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 16, scale: 0.96 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: 16, scale: 0.96 },
        transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
      }

  return (
    <>
      {/* Floating launcher */}
      <AnimatePresence>
        {!open && (
          <motion.button
            {...(reduceMotion ? {} : { initial: { scale: 0 }, animate: { scale: 1 }, exit: { scale: 0 } })}
            onClick={() => setOpen(true)}
            className="fixed bottom-5 right-5 z-50 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105"
            aria-label="Open AI assistant"
          >
            <MessageCircle className="size-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            {...panelMotion}
            className="fixed bottom-5 right-5 z-50 flex h-[min(600px,80vh)] w-[min(400px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-full bg-primary/10">
                  <Bot className="size-4 text-primary" />
                </div>
                <div>
                  <div className="text-sm font-semibold leading-tight">AI Assistant</div>
                  <div className="text-[11px] text-muted-foreground leading-tight">SD AI Solutions</div>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="size-8" onClick={() => setOpen(false)}>
                <X className="size-4" />
              </Button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {m.content || (streaming && i === messages.length - 1
                      ? <Loader2 className="size-4 animate-spin" />
                      : "")}
                  </div>
                </div>
              ))}
            </div>

            {/* Suggested actions */}
            {chipActions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 border-t px-3 pt-2.5">
                {chipActions.map(a => (
                  <button
                    key={a.name}
                    onClick={() => onChip(a)}
                    disabled={streaming}
                    className="inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-foreground disabled:opacity-50"
                  >
                    <Sparkles className="size-3 text-primary" />
                    {a.chipLabel}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="border-t p-3 pt-2.5">
              <div className="flex items-end gap-2">
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send() }
                  }}
                  placeholder="Ask anything, or say “open analytics”…"
                  rows={1}
                  className="max-h-28 flex-1 resize-none rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
                <Button size="icon" className="size-9 shrink-0 rounded-xl" onClick={() => send()} disabled={streaming || !input.trim()}>
                  {streaming ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export function AIAssistant() {
  return (
    <WidgetBoundary>
      <AssistantInner />
    </WidgetBoundary>
  )
}
