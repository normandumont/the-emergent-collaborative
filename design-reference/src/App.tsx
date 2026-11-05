import { useEffect } from "react"

const storyLinks = [
  { href: "/about", label: "Why Meridian Station" },
  { href: "/parkinsons-project", label: "The Parkinson’s Project" },
  { href: "/project-story", label: "The 711-mile ride" },
  { href: "/research-approach", label: "Research approach" },
  { href: "/founder", label: "About the founder" },
]

const pageContent: Record<string, {
  eyebrow: string
  title: string
  intro: string
  sections: { title: string body: string }[]
}> = {
  "/about": {
    eyebrow: "About",
    title: "Why Meridian Station",
    intro:
      "Meridian Station is a founder-led research and technology initiative exploring how evidence, lived experience, and emerging technology can support better questions about complex health conditions.",
    sections: [
      {
        title: "A focused place to begin",
        body: "Parkinson’s is the first application of this direction. The goal is not to collapse research and personal observation into the same kind of evidence, but to make their different roles easier to understand.",
      },
      {
        title: "What we are building",
        body: "The current direction includes an AI-assisted Parkinson’s knowledge experience and a mobile project for exploring responsibly selected observations over time. Both are educational and exploratory technologies, not clinical services.",
      },
    ],
  },
  "/parkinsons-project": {
    eyebrow: "Parkinson’s project",
    title: "Research made easier to explore.",
    intro:
      "The first major goal is an AI-assisted knowledge resource that helps patients, families, and curious readers explore Parkinson’s research and prepare better questions for healthcare professionals.",
    sections: [
      {
        title: "Research assistance",
        body: "The intended direction is source-linked research discovery and explanation, with citations, provenance, limitations, and uncertainty made visible. AI should support inquiry, not become an autonomous medical authority.",
      },
      {
        title: "Clear limits",
        body: "Meridian Station does not diagnose Parkinson’s, prescribe treatment, or replace professional medical care. Prototype answers may be incomplete, incorrect, or out of date and should be checked independently.",
      },
    ],
  },
  "/project-story": {
    eyebrow: "Project story",
    title: "From a long ride to a broader question.",
    intro:
      "Ride for Parkinson’s began as an awareness effort and became a catalyst for experiments in live tracking, mobile technology, and understanding observations gathered over time.",
    sections: [
      {
        title: "The 711-mile ride",
        body: "The ride connected cycling, Parkinson’s awareness, and a long-standing interest in practical technology. Its route and tracking prototypes helped reveal a larger opportunity: tools that make complex research and change over time easier to investigate.",
      },
      {
        title: "A starting point, not proof",
        body: "One person’s experience can generate valuable questions, but it cannot establish a treatment effect or cause. Meridian Station grew from that distinction and from the desire to connect curiosity with more careful evidence.",
      },
    ],
  },
  "/research-approach": {
    eyebrow: "Research approach",
    title: "Evidence, experience, and exploration.",
    intro:
      "Three connected ideas guide the work. Keeping their differences visible matters as much as considering them together.",
    sections: [
      {
        title: "Evidence",
        body: "Published research, how it was conducted, the sources supporting a claim, and the limitations that affect interpretation. A citation is a starting point for checking a claim, not a reason to stop asking questions.",
      },
      {
        title: "Experience",
        body: "What a person notices or records over time can help shape useful questions. It is not treated as proof of causation or as equivalent to scientific evidence.",
      },
      {
        title: "Exploration",
        body: "Prototypes, methods, AI, and sensing technologies are investigated as possibilities—not presented as validated medical tools. Patterns are questions to examine, not conclusions.",
      },
    ],
  },
  "/founder": {
    eyebrow: "Founder",
    title: "Technology, questions, and lived context.",
    intro:
      "Meridian Station was founded by Norman Dumont after decades in software and a personal intersection of Parkinson’s, cycling, and technology experimentation.",
    sections: [
      {
        title: "A practical technology perspective",
        body: "An early software-career experience at Rebar Foundry, a dot-com-era incubator exploring new technologies, helped shape an interest in turning emerging ideas into useful, bounded experiments.",
      },
      {
        title: "Publication responsibility",
        body: "Norman Dumont is responsible for Meridian Station’s published content. Corrections, questions, and project-focused inquiries are welcome by email.",
      },
    ],
  },
  "/privacy": {
    eyebrow: "Privacy",
    title: "Use less data. Make its purpose clear.",
    intro:
      "Meridian Station’s public prototype is designed for general educational questions, not personal health records or sensitive medical information.",
    sections: [
      {
        title: "Knowledgebase questions",
        body: "Questions are sent to the Meridian Station research service for processing without browser persistence, cookies, or account credentials. Do not submit medical records, symptom histories, medication details, location traces, or other sensitive information.",
      },
      {
        title: "Contact",
        body: "Email shares your address and message with the email services involved. Contact does not enroll you in research, authorize publication, or create a clinical relationship.",
      },
      {
        title: "Future mobile work",
        body: "Any future collection of longitudinal information would require a defined purpose, informed consent, separate safeguards, and clear evaluation of burden and measurement limitations.",
      },
    ],
  },
}

