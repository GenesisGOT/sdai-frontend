"use client"

import { Component, useState, useRef, useEffect, type ReactNode } from "react"
import { MessageCircle, X, Send, Bot, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

const API_BASE = import.meta.env.VITE_API_URL ?? ""

interface Msg { role: "user" | "assistant"; content: string }

const WELCOME =
  "Hi! I'm your SD AI Solutions assistant. I can help you draft outreach messages, understand your agent performance, or answer questions about your campaigns. What can I help with?"

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

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages, open])

  async function send() {
    const text = input.trim()
    if (!text || streaming) return
    const next = [...messages, { role: "user" as const, content: text }]
    setMessages(next)
    setInput("")
    setStreaming(true)
    setMessages(m => [...m, { role: "assistant", content: "" }])

    try {
      const token = localStorage.getItem("sdai_token")
      const res = await fetch(`${API_BASE}/api/v1/assistant/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ messages: next }),
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

  return (
    <>
      {/* Floating launcher */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105"
          aria-label="Open AI assistant"
        >
          <MessageCircle className="size-6" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-5 right-5 z-50 flex h-[min(600px,80vh)] w-[min(400px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl">
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

          {/* Input */}
          <div className="border-t p-3">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send() }
                }}
                placeholder="Ask anything…"
                rows={1}
                className="max-h-28 flex-1 resize-none rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
              <Button size="icon" className="size-9 shrink-0 rounded-xl" onClick={send} disabled={streaming || !input.trim()}>
                {streaming ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              </Button>
            </div>
          </div>
        </div>
      )}
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
