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

const setBuoySwellArrows = (stationToDirDeg) => {
  ensureMap()
  if (!map || !window.L) return

  buoyDirMarkers.forEach((x) => {
    try {
      map.removeLayer(x)
    } catch {
      // ignore
    }
  })
  buoyDirMarkers = []

  buoyMarkers.forEach(({ station, marker }) => {
    const dir = stationToDirDeg[station]
    if (!Number.isFinite(dir)) return
    const pos = marker.getLatLng()
    const html = `<div style="transform: rotate(${dir}deg); font-size: 18px; line-height: 18px; color: #0b3d2e;">➤</div>`
    const icon = window.L.divIcon({
      html,
      className: 'dir-icon',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    })
    const m = window.L.marker(pos, { icon, interactive: false }).addTo(map)
    buoyDirMarkers.push(m)
  })
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

  const waveFtRaw = conditions?.waveFt
  const periodS = conditions?.periodS
  const windKts = conditions?.windKts

  const spotExposure = Number.isFinite(conditions?.spotExposure)
    ? clamp(conditions.spotExposure, 0.6, 1.25)
    : 1
  const waveFt = Number.isFinite(waveFtRaw) ? waveFtRaw * spotExposure : waveFtRaw

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
      </div>
    </header>

    <main id="top">
      <section class="hero hero-photo">
        <div class="container hero-inner">
          <div class="hero-copy">
            <h1>Surf Buddy</h1>
          </div>
        </div>
      </section>

      <section id="finder" class="section">
        <div class="container">
          <div class="panel">
            <div class="panel-head">
              <h2>Board Finder</h2>
              <div class="spot-row">
                <label class="spot-label" for="spot">Spot</label>
                <select id="spot" aria-label="Spot"></select>
              </div>
              <div class="geo-row">
                <button class="btn btn-ghost" type="button" id="geo">Use my location</button>
                <div class="geo-status" id="geo-status" role="status" aria-live="polite"></div>
              </div>
              <div class="nearby" id="nearby" hidden>
                <div class="nearby-title">Nearby spots</div>
                <div class="nearby-list" id="nearby-list"></div>
              </div>
              <div id="forecast" class="forecast" aria-live="polite">
                <div class="forecast-title">Current conditions</div>
                <div class="forecast-body" id="forecast-body">Loading buoy data…</div>
                <div class="tide" id="tide" hidden>
                  <div class="tide-title">Tide</div>
                  <div class="tide-body" id="tide-body"></div>
                </div>
              </div>
              <div id="outlook" class="forecast" aria-live="polite">
                <div class="forecast-title">3-day outlook</div>
                <div class="forecast-body" id="outlook-body">Loading…</div>
              </div>
              <div id="warning" class="warning" hidden>
                <div class="warning-title">Extreme conditions</div>
                <div class="warning-body" id="warning-body"></div>
              </div>
            </div>

            <div class="map-wrap" aria-label="Map">
              <div id="map" class="map" role="application" aria-label="Map of buoy and surf spots"></div>
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
                    <input id="height" inputmode="decimal" autocomplete="off" placeholder="e.g. 70" />
                    <select id="height-unit" aria-label="Height unit">
                      <option value="in" selected>in</option>
                      <option value="cm">cm</option>
                    </select>
                  </div>
                </label>

                <label class="field">
                  <span class="label">Weight</span>
                  <div class="control">
                    <input id="weight" inputmode="decimal" autocomplete="off" placeholder="e.g. 175" />
                    <select id="weight-unit" aria-label="Weight unit">
                      <option value="lb" selected>lb</option>
                      <option value="kg">kg</option>
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
              </div>
            </div>
          </div>
        </div>
      </section>

    </main>

    <footer class="site-footer">
      <div class="container footer-inner">
        <div>© ${new Date().getFullYear()} Surf Buddy</div>
        <div class="footer-links">
          <a href="https://commons.wikimedia.org/wiki/File:Crab_shell_partially_buried_in_sand_at_Long_Beach,_in_Tofino,_British_Columbia_Canada.JPG" target="_blank" rel="noreferrer">Photo credit</a>
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
const outlookBodyEl = document.getElementById('outlook-body')
const tideEl = document.getElementById('tide')
const tideBodyEl = document.getElementById('tide-body')
const warningEl = document.getElementById('warning')
const warningBodyEl = document.getElementById('warning-body')
const spotEl = document.getElementById('spot')
const geoBtnEl = document.getElementById('geo')
const geoStatusEl = document.getElementById('geo-status')
const nearbyEl = document.getElementById('nearby')
const nearbyListEl = document.getElementById('nearby-list')

// Enforce default unit preferences on load.
heightUnitEl.value = 'in'
weightUnitEl.value = 'lb'

let latestConditions = null
let latestMarine = null
let latestWeather = null
let selectedSpotId = 'cox-bay'
let selectedStationOverride = null
let activeProvince = null

const allSpots = [
  {
    id: 'cox-bay',
    name: 'Cox Bay',
    lat: 49.085,
    lon: -125.883,
    exposure: 1.05,
    station: '46206',
    province: 'BC',
  },
  {
    id: 'chesterman',
    name: 'Chesterman Beach',
    lat: 49.144,
    lon: -125.904,
    exposure: 0.9,
    station: '46206',
    province: 'BC',
  },
  {
    id: 'long-beach',
    name: 'Long Beach',
    lat: 49.055,
    lon: -125.745,
    exposure: 1.0,
    station: '46206',
    province: 'BC',
  },
  {
    id: 'wickaninnish',
    name: 'Wickaninnish',
    lat: 49.052,
    lon: -125.742,
    exposure: 0.95,
    station: '46206',
    province: 'BC',
  },
  {
    id: 'jordan-river',
    name: 'Jordan River',
    lat: 48.422,
    lon: -124.036,
    exposure: 1.05,
    station: '46146',
    province: 'BC',
  },
  {
    id: 'sombrio',
    name: 'Sombrio Beach',
    lat: 48.529,
    lon: -124.345,
    exposure: 1.05,
    station: '46146',
    province: 'BC',
  },
  {
    id: 'botanical',
    name: 'Botanical Beach (Port Renfrew)',
    lat: 48.557,
    lon: -124.419,
    exposure: 0.95,
    station: '46146',
    province: 'BC',
  },
  {
    id: 'chesterman-north',
    name: 'North Chesterman',
    lat: 49.147,
    lon: -125.905,
    exposure: 0.9,
    station: '46206',
    province: 'BC',
  },
  {
    id: 'haida-gwaii',
    name: 'Haida Gwaii (North Beach)',
    lat: 54.035,
    lon: -131.926,
    exposure: 1.1,
    station: '46204',
    province: 'BC',
  },
  {
    id: 'cow-bay-osbourne',
    name: 'Cow Bay • Osbourne',
    lat: 44.63,
    lon: -63.45,
    exposure: 1.0,
    station: '44258',
    province: 'NS',
  },
  {
    id: 'cow-bay-minutes',
    name: 'Cow Bay • Minutes',
    lat: 44.62,
    lon: -63.44,
    exposure: 1.05,
    station: '44258',
    province: 'NS',
  },
  {
    id: 'lawrencetown-beach',
    name: 'Lawrencetown Beach',
    lat: 44.648,
    lon: -63.343,
    exposure: 1.0,
    station: '44258',
    province: 'NS',
  },
  {
    id: 'lawrencetown-point',
    name: 'Lawrencetown Point',
    lat: 44.655,
    lon: -63.333,
    exposure: 1.05,
    station: '44258',
    province: 'NS',
  },
  {
    id: 'lawrencetown-left',
    name: 'Left Point (Lawrencetown)',
    lat: 44.656,
    lon: -63.335,
    exposure: 1.05,
    station: '44258',
    province: 'NS',
  },
  {
    id: 'lawrencetown-right',
    name: 'Right Point (Lawrencetown)',
    lat: 44.653,
    lon: -63.33,
    exposure: 1.05,
    station: '44258',
    province: 'NS',
  },
  {
    id: 'lawrencetown',
    name: 'Lawrencetown Beach (NS)',
    lat: 44.645,
    lon: -63.304,
    exposure: 1.05,
    station: '44258',
    province: 'NS',
  },
  {
    id: 'martinique',
    name: 'Martinique Beach (NS)',
    lat: 44.663,
    lon: -62.592,
    exposure: 1.05,
    station: '44137',
    province: 'NS',
  },
  {
    id: 'clam-harbour',
    name: 'Clam Harbour Beach (NS)',
    lat: 44.84,
    lon: -62.87,
    exposure: 1.0,
    station: '44137',
    province: 'NS',
  },
  {
    id: 'summerville',
    name: 'Summerville (NS)',
    lat: 43.85,
    lon: -64.83,
    exposure: 1.05,
    station: '44137',
    province: 'NS',
  },
  {
    id: 'white-point',
    name: 'White Point (NS)',
    lat: 43.95,
    lon: -64.68,
    exposure: 1.05,
    station: '44137',
    province: 'NS',
  },
  {
    id: 'cherry-hill',
    name: 'Cherry Hill (NS)',
    lat: 44.3,
    lon: -64.28,
    exposure: 1.0,
    station: '44137',
    province: 'NS',
  },
  {
    id: 'hirtles',
    name: 'Hirtles (NS)',
    lat: 44.22,
    lon: -64.31,
    exposure: 1.0,
    station: '44137',
    province: 'NS',
  },
  {
    id: 'western-head',
    name: 'Western Head (NS)',
    lat: 43.95,
    lon: -64.59,
    exposure: 1.0,
    station: '44137',
    province: 'NS',
  },
  {
    id: 'sable-island',
    name: 'Sable Island (offshore)',
    lat: 43.94,
    lon: -59.91,
    exposure: 1.1,
    station: '44137',
    province: 'NS',
  },
  {
    id: 'sauble',
    name: 'Sauble Beach (ON)',
    lat: 44.637,
    lon: -81.27,
    exposure: 1.0,
    station: '45137',
    province: 'ON',
  },
  {
    id: 'grand-bend',
    name: 'Grand Bend (ON)',
    lat: 43.316,
    lon: -81.757,
    exposure: 1.0,
    station: '45132',
    province: 'ON',
  },
  {
    id: 'hamilton',
    name: 'Hamilton Waterfront (ON)',
    lat: 43.273,
    lon: -79.863,
    exposure: 0.9,
    station: '45139',
    province: 'ON',
  },
]

const getActiveSpots = () => {
  if (activeProvince === 'NS') return allSpots.filter((s) => s.province === 'NS')
  return allSpots
}

const buoys = [
  { station: '46206', name: 'La Perouse Bank', lat: 48.84, lon: -126.0 },
  { station: '46204', name: 'Middle Nomad', lat: 51.38, lon: -128.77 },
  { station: '46146', name: 'Halibut Bank', lat: 49.34, lon: -123.73 },
  { station: '44137', name: 'East Scotia Slope', lat: 42.26, lon: -62.03 },
  { station: '44258', name: 'Halifax Harbour', lat: 44.5, lon: -63.4 },
  { station: '45132', name: 'Port Stanley', lat: 42.46, lon: -81.22 },
  { station: '45139', name: 'West Lake Ontario (Grimsby)', lat: 43.25, lon: -79.53 },
  { station: '45137', name: 'Georgian Bay', lat: 45.54, lon: -81.02 },
]

const getSelectedSpot = () => {
  const list = getActiveSpots()
  return list.find((s) => s.id === selectedSpotId) ?? list[0]
}

const syncSpotSelection = () => {
  const list = getActiveSpots()
  if (!list.some((s) => s.id === selectedSpotId)) {
    selectedSpotId = list[0]?.id ?? selectedSpotId
  }
}

const renderSpotOptions = () => {
  syncSpotSelection()
  const list = getActiveSpots()
  spotEl.innerHTML = ''
  list.forEach((s) => {
    const opt = document.createElement('option')
    opt.value = s.id
    opt.textContent = s.name
    spotEl.appendChild(opt)
  })
  spotEl.value = selectedSpotId
}

const getActiveStation = () => {
  if (selectedStationOverride) return selectedStationOverride
  return getSelectedSpot().station
}

const highlightSelectedBuoy = () => {
  const activeStation = getActiveStation()
  buoyMarkers.forEach(({ station, marker }) => {
    const isActive = station === activeStation
    marker.setStyle({
      radius: isActive ? 9 : 7,
      fillOpacity: isActive ? 0.4 : 0.25,
    })
  })
}

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
  heightUnitEl.value = 'in'
  weightUnitEl.value = 'lb'
  render()
  heightEl.focus()
})

