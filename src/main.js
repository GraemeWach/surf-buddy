import './style.css'

const app = document.querySelector('#app')

const clamp = (n, min, max) => Math.min(max, Math.max(min, n))

const kgFrom = (value, unit) => {
  if (!Number.isFinite(value)) return NaN
  if (unit === 'kg') return value
  if (unit === 'lb') return value * 0.45359237
  return NaN
}

const cmFrom = (value, unit) => {
  if (!Number.isFinite(value)) return NaN
  if (unit === 'cm') return value
  if (unit === 'in') return value * 2.54
  return NaN
}

const fmtFtIn = (cm) => {
  const totalIn = cm / 2.54
  const ft = Math.floor(totalIn / 12)
  const inch = Math.round(totalIn - ft * 12)
  if (!Number.isFinite(ft) || !Number.isFinite(inch)) return ''
  if (inch === 12) return `${ft + 1}'0"`
  return `${ft}'${inch}"`
}

const recommend = ({ heightCm, weightKg }) => {
  const h = clamp(heightCm, 120, 220)
  const w = clamp(weightKg, 35, 150)

  const lengthCmMin = h + 10
  const lengthCmMax = h + 25

  const volumeMin = w * 0.55
  const volumeMax = w * 0.7

  const volumeShortMin = w * 0.4
  const volumeShortMax = w * 0.52

  return {
    lengthCmMin,
    lengthCmMax,
    lengthHumanMin: fmtFtIn(lengthCmMin),
    lengthHumanMax: fmtFtIn(lengthCmMax),
    volumeMin: Math.round(volumeMin),
    volumeMax: Math.round(volumeMax),
    volumeShortMin: Math.round(volumeShortMin),
    volumeShortMax: Math.round(volumeShortMax),
  }
}

app.innerHTML = `
  <div class="page">
    <header class="site-header">
      <div class="container header-inner">
        <a class="brand" href="#top" aria-label="Surf Buddy home">
          <span class="brand-name">Surf Buddy</span>
        </a>
        <nav class="nav" aria-label="Primary">
          <a class="nav-link" href="#finder">Board Finder</a>
          <a class="nav-link" href="#notes">Notes</a>
        </nav>
      </div>
    </header>

    <main id="top">
      <section class="hero">
        <div class="container hero-inner">
          <div class="hero-copy">
            <div class="kicker">An editorial board-size guide</div>
            <h1>Find your board length and volume.</h1>
            <p class="lead">
              Enter your height and weight. We’ll recommend an all-around range (midlength / funboard)
              plus a lower-volume shortboard range.
            </p>
          </div>
        </div>
      </section>

      <section id="finder" class="section">
        <div class="container">
          <div class="panel">
            <div class="panel-head">
              <h2>Board Finder</h2>
              <p class="sublead">A starting point. Your ability, waves, and goals still matter.</p>
            </div>

            <form id="board-form" class="form" novalidate>
              <div class="fields">
                <label class="field">
                  <span class="label">Height</span>
                  <div class="control">
                    <input id="height" inputmode="decimal" autocomplete="off" placeholder="e.g. 180" />
                    <select id="height-unit" aria-label="Height unit">
                      <option value="cm" selected>cm</option>
                      <option value="in">in</option>
                    </select>
                  </div>
                </label>

                <label class="field">
                  <span class="label">Weight</span>
                  <div class="control">
                    <input id="weight" inputmode="decimal" autocomplete="off" placeholder="e.g. 80" />
                    <select id="weight-unit" aria-label="Weight unit">
                      <option value="kg" selected>kg</option>
                      <option value="lb">lb</option>
                    </select>
                  </div>
                </label>
              </div>

              <div class="actions">
                <button class="btn btn-primary" type="submit">Recommend</button>
                <button class="btn btn-ghost" type="button" id="reset">Reset</button>
                <div class="hint" id="hint" role="status" aria-live="polite"></div>
              </div>
            </form>

            <div id="results" class="results" hidden>
              <div class="result">
                <div class="result-title">All-around board</div>
                <div class="result-row">
                  <div class="result-k">Length</div>
                  <div class="result-v" id="allaround-length"></div>
                </div>
                <div class="result-row">
                  <div class="result-k">Volume</div>
                  <div class="result-v" id="allaround-volume"></div>
                </div>
              </div>

              <div class="result">
                <div class="result-title">Shortboard (lower volume)</div>
                <div class="result-row">
                  <div class="result-k">Volume</div>
                  <div class="result-v" id="short-volume"></div>
                </div>
                <div class="result-foot">If you’re not sure, start with the all-around range.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="notes" class="section section-muted">
        <div class="container prose">
          <h2>Notes</h2>
          <p>
            These ranges are conservative and meant for typical, average-fit surfers. Wave energy, wetsuit weight,
            skill, and preferred style can shift the recommendation.
          </p>
          <p>
            Next we can add: ability level, age, fitness, local spot types, and board categories (fish, step-up,
            longboard) to make it more accurate.
          </p>
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

const heightEl = document.getElementById('height')
const weightEl = document.getElementById('weight')
const heightUnitEl = document.getElementById('height-unit')
const weightUnitEl = document.getElementById('weight-unit')
const hintEl = document.getElementById('hint')
const resultsEl = document.getElementById('results')
const allaroundLengthEl = document.getElementById('allaround-length')
const allaroundVolumeEl = document.getElementById('allaround-volume')
const shortVolumeEl = document.getElementById('short-volume')
const resetEl = document.getElementById('reset')

const setHint = (text) => {
  hintEl.textContent = text
}

const parseNumber = (raw) => {
  if (typeof raw !== 'string') return NaN
  const cleaned = raw.replace(/,/g, '.').trim()
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : NaN
}

const render = () => {
  const heightRaw = parseNumber(heightEl.value)
  const weightRaw = parseNumber(weightEl.value)

  const heightCm = cmFrom(heightRaw, heightUnitEl.value)
  const weightKg = kgFrom(weightRaw, weightUnitEl.value)

  if (!Number.isFinite(heightCm) || !Number.isFinite(weightKg)) {
    resultsEl.hidden = true
    setHint('Enter your height and weight to get a recommendation.')
    return
  }

  if (heightCm < 120 || heightCm > 220 || weightKg < 35 || weightKg > 150) {
    resultsEl.hidden = true
    setHint('Those numbers look unusual—double-check your units.')
    return
  }

  const rec = recommend({ heightCm, weightKg })

  allaroundLengthEl.textContent = `${rec.lengthHumanMin} – ${rec.lengthHumanMax}`
  allaroundVolumeEl.textContent = `${rec.volumeMin} – ${rec.volumeMax} L`
  shortVolumeEl.textContent = `${rec.volumeShortMin} – ${rec.volumeShortMax} L`

  resultsEl.hidden = false
  setHint('')
}

document.getElementById('board-form').addEventListener('submit', (e) => {
  e.preventDefault()
  render()
})

;[heightEl, weightEl, heightUnitEl, weightUnitEl].forEach((el) => {
  el.addEventListener('input', render)
  el.addEventListener('change', render)
})

resetEl.addEventListener('click', () => {
  heightEl.value = ''
  weightEl.value = ''
  heightUnitEl.value = 'cm'
  weightUnitEl.value = 'kg'
  render()
  heightEl.focus()
})

render()
