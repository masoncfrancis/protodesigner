import { useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

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

function App() {
  const [messages, setMessages] = useState(initialMessages)
  const [input, setInput] = useState('')
  const [darkMode, setDarkMode] = useState(false)
  const [activeStage, setActiveStage] = useState(0)
  const [summary, setSummary] = useState({
    purpose: 'Waiting for your idea',
    context: 'Not defined yet',
    internals: 'Not defined yet',
    form: 'Not defined yet',
  })

  const addMessage = (text: string) => {
    if (!text.trim()) return

    const nextStage = Math.min(activeStage + 1, stages.length - 1)
    setMessages((current) => [
      ...current,
      { id: Date.now(), role: 'user', text: text.trim() },
      {
        id: Date.now() + 1,
        role: 'assistant',
        text: prompts[nextStage]?.text ?? 'Great. Is there anything about the physical design that must not change?',
      },
    ])
    setActiveStage(nextStage)
    setSummary((current) => ({
      ...current,
      ...(activeStage === 0 ? { purpose: text.trim() } : {}),
      ...(activeStage === 1 ? { context: text.trim() } : {}),
      ...(activeStage === 2 ? { internals: text.trim() } : {}),
      ...(activeStage === 3 ? { form: text.trim() } : {}),
    }))
    setInput('')
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    addMessage(input)
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
            <div className="suggestion-block">
              <p>Or pick a starting point</p>
              <div className="suggestions">
                {currentPrompt.suggestions.map((suggestion) => <button type="button" key={suggestion} onClick={() => addMessage(suggestion)}>{suggestion}<span>↗</span></button>)}
              </div>
            </div>
          </div>

          <form className="composer" onSubmit={handleSubmit}>
            <textarea value={input} onChange={(event) => setInput(event.target.value)} placeholder="Describe your product idea..." rows={1} aria-label="Your message" onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); addMessage(input) } }} />
            <div className="composer-actions"><button type="button" className="attach-button" aria-label="Attach a file">＋</button><span>Shift + Enter for new line</span><button type="submit" className="send-button" aria-label="Send message">↑</button></div>
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
          <div className="next-step"><span className="next-icon">↗</span><div><p className="eyebrow">Up next</p><strong>Define the enclosure</strong><p>Dimensions, controls, materials, and finish.</p></div></div>
          <button className="continue-button" type="button" onClick={() => setActiveStage(Math.min(activeStage + 1, stages.length - 1))}>Continue discovery <span>→</span></button>
        </aside>
      </div>
    </main>
  )
}

function SummaryItem({ label, value, icon }: { label: string; value: string; icon: string }) {
  return <div className="summary-item"><span className="summary-icon">{icon}</span><div><p>{label}</p><strong>{value}</strong></div></div>
}

export default App
