import './style.css'

const app = document.querySelector('#app')

const clamp = (n, min, max) => Math.min(max, Math.max(min, n))

const ftFromM = (m) => (Number.isFinite(m) ? m * 3.28084 : NaN)
const ktsFromMS = (ms) => (Number.isFinite(ms) ? ms * 1.94384449 : NaN)

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

const recommend = ({ heightCm, weightKg, ability, conditions }) => {
  const h = clamp(heightCm, 120, 220)
  const w = clamp(weightKg, 35, 150)

  const waveFt = conditions?.waveFt
  const periodS = conditions?.periodS
  const windKts = conditions?.windKts

  const hasForecast =
    Number.isFinite(waveFt) && Number.isFinite(periodS) && Number.isFinite(windKts)

  const energy = hasForecast ? waveFt * (periodS / 10) : 0
  const isClean = hasForecast ? windKts <= 15 : false
  const isHeavy = hasForecast ? energy >= 6.5 && isClean : false
  const isExtreme = hasForecast ? waveFt >= 8 || (energy >= 7.5 && isClean) : false

  let boardType = 'All-around'
  if (hasForecast) {
    if (waveFt < 3) boardType = 'Longboard'
    else if (waveFt < 5) boardType = 'Midlength'
    else if (waveFt < 7) boardType = 'Shortboard'
    else boardType = 'Step-up'
  }

  if (ability === 'beginner' && boardType === 'Shortboard') boardType = 'Midlength'
  if (ability === 'beginner' && boardType === 'Step-up') boardType = 'Midlength'
  if (ability === 'intermediate' && boardType === 'Step-up') boardType = 'Shortboard'

  const volumeRanges = {
    beginner: { allMin: 0.65, allMax: 0.85, shortMin: 0.45, shortMax: 0.58 },
    intermediate: { allMin: 0.55, allMax: 0.72, shortMin: 0.38, shortMax: 0.5 },
    advanced: { allMin: 0.48, allMax: 0.65, shortMin: 0.34, shortMax: 0.45 },
  }

  const v = volumeRanges[ability] ?? volumeRanges.intermediate

  let volumeMin = w * v.allMin
  let volumeMax = w * v.allMax
  let volumeShortMin = w * v.shortMin
  let volumeShortMax = w * v.shortMax

  if (isHeavy) {
    volumeMin *= 0.95
    volumeMax *= 0.98
  }

  if (!isClean && hasForecast) {
    volumeMin *= 1.05
    volumeMax *= 1.08
  }

  let lengthCmMin = h + 10
  let lengthCmMax = h + 25

  if (boardType === 'Longboard') {
    lengthCmMin = h + 35
    lengthCmMax = h + 55
  }

  if (boardType === 'Shortboard') {
    lengthCmMin = h - 5
    lengthCmMax = h + 10
  }

  if (boardType === 'Step-up') {
    lengthCmMin = h + 10
    lengthCmMax = h + 30
  }

  return {
    boardType,
    isExtreme,
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
      <section class="hero hero-photo">
        <div class="container hero-inner">
          <div class="hero-copy">
            <div class="kicker">Tofino • Board recommendations</div>
            <h1>Surfboard recommendations, tuned to the conditions.</h1>
            <p class="lead">
              We combine height, weight, and ability with nearby buoy readings to suggest board type, length,
              and volume.
            </p>
            <div class="hero-links">
              <a class="inline-link" href="https://www.surfline.com/" target="_blank" rel="noreferrer">Surfline</a>
              <span class="dot" aria-hidden="true">•</span>
              <a class="inline-link" href="#finder">Use Board Finder</a>
            </div>
          </div>
        </div>
      </section>

      <section id="finder" class="section">
        <div class="container">
          <div class="panel">
            <div class="panel-head">
              <h2>Board Finder</h2>
              <p class="sublead">Live conditions are pulled from a nearby NOAA buoy. Use as guidance, not a guarantee.</p>
              <div id="forecast" class="forecast" aria-live="polite">
                <div class="forecast-title">Current conditions</div>
                <div class="forecast-body" id="forecast-body">Loading buoy data…</div>
              </div>
              <div id="warning" class="warning" hidden>
                <div class="warning-title">Extreme conditions</div>
                <div class="warning-body" id="warning-body"></div>
              </div>
            </div>

            <form id="board-form" class="form" novalidate>
              <div class="fields">
                <label class="field">
                  <span class="label">Ability</span>
                  <div class="control control-single">
                    <select id="ability" aria-label="Ability">
                      <option value="beginner">Beginner</option>
                      <option value="intermediate" selected>Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                </label>

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
                <div class="result-title">Recommendation</div>
                <div class="result-row">
                  <div class="result-k">Board type</div>
                  <div class="result-v" id="board-type"></div>
                </div>
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
                <div class="result-title">Lower-volume range</div>
                <div class="result-row">
                  <div class="result-k">Volume</div>
                  <div class="result-v" id="short-volume"></div>
                </div>
                <div class="result-foot">If you’re not sure, start with the main recommendation.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="notes" class="section section-muted">
        <div class="container prose">
          <h2>Notes</h2>
          <p>
            Surfline remains the best overall forecast experience. This site uses publicly available buoy readings
            to keep things automatic without API keys.
          </p>
          <p>
            Next we can improve accuracy by adding local spots, tide windows, swell direction filters, and an ability-based
            safety gate.
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
const abilityEl = document.getElementById('ability')
const hintEl = document.getElementById('hint')
const resultsEl = document.getElementById('results')
const boardTypeEl = document.getElementById('board-type')
const allaroundLengthEl = document.getElementById('allaround-length')
const allaroundVolumeEl = document.getElementById('allaround-volume')
const shortVolumeEl = document.getElementById('short-volume')
const resetEl = document.getElementById('reset')

const forecastBodyEl = document.getElementById('forecast-body')
const warningEl = document.getElementById('warning')
const warningBodyEl = document.getElementById('warning-body')

let latestConditions = null

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
  const ability = abilityEl.value

  const heightCm = cmFrom(heightRaw, heightUnitEl.value)
  const weightKg = kgFrom(weightRaw, weightUnitEl.value)

  if (!Number.isFinite(heightCm) || !Number.isFinite(weightKg)) {
    resultsEl.hidden = true
    setHint('Enter your height and weight to get a recommendation.')
    warningEl.hidden = true
    return
  }

  if (heightCm < 120 || heightCm > 220 || weightKg < 35 || weightKg > 150) {
    resultsEl.hidden = true
    setHint('Those numbers look unusual—double-check your units.')
    warningEl.hidden = true
    return
  }

  const rec = recommend({ heightCm, weightKg, ability, conditions: latestConditions })

  boardTypeEl.textContent = rec.boardType
  allaroundLengthEl.textContent = `${rec.lengthHumanMin} – ${rec.lengthHumanMax}`
  allaroundVolumeEl.textContent = `${rec.volumeMin} – ${rec.volumeMax} L`
  shortVolumeEl.textContent = `${rec.volumeShortMin} – ${rec.volumeShortMax} L`

  resultsEl.hidden = false
  setHint('')

  if (rec.isExtreme && ability !== 'advanced') {
    warningBodyEl.textContent =
      'Forecast conditions appear heavy. If you’re not an advanced surfer, consider sitting it out or choosing a sheltered spot.'
    warningEl.hidden = false
  } else {
    warningEl.hidden = true
  }
}

document.getElementById('board-form').addEventListener('submit', (e) => {
  e.preventDefault()
  render()
})

;[abilityEl, heightEl, weightEl, heightUnitEl, weightUnitEl].forEach((el) => {
  el.addEventListener('input', render)
  el.addEventListener('change', render)
})

resetEl.addEventListener('click', () => {
  abilityEl.value = 'intermediate'
  heightEl.value = ''
  weightEl.value = ''
  heightUnitEl.value = 'cm'
  weightUnitEl.value = 'kg'
  render()
  heightEl.focus()
})

const fmtCond = (conditions) => {
  if (!conditions) return 'Buoy data unavailable.'
  const wave = Number.isFinite(conditions.waveFt)
    ? `${conditions.waveFt.toFixed(1)} ft`
    : '—'
  const period = Number.isFinite(conditions.periodS) ? `${Math.round(conditions.periodS)}s` : '—'
  const wind = Number.isFinite(conditions.windKts) ? `${Math.round(conditions.windKts)} kts` : '—'
  return `WVHT ${wave} @ ${period} • Wind ${wind}`
}

const loadForecast = async () => {
  try {
    const res = await fetch('/api/forecast', { headers: { accept: 'application/json' } })
    if (!res.ok) throw new Error(`Forecast error: ${res.status}`)
    const json = await res.json()
    if (!json?.ok) throw new Error('Forecast error')

    const waveM = json?.waves?.significantWaveHeightM
    const periodS = json?.waves?.dominantPeriodS
    const windMS = json?.wind?.speedMS

    const waveFt = ftFromM(waveM)
    const windKts = ktsFromMS(windMS)

    latestConditions = {
      waveFt: Number.isFinite(waveFt) ? waveFt : null,
      periodS: Number.isFinite(periodS) ? periodS : null,
      windKts: Number.isFinite(windKts) ? windKts : null,
    }

    forecastBodyEl.textContent = fmtCond(latestConditions)
  } catch {
    latestConditions = null
    forecastBodyEl.textContent = 'Buoy data unavailable.'
  } finally {
    render()
  }
}

render()
loadForecast()
