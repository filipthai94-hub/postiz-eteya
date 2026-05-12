import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * POST /api/preview-content
 *
 * PHASE 7J: Async-pattern. Triggar n8n preview-workflow och returnerar
 * IMMEDIATELY med { runId, status: "queued" }. Frontend pollar sedan
 * /api/preview-status?runId=X tills success/error.
 *
 * Anledning: Pass 1 (kimi-k2.6) kan ta 30-180s beroende på Ollama-lagg.
 * nginx proxy_read_timeout 60s + Cloudflare 100s = synkron pattern bryter.
 *
 * Auth: Postiz-session-cookie krävs.
 *
 * Body:
 * {
 *   topic: string,        // Användarens topic
 *   request_id?: string,  // UUID från frontend (för idempotency + polling-match)
 *   notes?: string        // Optional extra context
 * }
 *
 * Response (omedelbart, n8n-webhook svarar inom ~25ms):
 * { runId, request_id, status: "queued" }
 */
export const runtime = 'nodejs';
export const maxDuration = 30;

export const POST = async (request: NextRequest) => {
  try {
    // 1. Verifiera Postiz-session-cookie
    const cookieStore = await cookies();
    const auth =
      cookieStore.get('auth') ??
      cookieStore.get('jwt') ??
      cookieStore.get('postiz-auth');
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized — login to Postiz first' },
        { status: 401 }
      );
    }

    // 2. Validera body
    const body = await request.json().catch(() => null);
    const topic = (body?.topic ?? '').toString().trim();
    const request_id = (body?.request_id ?? '').toString().trim();
    const notes = (body?.notes ?? '').toString().trim();

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

    // 3. Hämta n8n preview-webhook-URL
    const webhookUrl = process.env.N8N_PREVIEW_WEBHOOK_URL;
    if (!webhookUrl) {
      return NextResponse.json(
        {
          error:
            'N8N_PREVIEW_WEBHOOK_URL not configured. Set in /opt/eteya/postiz/.env',
        },
        { status: 500 }
      );
    }

    // 4. Forward till n8n preview-workflow med shared secret
    const secret = process.env.N8N_SHARED_SECRET ?? '';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (secret) {
      headers['X-Webhook-Secret'] = secret;
    }

    // n8n returnerar nu IMMEDIATELY med {"status":"queued"} — 15s timeout normalt
    // Men cold-start efter container-restart kan ta längre, höjd till 25s för marginal
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    try {
      const n8nResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ topic, request_id, notes }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!n8nResponse.ok) {
        const errText = await n8nResponse.text();
        return NextResponse.json(
          {
            error: `n8n preview returned ${n8nResponse.status}`,
            details: errText.substring(0, 500),
          },
          { status: 502 }
        );
      }

      // n8n returnerar {"status":"queued"} — vi lägger till runId från frontend's request_id
      const queuedBody = await n8nResponse.json().catch(() => ({}));
      return NextResponse.json({
        ...queuedBody,
        runId: request_id,
        request_id,
      });
    } catch (fetchErr) {
      clearTimeout(timeout);
      if (fetchErr instanceof Error && fetchErr.name === 'AbortError') {
        return NextResponse.json(
          {
            error: 'n8n preview queue timeout (>15s)',
            hint: 'n8n may be down. Check VPS docker compose status.',
          },
          { status: 504 }
        );
      }
      throw fetchErr;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', details: msg },
      { status: 500 }
    );
  }
};
