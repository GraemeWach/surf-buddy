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
              </div>
              <div id="warning" class="warning" hidden>
                <div class="warning-title">Extreme conditions</div>
                <div class="warning-body" id="warning-body"></div>
              </div>
            </div>

            <div class="map-wrap" aria-label="Map">
              <div id="map" class="map" role="application" aria-label="Map of buoy and surf spots"></div>
              <div class="map-foot">Click a surf spot or a buoy marker to update the data source.</div>
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
const spotEl = document.getElementById('spot')
const geoBtnEl = document.getElementById('geo')
const geoStatusEl = document.getElementById('geo-status')
const nearbyEl = document.getElementById('nearby')
const nearbyListEl = document.getElementById('nearby-list')

// Enforce default unit preferences on load.
heightUnitEl.value = 'in'
weightUnitEl.value = 'lb'

let latestConditions = null
let selectedSpotId = 'cox-bay'
let selectedStationOverride = null

const spots = [
  {
    id: 'cox-bay',
    name: 'Cox Bay',
    lat: 49.085,
    lon: -125.883,
    exposure: 1.05,
    station: '46206',
  },
  {
    id: 'chesterman',
    name: 'Chesterman Beach',
    lat: 49.144,
    lon: -125.904,
    exposure: 0.9,
    station: '46206',
  },
  {
    id: 'long-beach',
    name: 'Long Beach',
    lat: 49.055,
    lon: -125.745,
    exposure: 1.0,
    station: '46206',
  },
  {
    id: 'wickaninnish',
    name: 'Wickaninnish',
    lat: 49.052,
    lon: -125.742,
    exposure: 0.95,
    station: '46206',
  },
  {
    id: 'north-coast',
    name: 'North Coast (farther)',
    lat: 51.38,
    lon: -128.77,
    exposure: 1.0,
    station: '46204',
  },
]

const buoys = [
  { station: '46206', name: 'La Perouse Bank', lat: 48.84, lon: -126.0 },
  { station: '46204', name: 'Middle Nomad', lat: 51.38, lon: -128.77 },
]

const getSelectedSpot = () => spots.find((s) => s.id === selectedSpotId) ?? spots[0]

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
  if (!conditions) return 'Buoy data unavailable.'
  const station = conditions.stationName ? `${conditions.stationName} (${conditions.station})` : ''
  const wave = Number.isFinite(conditions.waveFt)
    ? `${conditions.waveFt.toFixed(1)} ft`
    : '—'
  const period = Number.isFinite(conditions.periodS) ? `${Math.round(conditions.periodS)}s` : '—'
  const wind = Number.isFinite(conditions.windKts) ? `${Math.round(conditions.windKts)} kts` : '—'
  const swellDir = Number.isFinite(conditions.swellDirDeg) ? `${Math.round(conditions.swellDirDeg)}°` : '—'
  const windDir = Number.isFinite(conditions.windDirDeg) ? `${Math.round(conditions.windDirDeg)}°` : '—'
  const spotName = conditions.spotName ? ` • Spot ${conditions.spotName}` : ''
  const exp = Number.isFinite(conditions.spotExposure)
    ? ` (x${conditions.spotExposure.toFixed(2)} exposure)`
    : ''
  return `${station} • Wave ${wave} @ ${period} from ${swellDir} • Wind ${wind} ${windDir}${spotName}${exp}`
}

let buoyMarker = null
let map = null
let spotMarkers = []
let userMarker = null
let geoWatchId = null
let buoyMarkers = []

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
  renderNearby(user)
  if (map) map.setView([user.lat, user.lon], Math.max(map.getZoom(), 9))
}

const renderNearby = (user) => {
  const ranked = spots
    .filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lon))
    .map((s) => ({
      spot: s,
      km: distanceKm(user, { lat: s.lat, lon: s.lon }),
    }))
    .sort((a, b) => a.km - b.km)
    .slice(0, 5)

  nearbyListEl.innerHTML = ''
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
    maxZoom: 18,
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

  spotMarkers = spots
    .filter((s) => s.id !== 'north-coast')
    .map((s) => {
      const m = window.L.marker([s.lat, s.lon]).addTo(map)
      m.bindPopup(`<strong>${s.name}</strong><br/>Click to select.`)
      m.on('click', () => {
        selectedSpotId = s.id
        spotEl.value = s.id
        loadForecast()
      })
      return m
    })
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

    forecastBodyEl.textContent = fmtCond(latestConditions)

    ensureMap()
    highlightSelectedBuoy()
  } catch (err) {
    latestConditions = null
    forecastBodyEl.textContent =
      err instanceof Error && err.message ? err.message : 'Buoy data unavailable.'
  } finally {
    render()
  }
}

render()

spots.forEach((s) => {
  const opt = document.createElement('option')
  opt.value = s.id
  opt.textContent = s.name
  spotEl.appendChild(opt)
})

spotEl.value = selectedSpotId
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