const fmtCond = (conditions) => {
  if (!conditions) return null
  const station = conditions.stationName ? `${conditions.stationName} (${conditions.station})` : '—'
  const wave = Number.isFinite(conditions.waveFt) ? `${conditions.waveFt.toFixed(1)} ft` : '—'
  const period = Number.isFinite(conditions.periodS) ? `${Math.round(conditions.periodS)} s` : '—'
  const wind = Number.isFinite(conditions.windKts) ? `${Math.round(conditions.windKts)} kts` : '—'
  const swellDir = Number.isFinite(conditions.swellDirDeg) ? `${Math.round(conditions.swellDirDeg)}°` : '—'
  const windDir = Number.isFinite(conditions.windDirDeg) ? `${Math.round(conditions.windDirDeg)}°` : '—'

  const parts = [
    { k: 'Buoy', v: station },
    { k: 'Wave', v: `${wave} @ ${period}` },
    { k: 'Swell dir', v: swellDir },
    { k: 'Wind', v: `${wind} @ ${windDir}` },
  ]

  if (conditions.spotName) parts.unshift({ k: 'Spot', v: conditions.spotName })
  if (Number.isFinite(conditions.spotExposure)) {
    parts.push({ k: 'Exposure', v: `x${conditions.spotExposure.toFixed(2)}` })
  }

  return parts
}

