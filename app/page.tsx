'use client'

declare global {
  interface Window {
    selectTone: (btn: HTMLElement) => void
    selectedTone: string
    updateCount: () => void
    showState: (state: string) => void
    setSubmitLoading: (isLoading: boolean) => void
    resetForm: () => void
    renderResult: (data: any) => void
    handleSubmit: (e: any) => void
    copyShareText: () => void
    handleUpgrade: () => void
  }
}

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

export default function Home() {
  const router = useRouter()
  const [proLoading, setProLoading] = useState(false)
  const [freeLoading, setFreeLoading] = useState(false)

  // ── PROMPT 1 + 2: Pro checkout handler ──────────────────────────
  async function handleProCheckout() {
    setProLoading(true)
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession()

      // Not logged in → send to login
      if (!session?.access_token) {
        router.push('/login')
        return
      }

      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert((err as any).message || 'Something went wrong. Please try again.')
        return
      }

      const { url } = await res.json()
      window.location.href = url

    } catch (err: any) {
      alert(err.message || 'Something went wrong. Please try again.')
    } finally {
      setProLoading(false)
    }
  }

  // ── PROMPT 3: Free button handler ───────────────────────────────
  async function handleFreeClick() {
    setFreeLoading(true)
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }
      const appSection = document.getElementById('app')
      if (appSection) appSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } finally {
      setFreeLoading(false)
    }
  }

  // ── PROMPT 3: Nav login button ──────────────────────────────────
  async function handleNavLogin() {
    const { data: { session } } = await supabaseBrowser.auth.getSession()
    if (session) {
      const appSection = document.getElementById('app')
      if (appSection) appSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      router.push('/login')
    }
  }

  useEffect(() => {

    // LIVE COUNTER
    const today = new Date()
    const daySeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate()
    const base = 847 + (daySeed % 397)
    const offset = Math.floor(Math.random() * 17) + 2
    let count = base + offset
    const liveEl = document.getElementById('liveCount')
    if (liveEl) {
      liveEl.textContent = count.toLocaleString()
      setInterval(() => {
        count += 1
        liveEl.textContent = count.toLocaleString()
      }, Math.floor(Math.random() * 14000) + 8000)
    }

    // FADE IN ON SCROLL
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible') })
    }, { threshold: 0.1 })
    document.querySelectorAll('.fade-up').forEach(el => observer.observe(el))

    // TONE SELECTOR
    window.selectTone = function(btn: HTMLElement) {
      document.querySelectorAll('.tone-btn').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      window.selectedTone = (btn as HTMLElement & { dataset: DOMStringMap }).dataset.tone || 'blunt'
    }
    window.selectedTone = 'blunt'

    // CHAR COUNT + DYNAMIC BUTTON
    window.updateCount = function() {
      const ta = document.getElementById('situation') as HTMLTextAreaElement | null
      const btn = document.getElementById('submitBtn') as HTMLButtonElement | null
      const countEl = document.getElementById('charCount')
      if (!ta || !btn || !countEl) return
      const len = ta.value.length
      countEl.textContent = String(len)
      btn.textContent = len > 0 ? 'Analyze this →' : 'Get my Ick Score →'
    }

    // STATE MACHINE
    window.showState = function(state: string) {
      const ids = ['stateIdle', 'stateLoading', 'stateError', 'stateResult']
      ids.forEach(id => {
        const el = document.getElementById(id)
        if (el) el.style.display = 'none'
      })
      const activeId = 'state' + state.charAt(0).toUpperCase() + state.slice(1)
      const activeEl = document.getElementById(activeId)
      if (activeEl) activeEl.style.display = 'block'
    }

    window.setSubmitLoading = function(isLoading: boolean) {
      const btn = document.getElementById('submitBtn') as HTMLButtonElement | null
      if (!btn) return
      btn.disabled = isLoading
      btn.textContent = isLoading ? 'Analyzing…' : 'Get my Ick Score →'
    }

    // RESET
    window.resetForm = function() {
      window.showState('idle')
      const ta = document.getElementById('situation') as HTMLTextAreaElement | null
      const countEl = document.getElementById('charCount')
      const errorEl = document.getElementById('inputError')
      const btn = document.getElementById('submitBtn') as HTMLButtonElement | null
      if (ta) ta.value = ''
      if (countEl) countEl.textContent = '0'
      if (errorEl) errorEl.style.display = 'none'
      if (btn) btn.textContent = 'Get my Ick Score →'
      window.setSubmitLoading(false)
      const form = document.getElementById('ickForm')
      if (form) form.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    // RENDER RESULT
    window.renderResult = function(data: any) {
      const set = (id: string, val: string) => {
        const el = document.getElementById(id)
        if (el) el.textContent = val
      }
      const setWidth = (id: string, val: string) => {
        const el = document.getElementById(id) as HTMLElement | null
        if (el) el.style.width = val
      }
      const setDisplay = (id: string, val: string) => {
        const el = document.getElementById(id)
        if (el) el.style.display = val
      }
      set('resultScoreLabel', `${data.score} / 100`)
      setWidth('resultScoreFill', `${data.score}%`)
      set('resultCategory', data.category)
      set('resultPattern', data.pattern)
      set('resultFlags', `${data.redFlagCount} identified`)
      set('resultVerdict', data.verdict)
      set('resultBlunt', data.bluntTake)
      set('resultWhy', data.whyItFeelsBad)
      set('resultReality', data.realityCheck)
      set('shareScore', String(data.score))
      setDisplay('proGate', data.isProGated ? 'block' : 'none')
      window.showState('result')
    }

    // FORM SUBMIT
    window.handleSubmit = async function(e: any) {
      e.preventDefault()
      const ta = document.getElementById('situation') as HTMLTextAreaElement | null
      const errorEl = document.getElementById('inputError')
      if (!ta) return
      const situation = ta.value.trim()
      if (situation.length < 30) {
        if (errorEl) errorEl.style.display = 'block'
        return
      }
      if (errorEl) errorEl.style.display = 'none'
      window.setSubmitLoading(true)
      window.showState('loading')
      try {
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ situation, tone: window.selectedTone }),
        })
        if (!response.ok) {
          const err = await response.json().catch(() => ({}))
          throw new Error((err as any).message || `Server error ${response.status}`)
        }
        const data = await response.json()
        if (typeof data.score !== 'number') throw new Error('Unexpected response from API.')
        window.renderResult(data)
      } catch (err: any) {
        const msgEl = document.getElementById('errorMessage')
        if (msgEl) msgEl.textContent = err.message || 'Something went wrong. Try again.'
        window.showState('error')
      } finally {
        window.setSubmitLoading(false)
      }
    }

    // SHARE
    window.copyShareText = function() {
      const scoreEl = document.getElementById('shareScore')
      const score = scoreEl ? scoreEl.textContent : '—'
      navigator.clipboard.writeText(`My Ick Score: ${score} — theickdetector.com`).then(() => {
        const btn = document.querySelector('.share-btn') as HTMLButtonElement | null
        if (!btn) return
        btn.textContent = 'Copied!'
        btn.classList.add('copied')
        setTimeout(() => {
          btn.textContent = 'Copy'
          btn.classList.remove('copied')
        }, 2000)
      })
    }

    // UPGRADE — wires in-result pro gate to same handler
    window.handleUpgrade = function() {
      handleProCheckout()
    }

  }, [])

  return (
    <>
      {/* NAV — Prompt 3: Log in button added */}
      <nav>
        <div className="nav-logo">the <span>ick</span> detector.</div>
        <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
          <button
            onClick={handleNavLogin}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--muted)',
              fontSize: '13px',
              cursor: 'pointer',
              padding: '9px 4px',
              fontFamily: 'Outfit, sans-serif',
              fontWeight: '400',
            }}
          >
            Log in
          </button>
          <a href="#app" className="nav-cta">Try it free</a>
        </div>
      </nav>

      <div className="hero">
        <div className="hero-glow"></div>
        <div className="hero-glow-2"></div>
        <div className="social-proof">
          <span className="social-proof-text">
            <strong id="liveCount">—</strong> people got their answer here today
          </span>
        </div>
        <div className="hero-badge">Relationship clarity tool</div>
        <h1>You already know.<br/>You just want <span className="pink">proof.</span></h1>
        <p className="hero-sub">Describe what happened. Get an Ick Score, a pattern breakdown, and the answer you've been circling for weeks.</p>
        <div className="hero-cta-group">
          <a href="#app" className="btn-primary">Get my Ick Score</a>
          <div className="free-trust">
            <span className="free-trust-item">Free once a week</span>
            <span className="free-trust-item">No account needed</span>
            <span className="free-trust-item">60 seconds</span>
          </div>
        </div>
      </div>

      <div className="marquee-wrap">
        <div className="marquee">
          <span>Ick Score</span><span className="dot">✦</span>
          <span>Red Flags</span><span className="dot">✦</span>
          <span>Trauma Bonding</span><span className="dot">✦</span>
          <span>Situationship</span><span className="dot">✦</span>
          <span>Mixed Signals</span><span className="dot">✦</span>
          <span>Pattern Analysis</span><span className="dot">✦</span>
          <span>Reality Check</span><span className="dot">✦</span>
          <span>Ick Score</span><span className="dot">✦</span>
          <span>Red Flags</span><span className="dot">✦</span>
          <span>Trauma Bonding</span><span className="dot">✦</span>
          <span>Situationship</span><span className="dot">✦</span>
          <span>Mixed Signals</span><span className="dot">✦</span>
          <span>Pattern Analysis</span><span className="dot">✦</span>
          <span>Reality Check</span><span className="dot">✦</span>
        </div>
      </div>

      <section id="how">
        <div className="fade-up">
          <div className="section-label">How it works</div>
          <h2>Three steps to clarity</h2>
          <p className="section-sub">No therapy degree required. Just honesty about what is actually happening.</p>
        </div>
        <div className="steps">
          <div className="step-card fade-up">
            <div className="step-num">01</div>
            <div className="step-title">Spill it</div>
            <p className="step-desc">Write out what happened. The texts, the behavior, the thing they said that has been living rent-free in your head. No filter.</p>
          </div>
          <div className="step-card fade-up">
            <div className="step-num">02</div>
            <div className="step-title">Pick your vibe</div>
            <p className="step-desc">Choose how you want to receive the truth. Blunt, gentle, funny, or full therapist mode.</p>
          </div>
          <div className="step-card fade-up">
            <div className="step-num">03</div>
            <div className="step-title">Get your answer</div>
            <p className="step-desc">Your Ick Score, the pattern behind it, and a reality check that actually helps you move — or stay with eyes open.</p>
          </div>
        </div>
      </section>

      <section id="example" style={{paddingTop: 0}}>
        <div className="fade-up" style={{textAlign:'center', marginBottom:'48px'}}>
          <div className="section-label" style={{display:'inline-block'}}>Example output</div>
          <h2>What a reading looks like</h2>
          <p className="section-sub" style={{margin:'0 auto'}}>Real output. Different name. You will recognize the feeling.</p>
        </div>
        <div className="example-wrap fade-up">
          <div className="example-header">
            <div className="example-header-left">
              <div className="example-dot"></div>
              <span className="example-label">Ick Detector — Result</span>
            </div>
            <div className="ick-score-badge">Ick Score: 74</div>
          </div>
          <div className="example-body">
            <div className="example-input">
              "He texts me every day but says he does not want a label. He gets upset when I talk to other guys but will not commit. Last week he said I was the only person he trusts then did not reply for 3 days."
            </div>
            <div className="score-meter-wrap">
              <div className="score-meter-top">
                <span>Ick level</span>
                <span style={{color:'var(--pink)', fontWeight:'500'}}>74 / 100</span>
              </div>
              <div className="score-meter-bar">
                <div className="score-meter-fill"></div>
              </div>
            </div>
            <div className="result-grid">
              <div className="result-chip"><div className="result-chip-label">Category</div><div className="result-chip-value pink">Soft Control</div></div>
              <div className="result-chip"><div className="result-chip-label">Pattern</div><div className="result-chip-value purple">Intermittent Reinforcement</div></div>
              <div className="result-chip"><div className="result-chip-label">Red flags</div><div className="result-chip-value">3 identified</div></div>
              <div className="result-chip"><div className="result-chip-label">Verdict</div><div className="result-chip-value pink">Trust the ick</div></div>
            </div>
            <div className="result-blunt">
              <div className="result-blunt-label">Blunt take</div>
              <div className="result-blunt-text">He wants the benefits of a relationship without any of the accountability. The three-day silence after you are the only person I trust is not mysterious — it is the pattern. You are not overthinking this.</div>
            </div>
            <div className="result-reality">
              <div className="result-reality-label">Reality check</div>
              <div className="result-reality-text">This is not a communication problem. It is a commitment problem he has outsourced to you to manage.</div>
            </div>
          </div>
        </div>
        <div className="post-example-cta fade-up">
          <a href="#app" className="btn-primary">Get my Ick Score</a>
          <p>Takes 60 seconds. Free once a week.</p>
        </div>
      </section>

      <section id="app" style={{paddingTop:0}}>
        <div className="fade-up" style={{textAlign:'center', marginBottom:'48px'}}>
          <div className="section-label" style={{display:'inline-block'}}>Try it now</div>
          <h2>What is going on?</h2>
          <p className="section-sub" style={{margin:'0 auto'}}>Tell us everything. The more specific, the more accurate your reading.</p>
        </div>
        <div className="app-section fade-up">
          <h3>What is going on? Write it out.</h3>
          <p>No filter. The more honest you are, the more accurate the reading.</p>
          <form id="ickForm" onSubmit={(e) => window.handleSubmit(e)} noValidate>
            <textarea id="situation" name="situation" placeholder="So we had this amazing night and then he just..." maxLength={1000} onInput={() => window.updateCount()} required></textarea>
            <p className="char-count"><span id="charCount">0</span> / 1000</p>
            <p id="inputError" className="field-error" style={{display:'none'}}>Write at least 30 characters so we have something to work with.</p>
            <div className="tone-label">Choose your tone</div>
            <div className="tone-options">
              <button type="button" className="tone-btn active" data-tone="blunt" onClick={(e) => window.selectTone(e.currentTarget)}>Blunt</button>
              <button type="button" className="tone-btn" data-tone="gentle" onClick={(e) => window.selectTone(e.currentTarget)}>Gentle</button>
              <button type="button" className="tone-btn" data-tone="funny" onClick={(e) => window.selectTone(e.currentTarget)}>Funny</button>
              <button type="button" className="tone-btn" data-tone="therapist-coded" onClick={(e) => window.selectTone(e.currentTarget)}>Therapist-coded</button>
            </div>
            <button type="submit" id="submitBtn" className="btn-primary-full">Get my Ick Score →</button>
          </form>

          <div id="stateIdle" className="result-placeholder">
            <div className="result-placeholder-icon">🔍</div>
            <p>Your reading will appear here.<br/>No judgment. Just clarity.</p>
          </div>
          <div id="stateLoading" className="result-placeholder" style={{display:'none'}}>
            <div className="loading-spinner"></div>
            <p style={{marginTop:'16px'}}>Reading the situation…</p>
          </div>
          <div id="stateError" className="result-placeholder error-state" style={{display:'none'}}>
            <div className="result-placeholder-icon">⚠️</div>
            <p id="errorMessage">Something went wrong. Try again in a moment.</p>
            <button className="btn-secondary" style={{marginTop:'16px', width:'auto', padding:'10px 24px'}} onClick={() => window.resetForm()}>Try again</button>
          </div>
          <div id="stateResult" style={{display:'none'}}>
            <div className="result-share-bar">
              <span id="shareLabel">My Ick Score: <strong id="shareScore">—</strong> — theickdetector.com</span>
              <button className="share-btn" onClick={() => window.copyShareText()}>Copy</button>
            </div>
            <div className="score-meter-wrap" style={{marginBottom:'20px'}}>
              <div className="score-meter-top">
                <span>Ick level</span>
                <span id="resultScoreLabel" style={{color:'var(--pink)', fontWeight:'500'}}>— / 100</span>
              </div>
              <div className="score-meter-bar">
                <div id="resultScoreFill" className="score-meter-fill" style={{width:'0%'}}></div>
              </div>
            </div>
            <div className="result-grid">
              <div className="result-chip"><div className="result-chip-label">Category</div><div id="resultCategory" className="result-chip-value pink">—</div></div>
              <div className="result-chip"><div className="result-chip-label">Pattern</div><div id="resultPattern" className="result-chip-value purple">—</div></div>
              <div className="result-chip"><div className="result-chip-label">Red flags</div><div id="resultFlags" className="result-chip-value">—</div></div>
              <div className="result-chip"><div className="result-chip-label">Verdict</div><div id="resultVerdict" className="result-chip-value pink">—</div></div>
            </div>
            <div className="result-blunt">
              <div className="result-blunt-label">Blunt take</div>
              <div id="resultBlunt" className="result-blunt-text">—</div>
            </div>
            <div className="result-blunt" style={{marginTop:'12px', background:'rgba(139,92,246,0.06)', borderColor:'rgba(139,92,246,0.2)'}}>
              <div className="result-blunt-label" style={{color:'var(--purple)'}}>Why it feels bad</div>
              <div id="resultWhy" className="result-blunt-text">—</div>
            </div>
            <div className="result-reality" style={{marginTop:'12px'}}>
              <div className="result-reality-label">Reality check</div>
              <div id="resultReality" className="result-reality-text">—</div>
            </div>
            <div id="proGate" className="pro-gate" style={{display:'none'}}>
              <p className="pro-gate-text">You have used your free reading this week.</p>
              <p className="pro-gate-sub">Upgrade to Pro for unlimited readings, full pattern tracking, and history.</p>
              <button
                className="btn-primary-full"
                onClick={handleProCheckout}
                disabled={proLoading}
              >
                {proLoading ? 'Redirecting…' : 'Get Pro — $6.99/month'}
              </button>
              <p style={{textAlign:'center', fontSize:'12px', color:'var(--muted)', marginTop:'10px'}}>Cancel anytime. No guilt trip.</p>
            </div>
            <button className="btn-secondary" style={{marginTop:'20px'}} onClick={() => window.resetForm()}>New reading</button>
          </div>
        </div>
      </section>

      <section id="pricing">
        <div className="fade-up">
          <div className="section-label">Pricing</div>
          <h2>Start free.<br/>Go deeper when you are ready.</h2>
          <p className="section-sub">The first reading is always free. After that, $6.99/month unlocks everything.</p>
        </div>
        <div className="pricing-grid fade-up">

          {/* FREE CARD — Prompt 3 */}
          <div className="pricing-card">
            <div className="pricing-tier">Free</div>
            <div className="pricing-price">$0</div>
            <div className="pricing-desc">One reading per week. Enough to know if your gut is right.</div>
            <ul className="pricing-features">
              <li>1 reading per week</li>
              <li>Ick Score + category</li>
              <li>Blunt take</li>
              <li className="muted">Full pattern breakdown</li>
              <li className="muted">Reality check</li>
              <li className="muted">Unlimited readings</li>
              <li className="muted">Reading history</li>
            </ul>
            <button
              className="btn-secondary"
              onClick={handleFreeClick}
              disabled={freeLoading}
            >
              {freeLoading ? 'One sec…' : 'Start free'}
            </button>
          </div>

          {/* PRO CARD — Prompt 1 + 2 */}
          <div className="pricing-card featured">
            <div className="pricing-badge">Most popular</div>
            <div className="pricing-tier">Pro</div>
            <div className="pricing-price">$6.99<span>/mo</span></div>
            <div className="pricing-desc">Unlimited readings. Full breakdowns. Cancel anytime. No guilt trip.</div>
            <ul className="pricing-features">
              <li>Unlimited readings</li>
              <li>Ick Score + category</li>
              <li>Blunt take</li>
              <li>Full pattern breakdown</li>
              <li>Reality check</li>
              <li>Pattern tracking over time</li>
              <li>Reading history</li>
            </ul>
            <button
              className="btn-primary-full"
              onClick={handleProCheckout}
              disabled={proLoading}
            >
              {proLoading ? 'Redirecting…' : 'Get Pro — $6.99/mo'}
            </button>
          </div>

        </div>
      </section>

      <p className="disclaimer fade-up">
        The Ick Detector is not a therapist and this is not a diagnosis. It is a mirror — what you do with what you see is up to you. If you are in a situation that feels unsafe, please talk to someone who can actually help.
      </p>

      <footer>
        <div className="footer-logo">the <span>ick</span> detector.</div>
        <div className="footer-links">
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
          <a href="#">Contact</a>
        </div>
      </footer>
    </>
  )
}
