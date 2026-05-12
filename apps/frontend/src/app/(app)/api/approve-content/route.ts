import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * POST /api/approve-content
 *
 * Stage 2 av 2-stage flow: triggar n8n approve-workflow async.
 *
 * Async pattern (PHASE 7D):
 * 1. POST → n8n returnerar IMMEDIATELY {runId, status: "queued"}
 * 2. Frontend pollar /api/approve-status?runId=X var 5:e sek
 * 3. Workflow körs i bakgrund (~3 min) — bypass:ar Cloudflare 524 (100s cap)
 *
 * Auth: Postiz-session-cookie krävs.
 *
 * Body:
 * {
 *   request_id: string,           // UUID från Preview-stage (idempotency)
 *   topic: string,
 *   runId: string,                // från Preview-response
 *   edited_texts: {
 *     linkedin, instagram, x, threads, bluesky, facebook
 *   },
 *   selected_platforms?: string[] // default: alla 6
 * }
 *
 * Response (från n8n Respond to Webhook IMMEDIATELY):
 * { runId, request_id, status: "queued", message: "..." }
 */
export const runtime = 'nodejs';
export const maxDuration = 30;

const REQUIRED_PLATFORMS = [
  'linkedin',
  'instagram',
  'x',
  'threads',
  'bluesky',
  'facebook',
];

export const POST = async (request: NextRequest) => {
  try {
    // 1. Verifiera Postiz-session
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
    const request_id = (body?.request_id ?? '').toString().trim();
    const topic = (body?.topic ?? '').toString().trim();
    const runId = (body?.runId ?? '').toString().trim();
    const edited_texts = body?.edited_texts ?? {};
    const selected_platforms: string[] = Array.isArray(body?.selected_platforms)
      ? body.selected_platforms
      : REQUIRED_PLATFORMS;

    if (!request_id || !topic || !runId) {
      return NextResponse.json(
        { error: 'request_id, topic, runId are required' },
        { status: 400 }
      );
    }

    // Verifiera att alla 6 platform-texts finns
    for (const p of REQUIRED_PLATFORMS) {
      if (
        typeof edited_texts[p] !== 'string' ||
        edited_texts[p].trim().length === 0
      ) {
        return NextResponse.json(
          { error: `edited_texts.${p} is required` },
          { status: 400 }
        );
      }
    }

    // Verifiera selected_platforms är subset av required
    const validSelected = selected_platforms.filter((p) =>
      REQUIRED_PLATFORMS.includes(p)
    );
    if (validSelected.length === 0) {
      return NextResponse.json(
        { error: 'At least one platform must be selected' },
        { status: 400 }
      );
    }

    // 3. Hämta n8n approve-webhook-URL
    const webhookUrl = process.env.N8N_APPROVE_WEBHOOK_URL;
    if (!webhookUrl) {
      return NextResponse.json(
        {
          error:
            'N8N_APPROVE_WEBHOOK_URL not configured. Set in /opt/eteya/postiz/.env',
        },
        { status: 500 }
      );
    }

    // 4. Forward till n8n approve-workflow
    const secret = process.env.N8N_SHARED_SECRET ?? '';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (secret) {
      headers['X-Webhook-Secret'] = secret;
    }

    // n8n returnerar nu IMMEDIATELY — 15s timeout är gott om tid för queue-steget
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const n8nResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          request_id,
          topic,
          runId,
          edited_texts,
          selected_platforms: validSelected,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!n8nResponse.ok) {
        const errText = await n8nResponse.text();
        return NextResponse.json(
          {
            error: `n8n approve returned ${n8nResponse.status}`,
            details: errText.substring(0, 500),
          },
          { status: 502 }
        );
      }

      const result = await n8nResponse.json();
      return NextResponse.json(result);
    } catch (fetchErr) {
      clearTimeout(timeout);
      if (fetchErr instanceof Error && fetchErr.name === 'AbortError') {
        return NextResponse.json(
          {
            error: 'n8n approve queue timeout (>15s)',
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
