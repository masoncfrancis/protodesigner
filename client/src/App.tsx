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
  'Form',
  'Scale & placement',
  'Interaction',
  'Materials & finish',
  'Build constraints',
]

const prompts = [
  {
    text: 'What overall shape or product reference feels close? Describe the silhouette you imagine.',
    suggestions: ['Small rounded desktop device', 'Handheld, like a remote', 'Flat wall-mounted unit'],
  },
  {
    text: 'How large should it feel, and where or how will it sit, mount, or be held?',
    suggestions: ['Palm-sized', 'Sits on a desk', 'Mounts to a wall'],
  },
  {
    text: 'What physical controls, display, indicators, or ports should be visible—and where?',
    suggestions: ['One simple button', 'Small display on front', 'Ports on the back'],
  },
  {
    text: 'What material, surface, and color direction should the enclosure have?',
    suggestions: ['Matte dark plastic', 'Brushed metal', 'Warm, soft-touch finish'],
  },
  {
    text: 'Any build constraints or durability needs that should shape the enclosure?',
    suggestions: ['3D-printed shell', 'Visible assembly screws', 'Splash-resistant'],
  },
]

const initialMessages: Message[] = [
  {
    id: 1,
    role: 'assistant',
    text: 'Let’s shape the physical prototype: its silhouette, scale, feel, and enclosure details. Function matters only where it changes the form.',
  },
  {
    id: 2,
    role: 'assistant',
    text: 'What kind of object do you picture? A rough shape or product reference is a great place to start.',
  },
]

const briefFields: { key: keyof PrototypeBrief; label: string }[] = [
  { key: 'product_purpose', label: 'Purpose (brief context)' },
  { key: 'overall_form_and_silhouette', label: 'Overall form and silhouette' },
  { key: 'size_and_proportions', label: 'Size and proportions' },
  { key: 'orientation_and_placement', label: 'Orientation and placement' },
  { key: 'handling_and_ergonomics', label: 'Handling and ergonomics' },
  { key: 'internal_fit_constraints', label: 'Internal fit constraints' },
  { key: 'controls_and_indicators', label: 'Controls and indicators' },
  { key: 'ports_and_connectors', label: 'Ports and connectors' },
  { key: 'materials_and_finish', label: 'Materials and finish' },
  { key: 'color_palette', label: 'Color palette' },
  { key: 'seams_and_construction', label: 'Seams and construction' },
  { key: 'manufacturing_and_durability', label: 'Manufacturing and durability' },
  { key: 'visual_direction', label: 'Visual direction' },
]

function App() {
  const [messages, setMessages] = useState(initialMessages)
  const [input, setInput] = useState('')
  const [darkMode, setDarkMode] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')
  const [activeStage, setActiveStage] = useState(0)
  const [discoveryComplete, setDiscoveryComplete] = useState(false)
  const [summary, setSummary] = useState({
    overall_form: 'Not defined yet',
    size_and_placement: 'Not defined yet',
    interaction_and_controls: 'Not defined yet',
    materials_and_finish: 'Not defined yet',
    build_constraints: 'Not defined yet',
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
      ...(activeStage === 0 ? { overall_form: trimmedText } : {}),
      ...(activeStage === 1 ? { size_and_placement: trimmedText } : {}),
      ...(activeStage === 2 ? { interaction_and_controls: trimmedText } : {}),
      ...(activeStage === 3 ? { materials_and_finish: trimmedText } : {}),
      ...(activeStage === 4 ? { build_constraints: trimmedText } : {}),
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
      if (activeStage === stages.length - 1) setDiscoveryComplete(true)
      else setActiveStage((current) => current + 1)
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

  const currentPrompt = prompts[activeStage]

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
            <span className="completion">{discoveryComplete ? 'Done' : `${activeStage + 1}/5`}</span>
          </div>
          <div className="progress-track"><span style={{ width: `${((activeStage + 1) / stages.length) * 100}%` }} /></div>
          <nav className="stage-list" aria-label="Discovery stages">
            {stages.map((stage, index) => (
                <button className={`stage ${index === activeStage ? 'active' : ''} ${index < activeStage || discoveryComplete ? 'complete' : ''}`} type="button" key={stage} onClick={() => { setActiveStage(index); setDiscoveryComplete(false) }}>
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
            <div><h2>Design guide</h2><p><span className="online-dot" /> {discoveryComplete ? 'Physical design pass complete' : 'Focused on physical form'}</p></div>
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
            {!discoveryComplete && currentPrompt && <div className="suggestion-block">
              <p>Or pick a starting point</p>
              <div className="suggestions">
                {currentPrompt.suggestions.map((suggestion) => <button type="button" key={suggestion} disabled={isSending} onClick={() => void addMessage(suggestion)}>{suggestion}<span>↗</span></button>)}
              </div>
            </div>}
          </div>

          {error && <div className="chat-error" role="alert">{error} <button type="button" onClick={() => setError('')}>Dismiss</button></div>}
          {discoveryComplete ? <div className="discovery-complete"><span>✓</span><p><strong>Physical design pass complete.</strong><br />Review the brief or visualize now. You can still add details if you want.</p><button type="button" onClick={() => setDiscoveryComplete(false)}>Continue refining</button></div> : <form className="composer" onSubmit={handleSubmit}>
            <textarea disabled={isSending} value={input} onChange={(event) => setInput(event.target.value)} placeholder={isSending ? 'Waiting for the design guide…' : 'Describe the shape or enclosure details...'} rows={1} aria-label="Your message" onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void addMessage(input) } }} />
            <div className="composer-actions"><button type="button" className="attach-button" aria-label="Attach a file">＋</button><span>Shift + Enter for new line</span><button disabled={isSending} type="submit" className="send-button" aria-label="Send message">↑</button></div>
          </form>}
        </section>

        <aside className="brief-panel">
          <div className="brief-header"><div><p className="eyebrow">Physical design</p><h2>Your enclosure, so far</h2></div><button type="button" className="edit-button">Edit</button></div>
          <p className="brief-intro">Shape, scale, interaction, and finish lead. Function stays supporting context.</p>
          <div className="summary-list">
            <SummaryItem label="Overall form" value={summary.overall_form} icon="◇" />
            <SummaryItem label="Size & placement" value={summary.size_and_placement} icon="⌂" />
            <SummaryItem label="Controls & ports" value={summary.interaction_and_controls} icon="◎" />
            <SummaryItem label="Materials & finish" value={summary.materials_and_finish} icon="▣" />
            <SummaryItem label="Build constraints" value={summary.build_constraints} icon="⌁" />
          </div>
          <div className="next-step"><span className="next-icon">✦</span><div><p className="eyebrow">Ready when you are</p><strong>See the enclosure take shape</strong><p>You can generate a concept now, even if some details are still open.</p></div></div>
          <button className="continue-button" type="button" disabled={isSending || isPreparingBrief} onClick={() => void startVisualization()}>Review physical brief <span>→</span></button>
        </aside>
      </div>

      {visualizationOpen && <div className="visualize-backdrop">
        <section className="visualize-dialog" role="dialog" aria-modal="true" aria-labelledby="visualize-title">
          <header className="visualize-dialog-header">
            <div><p className="eyebrow">From conversation to concept</p><h2 id="visualize-title">Review your physical design brief</h2></div>
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
