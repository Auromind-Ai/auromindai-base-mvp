import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const authHeader = request.headers.get('authorization');
    
    const backendUrl = process.env.API_URL 
      ? `${process.env.API_URL}/api/instagram/connect` 
      : 'http://localhost:8000/api/instagram/connect';
    
    console.log('[Proxy Handler] Forwarding Instagram connect request to backend...', {
      workspace_id: body.workspace_id,
      hasCode: !!body.code,
      hasAuth: !!authHeader
    });

    const headers = {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
      'Connection': 'close'
    };
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    // Call backend directly using Node fetch with robust configuration
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(45000)
    });

    const status = response.status;
    const text = await response.text();

    console.log(`[Proxy Handler] Backend responded with status ${status}`);

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return new NextResponse(text, {
        status,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    return NextResponse.json(data, { status });
  } catch (error) {
    console.error('[Proxy Handler] Error forwarding request:', error);
    return NextResponse.json(
      { detail: error.message || 'Internal proxy handler error' },
      { status: 500 }
    );
  }
}
