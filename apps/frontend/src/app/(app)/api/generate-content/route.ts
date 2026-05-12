import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * POST /api/generate-content
 *
 * Proxy från Postiz frontend → n8n webhook.
 * Auth: kräver Postiz-session-cookie (auth/jwt).
 *
 * Body: { topic: string }
 * Returns: n8n webhook response (workflow-resultat med drafts schemalagda)
 *
 * Env vars (set i Postiz container):
 *   N8N_GENERATE_WEBHOOK_URL — webhook-URL till n8n
 *   N8N_GENERATE_SECRET     — (optional) shared secret för extra säkerhet
 */
export const POST = async (request: NextRequest) => {
  try {
    // 1. Verifiera Postiz-session-cookie (proxy för "user är inloggad")
    const cookieStore = await cookies();
    const auth = cookieStore.get('auth') ?? cookieStore.get('jwt') ?? cookieStore.get('postiz-auth');
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized — login to Postiz first' },
        { status: 401 }
      );
    }

    // 2. Validera body
    const body = await request.json().catch(() => null);
    const topic = (body?.topic ?? '').toString().trim();
    if (!topic) {
      return NextResponse.json(
        { error: 'topic is required' },
        { status: 400 }
      );
    }
    if (topic.length > 500) {
      return NextResponse.json(
        { error: 'topic max 500 chars' },
        { status: 400 }
      );
    }

    // 3. Hämta n8n-webhook-URL från env
    const webhookUrl = process.env.N8N_GENERATE_WEBHOOK_URL;
    if (!webhookUrl) {
      return NextResponse.json(
        {
          error: 'N8N_GENERATE_WEBHOOK_URL not configured on server',
        },
        { status: 500 }
      );
    }

    // 4. Forward till n8n med shared secret (om configured)
    const secret = process.env.N8N_GENERATE_SECRET ?? '';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (secret) {
      headers['X-Webhook-Secret'] = secret;
    }

    // n8n-webhook tar payload som JSON. Sätter topic i body.
    // OBS: workflow läser topic från Set Input-noden, INTE från webhook-body.
    // För nu: workflow ignorerar payload, använder hardcoded topic.
    // Filip kan justera workflow senare för att läsa från $json.topic.
    const n8nResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ topic }),
      // Lång timeout — workflow tar ~3-5 min
      signal: AbortSignal.timeout(360000),
    });

    if (!n8nResponse.ok) {
      const errText = await n8nResponse.text();
      return NextResponse.json(
        {
          error: `n8n returned ${n8nResponse.status}`,
          details: errText.substring(0, 500),
        },
        { status: 502 }
      );
    }

    const result = await n8nResponse.json().catch(() => ({}));
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', details: msg },
      { status: 500 }
    );
  }
};