const fmtMarine = (marine) => {
  if (!marine?.current) return []
  const waveM = marine.current?.wave_height
  const periodS = marine.current?.wave_period
  const wWaveM = marine.current?.wind_wave_height
  const wWavePeriodS = marine.current?.wind_wave_period
  const wWaveDir = marine.current?.wind_wave_direction

  const out = []
  if (Number.isFinite(waveM)) out.push({ k: 'Model wave', v: `${ftFromM(waveM).toFixed(1)} ft` })
  if (Number.isFinite(periodS)) out.push({ k: 'Model period', v: `${Math.round(periodS)} s` })
  if (Number.isFinite(wWaveM)) out.push({ k: 'Wind wave', v: `${ftFromM(wWaveM).toFixed(1)} ft` })
  if (Number.isFinite(wWavePeriodS)) out.push({ k: 'Wind wave period', v: `${Math.round(wWavePeriodS)} s` })
  if (Number.isFinite(wWaveDir)) out.push({ k: 'Wind wave dir', v: `${Math.round(wWaveDir)}°` })
  return out
}

const tideFromMarine = (marine) => {
  const times = marine?.hourly?.time
  const heights = marine?.hourly?.tide_height
  if (!Array.isArray(times) || !Array.isArray(heights) || times.length !== heights.length) return null

  const now = Date.now()
  let idx = -1
  let best = Infinity
  for (let i = 0; i < times.length; i++) {
    const t = Date.parse(times[i])
    if (!Number.isFinite(t)) continue
    const d = Math.abs(t - now)
    if (d < best) {
      best = d
      idx = i
    }
  }
  if (idx < 0) return null

  const h = Number(heights[idx])
  if (!Number.isFinite(h)) return null

  const hPrev = idx > 0 ? Number(heights[idx - 1]) : NaN
  const hNext = idx + 1 < heights.length ? Number(heights[idx + 1]) : NaN
  const delta = Number.isFinite(hNext) ? hNext - h : Number.isFinite(hPrev) ? h - hPrev : 0
  const trend = delta > 0.02 ? 'Rising' : delta < -0.02 ? 'Falling' : 'Slack'

  const nextExtreme = (() => {
    // Find the next local max/min after idx.
    for (let i = Math.max(1, idx); i < heights.length - 1; i++) {
      const a = Number(heights[i - 1])
      const b = Number(heights[i])
      const c = Number(heights[i + 1])
      if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(c)) continue
      const isHigh = b >= a && b >= c
      const isLow = b <= a && b <= c
      if (!isHigh && !isLow) continue

      const t = times[i]
      if (typeof t !== 'string') continue
      const when = new Date(t)
      if (!Number.isFinite(when.getTime())) continue

      return {
        type: isHigh ? 'High' : 'Low',
        time: when,
        heightM: b,
      }
    }
    return null
  })()

  return { heightM: h, trend, nextExtreme }
}

