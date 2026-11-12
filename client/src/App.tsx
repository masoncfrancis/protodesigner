import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'
import { draftPrototypeBrief, generateConceptImage, sendChat } from './lib/llmClient'
import type { PrototypeBrief } from './lib/llmClient'

type Message = {
  id: number
  role: 'assistant' | 'user'
  text: string
}

const stages = [
  'Concept',
  'Experience',
  'Electronics',
  'Enclosure',
  'Finish',
]

const prompts = [
  {
    text: 'What should this device help someone do?',
    suggestions: ['Monitor something', 'Control something', 'Make a task easier'],
  },
  {
    text: 'Where will people use it, and what will be around it?',
    suggestions: ['On a desk', 'In a workshop', 'Outdoors'],
  },
  {
    text: 'What electronics need to fit inside the enclosure?',
    suggestions: ['A small PCB', 'Battery powered', 'Sensors or buttons'],
  },
  {
    text: 'How should the prototype feel in someone’s hands?',
    suggestions: ['Compact and light', 'Rugged and durable', 'Soft and friendly'],
  },
]

const initialMessages: Message[] = [
  {
    id: 1,
    role: 'assistant',
    text: 'Let’s turn your idea into a clear physical direction. I’ll ask a few focused questions about how it works, where it lives, and what the enclosure needs to do.',
  },
  {
    id: 2,
    role: 'assistant',
    text: 'Start wherever feels easiest: what is the product idea you already have in mind?',
  },
]

const briefFields: { key: keyof PrototypeBrief; label: string }[] = [
  { key: 'product_overview', label: 'Product overview' },
  { key: 'primary_user', label: 'Primary user' },
  { key: 'usage_context', label: 'Use environment' },
  { key: 'core_functionality', label: 'Core functionality' },
  { key: 'internal_components', label: 'Electronics inside' },
  { key: 'approximate_size', label: 'Approximate size' },
  { key: 'form_factor_and_ergonomics', label: 'Form and ergonomics' },
  { key: 'controls_and_indicators', label: 'Controls and indicators' },
  { key: 'ports_and_connectors', label: 'Ports and connectors' },
  { key: 'materials_and_finish', label: 'Materials and finish' },
  { key: 'build_constraints', label: 'Build constraints' },
  { key: 'environment_and_durability', label: 'Durability' },
  { key: 'visual_direction', label: 'Visual direction' },
]