function Header() {
  return (
    <header className="site-header">
      <div className="header-inner">
        <a className="wordmark" href="/" aria-label="Meridian Station home">
          <span className="wordmark-mark" aria-hidden="true">
            M
          </span>
          <span>Meridian Station</span>
        </a>

        <nav className="desktop-nav" aria-label="Primary navigation">
          <a href="/#knowledgebase">AI Knowledgebase</a>
          <a href="/mobile">Mobile App</a>
          <a href="/about">About</a>
          <a href="/project-story">Project Story</a>
          <a href="/privacy">Privacy</a>
        </nav>

        <details className="mobile-nav">
          <summary>Menu</summary>
          <nav aria-label="Mobile navigation">
            <a href="/#knowledgebase">AI Knowledgebase</a>
            <a href="/mobile">Mobile App</a>
            <a href="/about">About</a>
            <a href="/project-story">Project Story</a>
            <a href="/privacy">Privacy</a>
          </nav>
        </details>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-top">
          <a className="footer-name" href="/">
            Meridian Station
          </a>
          <nav aria-label="Footer navigation">
            <a href="mailto:contact@meridianstation.org">Contact</a>
            <a href="/privacy">Privacy</a>
          </nav>
        </div>
        <div className="footer-meta">
          <p>
            Educational information only. Meridian Station does not diagnose
            conditions, recommend treatment, or replace professional medical
            care.
          </p>
          <p>Publication responsibility: Norman Dumont, Founder.</p>
        </div>
      </div>
    </footer>
  )
}

function AskInterface() {
  return (
    <section
      className="ask-section"
      id="knowledgebase"
      aria-labelledby="ask-title"
    >
      <div className="section-kicker">AI-assisted research exploration</div>
      <h2 id="ask-title">Ask Parkinson’s Insights</h2>
      <p className="ask-intro">
        Explore research, symptoms, exercise, technology, and emerging evidence.
      </p>

      <form className="ask-form" id="ask-form" data-endpoint="/api/ask">
        <label className="sr-only" htmlFor="ask-question">
          Your Parkinson’s research question
        </label>
        <div className="composer">
          <textarea
            id="ask-question"
            name="question"
            rows={2}
            maxLength={4000}
            placeholder="Ask a question about Parkinson’s…"
          />
          <button className="ask-button" type="submit">
            Ask
          </button>
        </div>
        <div className="form-actions">
          <p>
            Educational information only. Do not submit medical records or other
            sensitive personal information.
          </p>
          <button className="reset-button" type="reset">
            Clear
          </button>
        </div>
        <details className="safety-note">
          <summary>Responsible-use information</summary>
          <p>
            Answers may be incomplete, incorrect, or out of date. This prototype
            does not diagnose conditions, recommend treatment, or replace
            medical care. Questions are sent securely to the Meridian Station
            research service for processing.
          </p>
        </details>
        <p
          id="ask-status"
          className="ask-status"
          role="status"
          aria-live="polite"
        />
      </form>

      <div className="answer-region" aria-live="polite">
        <h3 id="ask-answer-heading" hidden>
          Answer
        </h3>
        <p id="ask-answer" className="answer-copy" />
        <p id="ask-sources" className="answer-sources" />
      </div>
    </section>
  )
}

function DevicePreview() {
  return (
    <div
      className="device-wrap"
      aria-label="Conceptual mobile application preview"
    >
      <div className="device">
        <div className="device-speaker" />
        <div className="device-screen">
          <div className="device-header">
            <span>Today</span>
            <span className="device-dot" />
          </div>
          <div className="device-copy">
            <span>Daily observations</span>
            <strong>
              Notice change,
              <br />
              not just moments.
            </strong>
          </div>
          <div className="signal" aria-hidden="true">
            {[22, 35, 29, 56, 42, 68, 61, 82, 66, 74, 58, 88].map(
              (height, index) => (
                <span key={index} style={{ height: `${height}%` }} />
              ),
            )}
          </div>
          <div className="device-rows">
            <div>
              <span>Movement</span>
              <i />
            </div>
            <div>
              <span>Exercise</span>
              <i />
            </div>
            <div>
              <span>Sleep</span>
              <i />
            </div>
          </div>
        </div>
      </div>
      <div className="device-orbit" aria-hidden="true" />
    </div>
  )
}

