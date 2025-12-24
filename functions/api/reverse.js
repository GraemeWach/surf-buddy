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

  const upstream = new URL('https://nominatim.openstreetmap.org/reverse')
  upstream.searchParams.set('format', 'jsonv2')
  upstream.searchParams.set('lat', String(lat))
  upstream.searchParams.set('lon', String(lon))
  upstream.searchParams.set('zoom', '10')
  upstream.searchParams.set('addressdetails', '1')

  try {
    const res = await fetch(upstream.toString(), {
      headers: {
        'User-Agent': 'surf-buddy/1.0 (Cloudflare Pages Function; reverse geocode)',
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

    const addr = json?.address ?? {}
    const countryCode = typeof addr.country_code === 'string' ? addr.country_code.toUpperCase() : null
    const state = typeof addr.state === 'string' ? addr.state : null
    const stateCode = typeof addr.state_code === 'string' ? addr.state_code.toUpperCase() : null

    return new Response(
      JSON.stringify({
        ok: true,
        countryCode,
        state,
        stateCode,
      }),
      {
        status: 200,
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'public, max-age=86400',
        },
      },
    )
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
