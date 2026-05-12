import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * GET /api/approve-status?runId=X
 *
 * Polling-endpoint för async approve-flow. Frontend pollar efter att
 * /api/approve-content returnerat {runId, status: "queued"}.
 *
 * Auth: Postiz-session-cookie krävs.
 *
 * Logik:
 * 1. Hämta senaste 5 executions för approve-workflow via n8n REST API
 * 2. Hitta executionen vars Set Input.runId matchar query-param
 * 3. Returnera status: "running" | "success" | "error"
 * 4. Vid "success": inkludera resultat (drafts, scheduledFor, etc.)
 *
 * Frontend: poll var 5:e sek tills status !== "running" (max 5 min).
 */
export const runtime = 'nodejs';
export const maxDuration = 30;

const N8N_INTERNAL_URL = 'http://eteya-n8n:5678';
const APPROVE_WORKFLOW_ID = '662d21afc94943bc';

export const GET = async (request: NextRequest) => {
  try {
    // 1. Auth-check
    const cookieStore = await cookies();
    const auth =
      cookieStore.get('auth') ??
      cookieStore.get('jwt') ??
      cookieStore.get('postiz-auth');
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Hämta runId från query
    const { searchParams } = new URL(request.url);
    const runId = searchParams.get('runId');
    if (!runId) {
      return NextResponse.json(
        { error: 'runId query param is required' },
        { status: 400 }
      );
    }

    // 3. Query n8n executions API (Internal Docker DNS — bypass Cloudflare)
    const apiKey = process.env.N8N_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'N8N_API_KEY not configured on server' },
        { status: 500 }
      );
    }

    const apiUrl = `${N8N_INTERNAL_URL}/api/v1/executions?workflowId=${APPROVE_WORKFLOW_ID}&limit=5&includeData=true`;
    const n8nResp = await fetch(apiUrl, {
      headers: { 'X-N8N-API-KEY': apiKey },
      signal: AbortSignal.timeout(20000),
    });

    if (!n8nResp.ok) {
      return NextResponse.json(
        { error: `n8n executions API returned ${n8nResp.status}` },
        { status: 502 }
      );
    }

    const data = await n8nResp.json();
    const executions = data.data ?? [];

    // 4. Hitta execution med matchande runId
    let matched: any = null;
    for (const exec of executions) {
      const runData = exec.data?.resultData?.runData ?? {};
      const setInputRun = runData['Set Input']?.[0];
      const setInputJson =
        setInputRun?.data?.main?.[0]?.[0]?.json ?? {};
      if (setInputJson.runId === runId || setInputJson.request_id === runId) {
        matched = exec;
        break;
      }
    }

    if (!matched) {
      // Execution kanske inte hunnit start än — return "running" så frontend pollar igen
      return NextResponse.json({
        status: 'running',
        message: 'Execution not found yet, retry',
      });
    }

    // 5. Mappa n8n-status → vår API-status
    const n8nStatus = matched.status; // "running" | "success" | "error" | "waiting" | etc.
    const stoppedAt = matched.stoppedAt;

    if (n8nStatus === 'success') {
      // Hämta result från Set Output-noden
      const runData = matched.data?.resultData?.runData ?? {};
      const setOutputRun = runData['Set Output']?.[0];
      const result =
        setOutputRun?.data?.main?.[0]?.[0]?.json ?? {};

      return NextResponse.json({
        status: 'success',
        executionId: matched.id,
        runId,
        result,
      });
    }

    if (n8nStatus === 'error' || n8nStatus === 'crashed') {
      // Hitta failande nod
      const runData = matched.data?.resultData?.runData ?? {};
      let failedNode: string | null = null;
      let failedMsg: string | null = null;
      for (const [nodeName, runs] of Object.entries(runData)) {
        const err = (runs as any)[0]?.error;
        if (err) {
          failedNode = nodeName;
          failedMsg = (err.message ?? '').toString().substring(0, 300);
          break;
        }
      }

      return NextResponse.json({
        status: 'error',
        executionId: matched.id,
        runId,
        failedNode,
        message: failedMsg,
      });
    }

    // Still running
    return NextResponse.json({
      status: 'running',
      executionId: matched.id,
      runId,
      startedAt: matched.startedAt,
      stoppedAt,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', details: msg },
      { status: 500 }
    );
  }
};