function App() {
  const [messages, setMessages] = useState(initialMessages)
  const [input, setInput] = useState('')
  const [darkMode, setDarkMode] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')
  const [activeStage, setActiveStage] = useState(0)
  const [summary, setSummary] = useState({
    purpose: 'Waiting for your idea',
    context: 'Not defined yet',
    internals: 'Not defined yet',
    form: 'Not defined yet',
  })
  const [visualizationOpen, setVisualizationOpen] = useState(false)
  const [isPreparingBrief, setIsPreparingBrief] = useState(false)
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const [visualizationError, setVisualizationError] = useState('')
  const [briefDraft, setBriefDraft] = useState<PrototypeBrief | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)

  useEffect(() => {
    if (imageUrl) return () => URL.revokeObjectURL(imageUrl)
  }, [imageUrl])

  const addMessage = async (text: string) => {
    if (!text.trim()) return

    const trimmedText = text.trim()
    const userMessage = { id: Date.now(), role: 'user' as const, text: trimmedText }
    const history = [...messages, userMessage]
    const nextSummary = {
      ...summary,
      ...(activeStage === 0 ? { purpose: trimmedText } : {}),
      ...(activeStage === 1 ? { context: trimmedText } : {}),
      ...(activeStage === 2 ? { internals: trimmedText } : {}),
      ...(activeStage === 3 ? { form: trimmedText } : {}),
    }
    setMessages((current) => [...current, userMessage])
    setIsSending(true)
    setError('')
    setSummary(nextSummary)
    setInput('')

    try {
      const reply = await sendChat({
        messages: history.map(({ role, text: content }) => ({ role, content })),
        stage: stages[activeStage],
        summary: nextSummary,
      })
      setMessages((current) => [...current, { id: Date.now(), role: 'assistant', text: reply }])
      setActiveStage((current) => Math.min(current + 1, stages.length - 1))
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not reach the design guide')
    } finally {
      setIsSending(false)
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void addMessage(input)
  }

  const startVisualization = async () => {
    setVisualizationOpen(true)
    setIsPreparingBrief(true)
    setVisualizationError('')
    setBriefDraft(null)
    setImageUrl(null)
    try {
      setBriefDraft(await draftPrototypeBrief({
        messages: messages.map(({ role, text: content }) => ({ role, content })),
        stage: stages[activeStage],
        summary,
      }))
    } catch (requestError) {
      setVisualizationError(requestError instanceof Error ? requestError.message : 'Could not prepare prototype brief')
    } finally {
      setIsPreparingBrief(false)
    }
  }

  const createConceptImage = async () => {
    if (!briefDraft) return
    setIsGeneratingImage(true)
    setVisualizationError('')
    try {
      setImageUrl(URL.createObjectURL(await generateConceptImage(briefDraft)))
    } catch (requestError) {
      setVisualizationError(requestError instanceof Error ? requestError.message : 'Could not generate concept image')
    } finally {
      setIsGeneratingImage(false)
    }
  }

  const currentPrompt = prompts[Math.min(activeStage, prompts.length - 1)]

  return (
    <main className={`app-shell ${darkMode ? 'dark' : ''}`}>
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">✦</div>
          <span>ProtoDesigner</span>
        </div>
        <div className="project-name">Untitled prototype <span>·</span> <strong>Draft</strong></div>
        <div className="top-actions">
          <button className="icon-button" type="button" aria-label="Help">?</button>
          <button className="save-button" type="button"><span className="save-dot" /> Saved</button>
          <button className="visualize-top-button" type="button" disabled={isSending || isPreparingBrief} onClick={() => void startVisualization()}>Visualize idea <span>↗</span></button>
          <button className="theme-toggle" type="button" onClick={() => setDarkMode((current) => !current)} aria-label={`Switch to ${darkMode ? 'light' : 'dark'} mode`}>
            {darkMode ? '☼ Light' : '☾ Dark'}
          </button>
        </div>
      </header>

      <div className="workspace">
        <aside className="sidebar">
          <div className="sidebar-heading">
            <div>
              <p className="eyebrow">Prototype brief</p>
              <h1>Shape the idea</h1>
            </div>
            <span className="completion">{activeStage + 1}/5</span>
          </div>
          <div className="progress-track"><span style={{ width: `${((activeStage + 1) / stages.length) * 100}%` }} /></div>
          <nav className="stage-list" aria-label="Discovery stages">
            {stages.map((stage, index) => (
              <button className={`stage ${index === activeStage ? 'active' : ''} ${index < activeStage ? 'complete' : ''}`} type="button" key={stage} onClick={() => setActiveStage(index)}>
                <span className="stage-number">{index < activeStage ? '✓' : `0${index + 1}`}</span>
                <span>{stage}</span>
              </button>
            ))}
          </nav>
          <div className="sidebar-note">
            <div className="sparkle">✦</div>
            <p><strong>Good to know</strong><br />There are no wrong answers. We’re building a useful starting point for your first physical prototype.</p>
          </div>
        </aside>

        <section className="chat-panel" aria-label="Prototype discovery chat">
          <div className="chat-header">
            <div className="ai-avatar">✦</div>
            <div><h2>Design guide</h2><p><span className="online-dot" /> Ready to explore</p></div>
            <button className="more-button" type="button" aria-label="More options">•••</button>
          </div>

          <div className="messages" aria-live="polite">
            <div className="date-divider"><span>Today</span></div>
            {messages.map((message) => (
              <div className={`message-row ${message.role}`} key={message.id}>
                {message.role === 'assistant' && <div className="mini-avatar">✦</div>}
                <div className="message-content">
                  <div className="message-bubble">{message.text}</div>
                  <span className="message-time">{message.role === 'assistant' ? 'Design guide' : 'You'} · now</span>
                </div>
              </div>
            ))}
            {isSending && <div className="typing-indicator"><div className="mini-avatar">✦</div><span>Design guide is thinking…</span></div>}
            <div className="suggestion-block">
              <p>Or pick a starting point</p>
              <div className="suggestions">
                {currentPrompt.suggestions.map((suggestion) => <button type="button" key={suggestion} disabled={isSending} onClick={() => addMessage(suggestion)}>{suggestion}<span>↗</span></button>)}
              </div>
            </div>
          </div>

          {error && <div className="chat-error" role="alert">{error} <button type="button" onClick={() => setError('')}>Dismiss</button></div>}
          <form className="composer" onSubmit={handleSubmit}>
            <textarea disabled={isSending} value={input} onChange={(event) => setInput(event.target.value)} placeholder={isSending ? 'Waiting for the design guide…' : 'Describe your product idea...'} rows={1} aria-label="Your message" onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void addMessage(input) } }} />
            <div className="composer-actions"><button type="button" className="attach-button" aria-label="Attach a file">＋</button><span>Shift + Enter for new line</span><button disabled={isSending} type="submit" className="send-button" aria-label="Send message">↑</button></div>
          </form>
        </section>

        <aside className="brief-panel">
          <div className="brief-header"><div><p className="eyebrow">Live summary</p><h2>Your product, so far</h2></div><button type="button" className="edit-button">Edit</button></div>
          <p className="brief-intro">This brief grows as we talk. It will guide the enclosure concept later.</p>
          <div className="summary-list">
            <SummaryItem label="Purpose" value={summary.purpose} icon="◎" />
            <SummaryItem label="Context of use" value={summary.context} icon="⌂" />
            <SummaryItem label="Inside the box" value={summary.internals} icon="▣" />
            <SummaryItem label="Physical direction" value={summary.form} icon="◇" />
          </div>
          <div className="next-step"><span className="next-icon">✦</span><div><p className="eyebrow">Ready when you are</p><strong>Turn your idea into a visual</strong><p>You can generate a concept now, even if some details are still open.</p></div></div>
          <button className="continue-button" type="button" disabled={isSending || isPreparingBrief} onClick={() => void startVisualization()}>Review brief & visualize <span>→</span></button>
        </aside>
      </div>

      {visualizationOpen && <div className="visualize-backdrop">
        <section className="visualize-dialog" role="dialog" aria-modal="true" aria-labelledby="visualize-title">
          <header className="visualize-dialog-header">
            <div><p className="eyebrow">From conversation to concept</p><h2 id="visualize-title">Review your prototype brief</h2></div>
            <button type="button" className="dialog-close" aria-label="Close" onClick={() => { setVisualizationOpen(false); setImageUrl(null) }}>×</button>
          </header>
          <p className="visualize-intro">Check or edit what the design guide gathered. Missing details stay marked as unspecified; they won’t block image generation.</p>
          {isPreparingBrief && <div className="visualize-loading"><span className="loading-orbit" />Preparing your brief…</div>}
          {!isPreparingBrief && briefDraft && !imageUrl && <div className="brief-editor">
            {briefFields.map(({ key, label }) => <label className="brief-field" key={key}>
              <span>{label}</span>
              <textarea value={briefDraft[key]} rows={2} onChange={(event) => setBriefDraft((current) => current ? { ...current, [key]: event.target.value } : current)} />
            </label>)}
          </div>}
          {isGeneratingImage && <div className="visualize-loading"><span className="loading-orbit" />Generating concept image with Gemini…</div>}
          {imageUrl && <div className="generated-image-wrap"><img src={imageUrl} alt="Generated concept for your electronic product prototype" /><p>AI-generated concept image · Use as a starting point, not a manufacturing specification.</p></div>}
          {visualizationError && <p className="visualize-error" role="alert">{visualizationError}</p>}
          <footer className="visualize-footer">
            <button type="button" className="dialog-secondary" onClick={() => { setVisualizationOpen(false); setImageUrl(null) }}>Back to chat</button>
            {imageUrl && <a className="dialog-secondary download-image" href={imageUrl} download="protodesigner-concept.png">Download image</a>}
            {imageUrl && <button type="button" className="dialog-secondary" onClick={() => setImageUrl(null)}>Edit brief</button>}
            {briefDraft && <button type="button" className="dialog-primary" disabled={isPreparingBrief || isGeneratingImage} onClick={() => void createConceptImage()}>{isGeneratingImage ? 'Generating…' : imageUrl ? 'Generate another' : 'Generate concept image'} <span>→</span></button>}
            {!briefDraft && !isPreparingBrief && <button type="button" className="dialog-primary" disabled={isPreparingBrief} onClick={() => void startVisualization()}>Retry brief <span>→</span></button>}
          </footer>
        </section>
      </div>}
    </main>
  )
}

function SummaryItem({ label, value, icon }: { label: string; value: string; icon: string }) {
  return <div className="summary-item"><span className="summary-icon">{icon}</span><div><p>{label}</p><strong>{value}</strong></div></div>
}

export default App
