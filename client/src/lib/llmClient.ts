export type ChatRole = 'assistant' | 'user'

export type ChatRequest = {
  messages: { role: ChatRole; content: string }[]
  stage: string
  summary: {
    purpose: string
    context: string
    internals: string
    form: string
  }
}

export async function sendChat(request: ChatRequest): Promise<string> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null) as { detail?: string } | null
    throw new Error(body?.detail ?? `Request failed (${response.status})`)
  }

  const body = await response.json() as { message?: { content?: string } }
  if (!body.message?.content) throw new Error('LLM returned an empty response')
  return body.message.content
}
