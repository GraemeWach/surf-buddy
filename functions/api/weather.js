export async function onRequestGet({ request }) {
  const url = new URL(request.url)
  const latRaw = url.searchParams.get('lat')
  const lonRaw = url.searchParams.get('lon')

  const lat = Number(latRaw)
  const lon = Number(lonRaw)

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid lat/lon' }), {
      status: 400,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
      },
    })
  }

  const upstream = new URL('https://api.open-meteo.com/v1/forecast')
  upstream.searchParams.set('latitude', String(lat))
  upstream.searchParams.set('longitude', String(lon))
  upstream.searchParams.set('current', 'windspeed_10m,winddirection_10m,temperature_2m,precipitation')
  upstream.searchParams.set('hourly', 'windspeed_10m,winddirection_10m,temperature_2m,precipitation')
  upstream.searchParams.set('timezone', 'auto')

  try {
    const res = await fetch(upstream.toString(), {
      headers: {
        'User-Agent': 'surf-buddy/1.0 (Cloudflare Pages Function; weather)',
        accept: 'application/json',
      },
    })

    const text = await res.text()

    if (!res.ok) {
      return new Response(JSON.stringify({ ok: false, error: `Upstream error: ${res.status}`, body: text }), {
        status: 502,
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'no-store',
        },
      })
    }

    let json
    try {
      json = JSON.parse(text)
    } catch {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid upstream JSON' }), {
        status: 502,
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'no-store',
        },
      })
    }

    const current = json?.current ?? null
    const hourly = json?.hourly ?? null

    return new Response(JSON.stringify({ ok: true, current, hourly }), {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'public, max-age=900',
      },
    })
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }), {
      status: 500,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
      },
    })
  }
}
