export async function onRequestGet({ request }) {
  const stations = {
    '46206': { name: 'La Perouse Bank', lat: 48.84, lon: -126.0 },
    '46204': { name: 'Middle Nomad', lat: 51.38, lon: -128.77 },
    '46146': { name: 'Halibut Bank', lat: 49.34, lon: -123.73 },
    '44137': { name: 'East Scotia Slope', lat: 42.26, lon: -62.03 },
    '44258': { name: 'Halifax Harbour', lat: 44.5, lon: -63.4 },
    '45132': { name: 'Port Stanley', lat: 42.46, lon: -81.22 },
    '45139': { name: 'West Lake Ontario (Grimsby)', lat: 43.25, lon: -79.53 },
    '45137': { name: 'Georgian Bay', lat: 45.54, lon: -81.02 },
  }

  const requestUrl = new URL(request.url)
  const stationParam = requestUrl.searchParams.get('station')
  const station = stationParam && stations[stationParam] ? stationParam : '46206'
  const url = `https://www.ndbc.noaa.gov/data/realtime2/${station}.txt`

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'surf-buddy/1.0 (Cloudflare Pages Function)',
      },
    })

    if (!res.ok) {
      return new Response(
        JSON.stringify({ ok: false, error: `Upstream error: ${res.status}` }),
        {
          status: 502,
          headers: {
            'content-type': 'application/json; charset=utf-8',
            'cache-control': 'no-store',
          },
        },
      )
    }

    const text = await res.text()
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)

    const dataLine = lines.find((l) => !l.startsWith('#'))
    const headerLine = lines.find((l) => l.startsWith('#'))

    if (!dataLine || !headerLine) {
      return new Response(JSON.stringify({ ok: false, error: 'No data found' }), {
        status: 502,
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'no-store',
        },
      })
    }

    const headers = headerLine.replace(/^#/, '').trim().split(/\s+/)
    const values = dataLine.split(/\s+/)

    const map = {}
    headers.forEach((h, i) => {
      map[h] = values[i]
    })

    const num = (v) => {
      const n = Number(v)
      return Number.isFinite(n) ? n : null
    }

    const payload = {
      ok: true,
      source: {
        provider: 'NOAA NDBC',
        station,
        stationName: stations[station]?.name ?? station,
        stationLat: stations[station]?.lat ?? null,
        stationLon: stations[station]?.lon ?? null,
        url,
      },
      timestamp: {
        year: num(map.YY),
        month: num(map.MM),
        day: num(map.DD),
        hour: num(map.hh),
        minute: num(map.mm),
      },
      waves: {
        significantWaveHeightM: num(map.WVHT),
        dominantPeriodS: num(map.DPD) ?? num(map.APD),
        directionDeg: num(map.MWD),
      },
      wind: {
        speedMS: num(map.WSPD),
        gustMS: num(map.GST),
        directionDeg: num(map.WDIR),
      },
      waterTempC: num(map.WTMP),
    }

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'public, max-age=300',
      },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }),
      {
        status: 500,
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'no-store',
        },
      },
    )
  }
}
