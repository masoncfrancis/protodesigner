export type ChatRole = 'assistant' | 'user'
export type PrototypeBrief = {
  product_overview: string
  primary_user: string
  usage_context: string
  core_functionality: string
  internal_components: string
  approximate_size: string
  form_factor_and_ergonomics: string
  controls_and_indicators: string
  ports_and_connectors: string
  materials_and_finish: string
  build_constraints: string
  environment_and_durability: string
  visual_direction: string
}

export type DiscoveryRequest = {
  messages: { role: ChatRole; content: string }[]
  stage: string
  summary: {
    purpose: string
    context: string
    internals: string
    form: string
  }
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null) as { detail?: string } | null
    throw new Error(body?.detail ?? `Request failed (${response.status})`)
  }

  return response.json() as Promise<T>
}

export async function sendChat(request: DiscoveryRequest): Promise<string> {
  const body = await postJson<{ message?: { content?: string } }>('/api/chat', request)
  if (!body.message?.content) throw new Error('LLM returned an empty response')
  return body.message.content
}

export async function draftPrototypeBrief(request: DiscoveryRequest): Promise<PrototypeBrief> {
  const body = await postJson<{ brief?: PrototypeBrief }>('/api/brief', request)
  if (!body.brief) throw new Error('Could not prepare prototype brief')
  return body.brief
}

export async function generateConceptImage(brief: PrototypeBrief): Promise<Blob> {
  const response = await fetch('/api/images/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(brief),
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null) as { detail?: string } | null
    throw new Error(body?.detail ?? `Request failed (${response.status})`)
  }

  const image = await response.blob()
  if (!image.type.startsWith('image/')) throw new Error('Server returned invalid image data')
  return image
}
