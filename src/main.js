import './style.css'

const app = document.querySelector('#app')

app.innerHTML = `
  <div class="page">
    <header class="site-header">
      <div class="container header-inner">
        <a class="brand" href="#top" aria-label="Surf Buddy home">
          <span class="brand-mark" aria-hidden="true"></span>
          <span class="brand-name">Surf Buddy</span>
        </a>
        <nav class="nav" aria-label="Primary">
          <a class="nav-link" href="#features">Features</a>
          <a class="nav-link" href="#about">About</a>
          <a class="nav-link" href="#contact">Contact</a>
        </nav>
        <a class="btn btn-primary" href="#contact">Get Updates</a>
      </div>
    </header>

    <main id="top">
      <section class="hero">
        <div class="container hero-inner">
          <div class="hero-copy">
            <h1>Plan better surf sessions.</h1>
            <p class="lead">
              A simple, fast website for checking conditions, tracking spots, and sharing sessions.
            </p>
            <div class="hero-actions">
              <a class="btn btn-primary" href="#features">See features</a>
              <a class="btn btn-ghost" href="#contact">Join the waitlist</a>
            </div>
            <div class="meta">
              <div class="meta-item">
                <div class="meta-label">Status</div>
                <div class="meta-value">Live on Cloudflare Pages</div>
              </div>
              <div class="meta-item">
                <div class="meta-label">Next</div>
                <div class="meta-value">Add your real content</div>
              </div>
            </div>
          </div>

          <div class="hero-card" role="presentation">
            <div class="hero-card-inner">
              <div class="hero-card-title">Today’s checklist</div>
              <ul class="checklist">
                <li>Pick a spot</li>
                <li>Check swell + wind</li>
                <li>Note tide window</li>
                <li>Go surf</li>
              </ul>
              <div class="hero-card-foot">
                <span class="pill">Fast</span>
                <span class="pill">Mobile friendly</span>
                <span class="pill">Easy to change</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" class="section">
        <div class="container">
          <h2>Features</h2>
          <div class="grid">
            <article class="card">
              <h3>Clean homepage</h3>
              <p>Replace this text with your real message, photos, and links.</p>
            </article>
            <article class="card">
              <h3>Easy deploys</h3>
              <p>Every time you push to GitHub, Cloudflare updates the live site.</p>
            </article>
            <article class="card">
              <h3>Next: data</h3>
              <p>We can add a forecast API, saved spots, and a simple dashboard.</p>
            </article>
          </div>
        </div>
      </section>

      <section id="about" class="section section-muted">
        <div class="container split">
          <div>
            <h2>About</h2>
            <p>
              This is the starting point. We’ll swap the placeholder copy for your real story,
              add pages/sections, and then iterate.
            </p>
          </div>
          <div class="card">
            <h3>Suggested next sections</h3>
            <ul class="bullets">
              <li>Spots (your favorites)</li>
              <li>Forecast (pull from an API)</li>
              <li>Contact / newsletter</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="contact" class="section">
        <div class="container">
          <h2>Contact</h2>
          <p class="sublead">Add a real form later. For now, this button opens an email draft.</p>
          <div class="contact-row">
            <a class="btn btn-primary" href="mailto:graeme.wach@gmail.com?subject=Surf%20Buddy%20Updates">
              Email me
            </a>
            <a class="btn btn-ghost" href="#top">Back to top</a>
          </div>
        </div>
      </section>
    </main>

    <footer class="site-footer">
      <div class="container footer-inner">
        <div>© ${new Date().getFullYear()} Surf Buddy</div>
        <div class="footer-links">
          <a href="https://github.com/GraemeWach/surf-buddy" target="_blank" rel="noreferrer">GitHub</a>
        </div>
      </div>
    </footer>
  </div>
`

document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const href = a.getAttribute('href')
    if (!href || href === '#') return
    const id = href.slice(1)
    const el = document.getElementById(id)
    if (!el) return
    e.preventDefault()
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
})
