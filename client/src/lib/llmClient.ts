export type ChatRole = 'assistant' | 'user'
export type PrototypeBrief = {
  product_purpose: string
  overall_form_and_silhouette: string
  size_and_proportions: string
  orientation_and_placement: string
  handling_and_ergonomics: string
  internal_fit_constraints: string
  controls_and_indicators: string
  ports_and_connectors: string
  materials_and_finish: string
  color_palette: string
  seams_and_construction: string
  manufacturing_and_durability: string
  visual_direction: string
}

export type DiscoveryRequest = {
  messages: { role: ChatRole; content: string }[]
  stage: string
  summary: {
    overall_form: string
    size_and_placement: string
    interaction_and_controls: string
    materials_and_finish: string
    build_constraints: string
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