function HomePage() {
  useEffect(() => {
    const existing = document.querySelector<HTMLScriptElement>(
      "script[data-ask-script]",
    )
    if (existing) return

    const script = document.createElement("script")
    script.src = "/ask.js"
    script.dataset.askScript = "true"
    script.async = true
    document.body.appendChild(script)
  }, [])

  return (
    <>
      <Header />
      <main id="main-content">
        <section className="hero">
          <div className="hero-inner">
            <p className="hero-kicker">Parkinson’s research and technology</p>
            <h1>
              Finding direction through evidence, experience, and emerging
              technology.
            </h1>
            <p className="hero-copy">
              Meridian Station explores AI-assisted Parkinson’s research and new
              ways to understand responsibly selected observations over time.
            </p>
          </div>
        </section>

        <AskInterface />

        <section className="mobile-product" aria-labelledby="mobile-title">
          <div className="mobile-copy">
            <div className="section-kicker">Mobile application</div>
            <h2 id="mobile-title">Understanding change over time.</h2>
            <p>
              Meridian Station is developing a mobile application to explore
              responsibly selected observations such as movement, exercise,
              symptoms, sleep, and environment over time.
            </p>
            <p className="product-caveat">
              An exploratory technology project—not a diagnostic or clinical
              product.
            </p>
            <a className="text-link" href="/mobile">
              Explore the mobile project <span aria-hidden="true">→</span>
            </a>
          </div>
          <DevicePreview />
        </section>

        <section className="story-nav" aria-labelledby="story-nav-title">
          <div>
            <div className="section-kicker">The work behind the products</div>
            <h2 id="story-nav-title">Explore Meridian Station</h2>
          </div>
          <nav aria-label="Explore Meridian Station">
            {storyLinks.map((link) => (
              <a href={link.href} key={link.href}>
                <span>{link.label}</span>
                <span aria-hidden="true">→</span>
              </a>
            ))}
          </nav>
        </section>
      </main>
      <Footer />
    </>
  )
}

function MobilePage() {
  return (
    <>
      <Header />
      <main id="main-content">
        <article className="detail-page">
          <div className="detail-heading">
            <div className="section-kicker">Mobile application</div>
            <h1>Understanding change over time.</h1>
            <p>
              Meridian Station is exploring how responsibly selected
              observations could help people recognize patterns and formulate
              better questions over time.
            </p>
          </div>
          <div className="detail-feature">
            <DevicePreview />
            <div>
              <h2>Context matters.</h2>
              <p>
                Potential observations include movement, exercise, symptoms,
                sleep, environment, and other carefully selected measurements.
                More information is not automatically better; purpose,
                relevance, burden, missing context, and measurement quality all
                matter.
              </p>
              <p>
                Patterns would be prompts for further investigation—not proof of
                causation. Any future collection would require defined purposes,
                informed consent, and separate privacy safeguards.
              </p>
              <p className="product-caveat">
                This project is in development. It is not a clinical,
                diagnostic, or treatment product.
              </p>
            </div>
          </div>
        </article>
      </main>
      <Footer />
    </>
  )
}

function DetailPage({ content }: { content: typeof pageContent[string] }) {
  return (
    <>
      <Header />
      <main id="main-content">
        <article className="detail-page">
          <div className="detail-heading">
            <div className="section-kicker">{content.eyebrow}</div>
            <h1>{content.title}</h1>
            <p>{content.intro}</p>
          </div>
          <div className="detail-sections">
            {content.sections.map((section) => (
              <section key={section.title}>
                <h2>{section.title}</h2>
                <p>{section.body}</p>
              </section>
            ))}
          </div>
        </article>
      </main>
      <Footer />
    </>
  )
}

export default function App() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/"

  useEffect(() => {
    const content = pageContent[path]
    document.title = content
      ? `${content.title} | Meridian Station`
      : path === "/mobile"
        ? "Mobile application | Meridian Station"
        : "Meridian Station | Parkinson’s research and technology"
  }, [path])

  if (path === "/mobile") return <MobilePage />
  if (pageContent[path]) return <DetailPage content={pageContent[path]} />
  return <HomePage />
}
