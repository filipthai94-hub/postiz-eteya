import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * GET /api/preview-status?runId=X
 *
 * PHASE 7J: Polling-endpoint för async preview-flow.
 * Frontend pollar efter att /api/preview-content returnerat {runId, status: "queued"}.
 *
 * Pattern: samma som /api/approve-status från PHASE 7D, anpassad för preview-workflow:
 * - workflowId: 2881700673334a60 (eteya-content-engine-preview)
 * - data-output-nod: "Format Preview Response" (innehåller 6 plattform-texter)
 * - match-fält: Set Input.request_id === query.runId
 *
 * Race-condition guard: vid status=success, kontrollera att Format Preview Response
 * faktiskt finns i runData INNAN return success. Annars returnera "running" en gång till.
 *
 * Auth: Postiz-session-cookie krävs.
 */
export const runtime = 'nodejs';
export const maxDuration = 30;

const N8N_INTERNAL_URL = 'http://eteya-n8n:5678';
const PREVIEW_WORKFLOW_ID = '2881700673334a60';

export const GET = async (request: NextRequest) => {
  try {
    // 1. Auth-check
    const cookieStore = await cookies();
    const auth =
      cookieStore.get('auth') ??
      cookieStore.get('jwt') ??
      cookieStore.get('postiz-auth');
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Hämta runId (= request_id som frontend skickade)
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

    const apiUrl = `${N8N_INTERNAL_URL}/api/v1/executions?workflowId=${PREVIEW_WORKFLOW_ID}&limit=5&includeData=true`;
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

    // 4. Hitta execution med matchande request_id i Set Input
    let matched: any = null;
    for (const exec of executions) {
      const runData = exec.data?.resultData?.runData ?? {};
      const setInputRun = runData['Set Input']?.[0];
      const setInputJson =
        setInputRun?.data?.main?.[0]?.[0]?.json ?? {};
      if (
        setInputJson.request_id === runId ||
        setInputJson.runId === runId
      ) {
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
    const n8nStatus = matched.status;

    if (n8nStatus === 'success') {
      // Race-condition guard: kontrollera att Format Preview Response faktiskt finns
      const runData = matched.data?.resultData?.runData ?? {};
      const fprRun = runData['Format Preview Response']?.[0];
      const fprJson =
        fprRun?.data?.main?.[0]?.[0]?.json ?? null;

      if (!fprJson) {
        // Race condition: status=success men runData not yet written
        return NextResponse.json({
          status: 'running',
          message: 'Workflow finishing, runData not yet written',
        });
      }

      return NextResponse.json({
        status: 'success',
        executionId: matched.id,
        runId,
        result: fprJson, // hela Format Preview Response: { texts, charCounts, warnings, etc. }
      });
    }

    if (n8nStatus === 'error' || n8nStatus === 'crashed') {
      // Hitta felande nod
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
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', details: msg },
      { status: 500 }
    );
  }
};