const renderConditionsList = () => {
  const buoyParts = fmtCond(latestConditions)
  const marineParts = fmtMarine(latestMarine)
  const parts = [...(buoyParts ?? []), ...marineParts]

  if (parts.length === 0) {
    forecastBodyEl.textContent = 'Data unavailable.'
    return
  }

  const ul = document.createElement('ul')
  ul.className = 'cond-list'
  parts.forEach((p) => {
    const li = document.createElement('li')
    li.className = 'cond-item'
    const k = document.createElement('span')
    k.className = 'cond-k'
    k.textContent = p.k
    const v = document.createElement('span')
    v.className = 'cond-v'
    v.textContent = p.v
    li.appendChild(k)
    li.appendChild(v)
    ul.appendChild(li)
  })

  forecastBodyEl.innerHTML = ''
  forecastBodyEl.appendChild(ul)

  const tide = tideFromMarine(latestMarine)
  if (tide) {
    const next = tide.nextExtreme
    const nextTxt = next
      ? ` • Next ${next.type} ${next.time.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
      : ''
    tideBodyEl.textContent = `${tide.heightM.toFixed(2)} m • ${tide.trend}${nextTxt}`
    tideEl.hidden = false
  } else {
    tideEl.hidden = true
  }
}

let buoyMarker = null
let map = null
let spotMarkers = []
let userMarker = null
let geoWatchId = null
let buoyMarkers = []
let buoyDirMarkers = []
let refreshTimer = null

const degToCardinal = (deg) => {
  if (!Number.isFinite(deg)) return '—'
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  const i = Math.round(((deg % 360) / 45)) % 8
  return dirs[i]
}

const fmtDay = (d) =>
  d.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })

const summarize3Day = ({ marine, weather }) => {
  const mt = marine?.hourly?.time
  const mw = marine?.hourly
  const wt = weather?.hourly?.time
  const ww = weather?.hourly

  if (!Array.isArray(mt) || !mw || !Array.isArray(wt) || !ww) return []

  const takeDays = new Map()
  const now = Date.now()

  for (let i = 0; i < mt.length; i++) {
    const t = Date.parse(mt[i])
    if (!Number.isFinite(t) || t < now - 6 * 3600_000) continue
    const dayKey = new Date(t)
    dayKey.setHours(0, 0, 0, 0)
    const key = dayKey.getTime()
    if (!takeDays.has(key)) takeDays.set(key, [])
    takeDays.get(key).push(i)
  }

  const days = Array.from(takeDays.keys()).sort((a, b) => a - b).slice(0, 3)

  const wIndexByTime = new Map()
  for (let i = 0; i < wt.length; i++) {
    const t = Date.parse(wt[i])
    if (Number.isFinite(t)) wIndexByTime.set(t, i)
  }

  const daySummaries = []

  days.forEach((dayTs) => {
    const idxs = takeDays.get(dayTs) ?? []
    const waveHeights = []
    const wavePeriods = []
    const windWaveHeights = []
    const windSpeeds = []
    const windDirs = []

    idxs.forEach((i) => {
      const wh = Number(mw.wave_height?.[i])
      const wp = Number(mw.wave_period?.[i])
      const wwh = Number(mw.wind_wave_height?.[i])
      if (Number.isFinite(wh)) waveHeights.push(wh)
      if (Number.isFinite(wp)) wavePeriods.push(wp)
      if (Number.isFinite(wwh)) windWaveHeights.push(wwh)

      const t = Date.parse(mt[i])
      const wi = wIndexByTime.get(t)
      if (wi != null) {
        const ws = Number(ww.windspeed_10m?.[wi])
        const wd = Number(ww.winddirection_10m?.[wi])
        if (Number.isFinite(ws)) windSpeeds.push(ws)
        if (Number.isFinite(wd)) windDirs.push(wd)
      }
    })

    const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN)
    const max = (xs) => (xs.length ? Math.max(...xs) : NaN)

    const waveFt = ftFromM(max(waveHeights))
    const windWaveFt = ftFromM(max(windWaveHeights))
    const periodS = avg(wavePeriods)
    const windKts = ktsFromMS(avg(windSpeeds) / 3.6)
    const windDir = avg(windDirs)

    daySummaries.push({
      day: new Date(dayTs),
      waveFt: Number.isFinite(waveFt) ? waveFt : null,
      windWaveFt: Number.isFinite(windWaveFt) ? windWaveFt : null,
      periodS: Number.isFinite(periodS) ? periodS : null,
      windKts: Number.isFinite(windKts) ? windKts : null,
      windDirDeg: Number.isFinite(windDir) ? windDir : null,
    })
  })

  return daySummaries
}

const renderOutlook = () => {
  const days = summarize3Day({ marine: latestMarine, weather: latestWeather })
  if (!days.length) {
    outlookBodyEl.textContent = 'Outlook unavailable.'
    return
  }

  const ul = document.createElement('ul')
  ul.className = 'cond-list'
  days.forEach((d) => {
    const wave = d.waveFt != null ? `${d.waveFt.toFixed(1)} ft` : '—'
    const per = d.periodS != null ? `${Math.round(d.periodS)} s` : '—'
    const wind = d.windKts != null ? `${Math.round(d.windKts)} kts` : '—'
    const windDir = d.windDirDeg != null ? `${Math.round(d.windDirDeg)}° ${degToCardinal(d.windDirDeg)}` : '—'
    const windWave = d.windWaveFt != null ? `${d.windWaveFt.toFixed(1)} ft` : '—'

    const li = document.createElement('li')
    li.className = 'cond-item'
    const k = document.createElement('span')
    k.className = 'cond-k'
    k.textContent = fmtDay(d.day)
    const v = document.createElement('span')
    v.className = 'cond-v'
    v.textContent = `Wave ${wave} @ ${per} • Wind ${wind} ${windDir} • Wind swell ${windWave}`
    li.appendChild(k)
    li.appendChild(v)
    ul.appendChild(li)
  })

  outlookBodyEl.innerHTML = ''
  outlookBodyEl.appendChild(ul)
}

const clearSpotMarkers = () => {
  if (!map) return
  spotMarkers.forEach((m) => {
    try {
      map.removeLayer(m)
    } catch {
      // ignore
    }
  })
  spotMarkers = []
}

const renderSpotMarkers = () => {
  ensureMap()
  if (!map || !window.L) return
  clearSpotMarkers()
  spotMarkers = getActiveSpots().map((s) => {
    const m = window.L.marker([s.lat, s.lon]).addTo(map)
    m.bindPopup(`<strong>${s.name}</strong><br/>Click to select.`)
    m.on('click', () => {
      selectedSpotId = s.id
      spotEl.value = s.id
      selectedStationOverride = null
      loadForecast()
    })
    return m
  })
}

const toRad = (d) => (d * Math.PI) / 180

const distanceKm = (a, b) => {
  const R = 6371
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)

  const sin1 = Math.sin(dLat / 2)
  const sin2 = Math.sin(dLon / 2)
  const h = sin1 * sin1 + Math.cos(lat1) * Math.cos(lat2) * sin2 * sin2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

const setGeoStatus = (text) => {
  geoStatusEl.textContent = text
}

const geoErrorText = (err) => {
  const code = err?.code
  if (code === 1) return 'Location permission denied.'
  if (code === 2) return 'Location unavailable.'
  if (code === 3) return 'Location request timed out.'
  return 'Unable to get location.'
}

const geoErrorDetail = (err) => {
  const code = err?.code
  const msg = err?.message
  const parts = []
  if (Number.isFinite(code)) parts.push(`code ${code}`)
  if (msg) parts.push(msg)
  return parts.length ? ` (${parts.join(': ')})` : ''
}

const checkGeoPermission = async () => {
  try {
    if (!navigator.permissions?.query) return null
    const res = await navigator.permissions.query({ name: 'geolocation' })
    return res?.state ?? null
  } catch {
    return null
  }
}

const handleGeoSuccess = (pos) => {
  const user = {
    lat: pos.coords.latitude,
    lon: pos.coords.longitude,
  }

  if (geoWatchId != null && navigator.geolocation?.clearWatch) {
    navigator.geolocation.clearWatch(geoWatchId)
    geoWatchId = null
  }

  setGeoStatus('Location found.')
  setUserMarker(user)
  nearbyEl.hidden = false
  updateProvinceModeFromLatLon(user)
  renderNearby(user)
  if (map) map.setView([user.lat, user.lon], Math.max(map.getZoom(), 9))
}

const renderNearby = (user) => {
  const MAX_NEARBY_KM = 300
  const ranked = getActiveSpots()
    .filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lon))
    .map((s) => ({
      spot: s,
      km: distanceKm(user, { lat: s.lat, lon: s.lon }),
    }))
    .sort((a, b) => a.km - b.km)
    .filter((x) => x.km <= MAX_NEARBY_KM)
    .slice(0, 7)

  nearbyListEl.innerHTML = ''

  if (ranked.length === 0) {
    nearbyListEl.textContent = `No saved spots found within ${MAX_NEARBY_KM} km.`
    nearbyEl.hidden = false
    return
  }

  ranked.forEach(({ spot, km }) => {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'nearby-item'
    btn.textContent = `${spot.name} • ${km.toFixed(0)} km`
    btn.addEventListener('click', () => {
      selectedSpotId = spot.id
      spotEl.value = spot.id
      loadForecast()
      if (map) map.setView([spot.lat, spot.lon], Math.max(map.getZoom(), 10))
    })
    nearbyListEl.appendChild(btn)
  })

  nearbyEl.hidden = ranked.length === 0
}

const setUserMarker = (user) => {
  ensureMap()
  if (!map || !window.L) return
  const pos = [user.lat, user.lon]
  if (!userMarker) {
    userMarker = window.L.circleMarker(pos, {
      radius: 7,
      weight: 2,
      color: '#8c2121',
      fillColor: '#8c2121',
      fillOpacity: 0.18,
    }).addTo(map)
    userMarker.bindPopup('<strong>You</strong>')
  } else {
    userMarker.setLatLng(pos)
  }
}

const ensureMap = () => {
  if (map || typeof window === 'undefined' || !window.L) return

  map = window.L.map('map', {
    zoomControl: true,
    attributionControl: true,
  }).setView([49.1, -125.9], 9)

  window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map)

  buoyMarkers = buoys.map((b) => {
    const m = window.L.circleMarker([b.lat, b.lon], {
      radius: 7,
      weight: 2,
      color: '#0b3d2e',
      fillColor: '#0b3d2e',
      fillOpacity: 0.25,
    }).addTo(map)
    m.bindPopup(`<strong>Buoy</strong><br/>${b.name} (${b.station})<br/>Click to use this buoy.`)
    m.on('click', () => {
      selectedStationOverride = b.station
      loadForecast()
    })
    return { station: b.station, marker: m }
  })

  // Direction arrows (updated when we fetch conditions).
  buoyDirMarkers.forEach((x) => {
    try {
      map.removeLayer(x)
    } catch {
      // ignore
    }
  })
  buoyDirMarkers = []

  renderSpotMarkers()
}

const updateProvinceModeFromLatLon = async (user) => {
  try {
    const url = `/api/reverse?lat=${encodeURIComponent(user.lat)}&lon=${encodeURIComponent(user.lon)}`
    const res = await fetch(url, { headers: { accept: 'application/json' } })
    const text = await res.text()
    if (!res.ok) throw new Error(`Reverse error: ${res.status} ${text}`)
    const json = JSON.parse(text)
    if (!json?.ok) return

    const isNS = json?.countryCode === 'CA' && json?.state === 'Nova Scotia'
    const nextProvince = isNS ? 'NS' : null
    if (activeProvince === nextProvince) return

    activeProvince = nextProvince
    renderSpotOptions()
    renderSpotMarkers()
    loadForecast()
  } catch (err) {
    console.warn('Reverse geocode failed:', err)
  }
}

const loadForecast = async () => {
  try {
    const spot = getSelectedSpot()
    const station = getActiveStation()
    const url = `/api/forecast?station=${encodeURIComponent(station)}`
    const res = await fetch(url, { headers: { accept: 'application/json' } })
    const text = await res.text()
    if (!res.ok) {
      console.warn('Forecast error response:', res.status, text)
      throw new Error(`Forecast error: ${res.status} ${text}`)
    }

    let json
    try {
      json = JSON.parse(text)
    } catch {
      throw new Error('Forecast error: invalid JSON')
    }
    if (!json?.ok) throw new Error('Forecast error')

    const waveM = json?.waves?.significantWaveHeightM
    const periodS = json?.waves?.dominantPeriodS
    const swellDirDeg = json?.waves?.directionDeg
    const windMS = json?.wind?.speedMS
    const windDirDeg = json?.wind?.directionDeg

    const waveFt = ftFromM(waveM)
    const windKts = ktsFromMS(windMS)

    latestConditions = {
      waveFt: Number.isFinite(waveFt) ? waveFt : null,
      periodS: Number.isFinite(periodS) ? periodS : null,
      swellDirDeg: Number.isFinite(swellDirDeg) ? swellDirDeg : null,
      windKts: Number.isFinite(windKts) ? windKts : null,
      windDirDeg: Number.isFinite(windDirDeg) ? windDirDeg : null,
      station: json?.source?.station ?? null,
      stationName: json?.source?.stationName ?? null,
      stationLat: json?.source?.stationLat ?? null,
      stationLon: json?.source?.stationLon ?? null,
      spotId: spot.id,
      spotName: spot.name,
      spotLat: spot.lat,
      spotLon: spot.lon,
      spotExposure: spot.exposure,
    }

    // Fetch model marine + tide data (no key).
    try {
      const marineUrl = `/api/marine?lat=${encodeURIComponent(spot.lat)}&lon=${encodeURIComponent(spot.lon)}`
      const marineRes = await fetch(marineUrl, { headers: { accept: 'application/json' } })
      const marineText = await marineRes.text()
      if (!marineRes.ok) throw new Error(`Marine error: ${marineRes.status} ${marineText}`)
      const marineJson = JSON.parse(marineText)
      latestMarine = marineJson?.ok ? marineJson : null
    } catch (err) {
      latestMarine = null
      console.warn('Marine fetch failed:', err)
    }

    // Fetch weather (no key).
    try {
      const wUrl = `/api/weather?lat=${encodeURIComponent(spot.lat)}&lon=${encodeURIComponent(spot.lon)}`
      const wRes = await fetch(wUrl, { headers: { accept: 'application/json' } })
      const wText = await wRes.text()
      if (!wRes.ok) throw new Error(`Weather error: ${wRes.status} ${wText}`)
      const wJson = JSON.parse(wText)
      latestWeather = wJson?.ok ? wJson : null
    } catch (err) {
      latestWeather = null
      console.warn('Weather fetch failed:', err)
    }

    renderConditionsList()
    renderOutlook()

    // Update simple "swell pattern" arrows.
    setBuoySwellArrows({ [station]: swellDirDeg })

    ensureMap()
    highlightSelectedBuoy()
  } catch (err) {
    latestConditions = null
    latestMarine = null
    latestWeather = null
    tideEl.hidden = true
    forecastBodyEl.textContent = err instanceof Error && err.message ? err.message : 'Data unavailable.'
    outlookBodyEl.textContent = 'Outlook unavailable.'
  } finally {
    render()
  }
}

render()

renderSpotOptions()
spotEl.addEventListener('change', () => {
  selectedSpotId = spotEl.value
  selectedStationOverride = null
  loadForecast()
})

ensureMap()
loadForecast()

const initGeoIfGranted = async () => {
  if (!navigator.geolocation) return

  if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
    return
  }

  const state = await checkGeoPermission()
  if (state !== 'granted') return

  setGeoStatus('Locating…')
  navigator.geolocation.getCurrentPosition(
    handleGeoSuccess,
    (err) => {
      console.warn('Init geolocation error:', err)
      setGeoStatus(`${geoErrorText(err)}${geoErrorDetail(err)}`)
    },
    { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
  )
}

initGeoIfGranted()

geoBtnEl.addEventListener('click', () => {
  nearbyListEl.innerHTML = ''
  nearbyEl.hidden = false

  if (!navigator.geolocation) {
    setGeoStatus('Geolocation is not supported in this browser.')
    return
  }

  if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
    setGeoStatus('Geolocation requires HTTPS. Use the live site or localhost.')
    return
  }

  if (geoWatchId != null && navigator.geolocation?.clearWatch) {
    navigator.geolocation.clearWatch(geoWatchId)
    geoWatchId = null
  }

  setGeoStatus('Requesting location…')

  checkGeoPermission().then((state) => {
    if (!state) return
    if (state === 'denied') setGeoStatus('Location permission denied (browser setting).')
    else if (state === 'prompt') setGeoStatus('Location permission not decided yet — waiting for prompt…')
    else if (state === 'granted') setGeoStatus('Location permission granted — locating…')
  })

  const tryHighAccuracy = () => {
    setGeoStatus('Trying high accuracy…')
    navigator.geolocation.getCurrentPosition(
      handleGeoSuccess,
      (err) => {
        console.warn('Geolocation high accuracy error:', err)
        setGeoStatus(`${geoErrorText(err)}${geoErrorDetail(err)} Trying live updates…`)
        geoWatchId = navigator.geolocation.watchPosition(
          handleGeoSuccess,
          (watchErr) => {
            console.warn('Geolocation watchPosition error:', watchErr)
            setGeoStatus(`${geoErrorText(watchErr)}${geoErrorDetail(watchErr)}`)
          },
          { enableHighAccuracy: false, timeout: 30000, maximumAge: 0 },
        )
      },
      { enableHighAccuracy: true, timeout: 25000, maximumAge: 0 },
    )
  }

  navigator.geolocation.getCurrentPosition(
    handleGeoSuccess,
    (err) => {
      console.warn('Geolocation coarse error:', err)
      setGeoStatus(`${geoErrorText(err)}${geoErrorDetail(err)} Retrying…`)
      tryHighAccuracy()
    },
    { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
  )
})
