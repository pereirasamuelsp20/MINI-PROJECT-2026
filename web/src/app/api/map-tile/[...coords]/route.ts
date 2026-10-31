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

  // Custom User-Agent per OpenStreetMap Tile Usage Policy
  const headers = {
    'User-Agent': 'DisasterReliefMesh/1.0 (disaster-response-mesh-dev; emergency-mode)',
    'Accept': 'image/png,image/*;q=0.8',
  };

  try {
    const tileUrl = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
    const response = await fetch(tileUrl, {
      headers,
      next: { revalidate: 86400 }, // Cache tiles for 24 hours
    });

    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      return new NextResponse(arrayBuffer, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Fallback: CartoDB Dark Matter / Voyager
    const fallbackUrl = `https://basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}.png`;
    const fallbackResp = await fetch(fallbackUrl, {
      headers,
      next: { revalidate: 86400 },
    });

    if (fallbackResp.ok) {
      const arrayBuffer = await fallbackResp.arrayBuffer();
      return new NextResponse(arrayBuffer, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=86400',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    return new NextResponse('Tile not found', { status: 404 });
  } catch (err) {
    return new NextResponse('Tile fetch error', { status: 502 });
  }
}

