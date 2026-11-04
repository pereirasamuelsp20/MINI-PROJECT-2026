import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { coords: string[] } }
) {
  const coords = params.coords;
  if (!coords || coords.length < 3) {
    return new NextResponse('Invalid tile coordinates', { status: 400 });
  }

  const [z, x, rawY] = coords;
  const y = rawY.replace('.png', '');

  // Select random subdomain for load distribution
  const subdomains = ['a', 'b', 'c'];
  const s = subdomains[(parseInt(x, 10) + parseInt(y, 10)) % subdomains.length];
  const tileUrl = `https://${s}.tile.openstreetmap.org/${z}/${x}/${y}.png`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const response = await fetch(tileUrl, {
      headers: {
        'User-Agent': 'DisasterReliefMesh/2.0 (offline-first-response-mumbai)',
        'Accept': 'image/png,image/*;q=0.8',
      },
      signal: controller.signal,
      next: { revalidate: 604800 }, // Cache tiles for 7 days
    });

    clearTimeout(timeout);

    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      return new NextResponse(arrayBuffer, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=604800, stale-while-revalidate=2592000',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    return new NextResponse('Tile not found', { status: 404 });
  } catch {
    return new NextResponse('Tile fetch error', { status: 502 });
  }
}
