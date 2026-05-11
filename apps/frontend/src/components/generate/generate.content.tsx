'use client';

import { FC, useState, useCallback } from 'react';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
// Phosphor Light icons (Eteya blueprint utility-icon-system)
import {
  Sparkle,
  ArrowRight,
  Check,
  Warning,
  CircleNotch,
  PencilSimple,
} from '@phosphor-icons/react';
import { PreviewCard } from './preview.card';

type Stage = 'idle' | 'previewing' | 'reviewing' | 'approving' | 'done' | 'error';

interface PreviewResult {
  request_id: string;
  topic: string;
  runId: string;
  texts: Record<string, string>;
  threadsTopicTag?: string;
  charCounts: Record<string, number>;
  warnings: string[];
  validationOk: boolean;
  generatedAt: string;
}

interface ApproveResult {
  runId?: string;
  scheduledFor?: string;
  postizUrl?: string;
  succeededCount?: number;
  failedCount?: number;
  warnings?: string[];
  charCounts?: Record<string, number>;
}

const PLATFORMS = [
  'linkedin',
  'instagram',
  'x',
  'threads',
  'bluesky',
  'facebook',
];

// Generate UUID v4 (no external lib)
function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export const GenerateContent: FC = () => {
  const t = useT();

  const [stage, setStage] = useState<Stage>('idle');
  const [topic, setTopic] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Preview-state
  const [requestId] = useState(() => uuidv4());
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [editedTexts, setEditedTexts] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(PLATFORMS.map((p) => [p, true]))
  );

  // Approve-result
  const [approveResult, setApproveResult] = useState<ApproveResult | null>(null);
  const [pollElapsed, setPollElapsed] = useState(0); // sekunder sedan polling startade

  const handlePreview = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!topic.trim() || stage === 'previewing') return;

      setStage('previewing');
      setErrorMsg('');

      try {
        // PHASE 7J: Async-pattern. Trigga workflow → polla tills success.
        // Step 1: Trigga preview (returnerar IMMEDIATELY med queued)
        const response = await fetch('/api/preview-content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: topic.trim(),
            request_id: requestId,
          }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || `HTTP ${response.status}`);
        }

        const initial = await response.json();
        const queuedRunId: string | undefined =
          initial.runId ?? initial.request_id ?? requestId;
        if (!queuedRunId) {
          throw new Error('Inget runId returnerades från servern');
        }

        // Step 2: Poll /api/preview-status var 5:e sek (max 5 min)
        const startTime = Date.now();
        const TIMEOUT_MS = 5 * 60 * 1000;
        const POLL_INTERVAL = 5000;

        const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

        while (true) {
          if (Date.now() - startTime > TIMEOUT_MS) {
            throw new Error(
              'Timeout efter 5 minuter. Kimi-k2.6 har lagg. Försök igen om 5 min.'
            );
          }

          let statusData: any = null;
          try {
            const statusResp = await fetch(
              `/api/preview-status?runId=${encodeURIComponent(queuedRunId)}`,
              { method: 'GET', cache: 'no-store' }
            );
            if (statusResp.ok) {
              statusData = await statusResp.json();
            }
          } catch {
            // Network blip — fortsätt polla
          }

          if (statusData?.status === 'success') {
            const result = statusData.result;
            if (!result?.texts) {
              throw new Error(
                'Preview lyckades men saknar texter (race condition?)'
              );
            }
            const previewResult: PreviewResult = {
              request_id: result.request_id ?? requestId,
              topic: result.topic ?? topic.trim(),
              runId: result.runId ?? queuedRunId,
              texts: result.texts,
              threadsTopicTag: result.threadsTopicTag,
              charCounts: result.charCounts ?? {},
              warnings: result.warnings ?? [],
              validationOk: result.validationOk ?? true,
              generatedAt: result.generatedAt ?? new Date().toISOString(),
            };
            setPreview(previewResult);
            setEditedTexts({ ...previewResult.texts });
            setStage('reviewing');
            return;
          }
          if (statusData?.status === 'error') {
            throw new Error(
              statusData.failedNode
                ? `Fel i nod "${statusData.failedNode}": ${statusData.message ?? 'okänt fel'}`
                : statusData.message ?? 'Okänt fel i preview-workflow'
            );
          }
          // status === 'running' eller okänt → vänta + retry
          await sleep(POLL_INTERVAL);
        }
      } catch (err) {
        setStage('error');
        setErrorMsg(err instanceof Error ? err.message : 'Okänt fel');
      }
    },
    [topic, stage, requestId]
  );

  const handleApprove = useCallback(async () => {
    if (!preview || stage === 'approving') return;
    const selectedList = PLATFORMS.filter((p) => selected[p]);
    if (selectedList.length === 0) {
      setErrorMsg('Välj minst en plattform att schemalägga');
      return;
    }

    setStage('approving');
    setErrorMsg('');
    setPollElapsed(0);

    try {
      // Step 1: Trigger approve-workflow (returnerar IMMEDIATELY med runId)
      const response = await fetch('/api/approve-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_id: preview.request_id,
          topic: preview.topic,
          runId: preview.runId,
          edited_texts: editedTexts,
          selected_platforms: selectedList,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      const initial = await response.json();
      const queuedRunId: string | undefined =
        initial.runId ?? initial.request_id ?? preview.runId;
      if (!queuedRunId) {
        throw new Error('Inget runId returnerades från servern');
      }

      // Step 2: Poll /api/approve-status var 5:e sek (max 5 min)
      const startTime = Date.now();
      const TIMEOUT_MS = 5 * 60 * 1000;
      const POLL_INTERVAL = 5000;

      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

      while (true) {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setPollElapsed(elapsed);

        if (Date.now() - startTime > TIMEOUT_MS) {
          throw new Error(
            'Timeout efter 5 minuter. Kolla manuellt i Postiz Calendar — drafts kan ha skapats ändå.'
          );
        }

        let data: any = null;
        try {
          const statusResp = await fetch(
            `/api/approve-status?runId=${encodeURIComponent(queuedRunId)}`,
            { method: 'GET', cache: 'no-store' }
          );
          if (statusResp.ok) {
            data = await statusResp.json();
          }
        } catch {
          // Network blip — fortsätt polla
        }

        if (data?.status === 'success') {
          setApproveResult(data.result || {});
          setStage('done');
          return;
        }
        if (data?.status === 'error') {
          throw new Error(
            data.failedNode
              ? `Fel i nod "${data.failedNode}": ${data.message ?? 'okänt fel'}`
              : data.message ?? 'Okänt fel i workflow'
          );
        }
        // status === 'running' eller okänt → vänta + retry
        await sleep(POLL_INTERVAL);
      }
    } catch (err) {
      setStage('error');
      setErrorMsg(err instanceof Error ? err.message : 'Okänt fel');
    }
  }, [preview, editedTexts, selected, stage]);

  const handleReset = () => {
    setStage('idle');
    setTopic('');
    setPreview(null);
    setEditedTexts({});
    setSelected(Object.fromEntries(PLATFORMS.map((p) => [p, true])));
    setApproveResult(null);
    setPollElapsed(0);
    setErrorMsg('');
  };

  const handleResetToAI = (platform: string) => {
    if (!preview) return;
    setEditedTexts((prev) => ({ ...prev, [platform]: preview.texts[platform] }));
  };

  const selectedCount = PLATFORMS.filter((p) => selected[p]).length;

  return (
    <div className="flex flex-1 flex-col p-[32px] gap-[24px] max-w-[920px] mx-auto w-full bg-newBgColorInner rounded-[12px]">
      {/* Header — Mockup A: minimalist Nova decision-center (Fas 3.1) */}
      <div className="flex items-start gap-[16px]">
        <div className="flex-1 flex flex-col gap-[8px]">
          {/* Eyebrow — Nova command-bar style */}
          <div className="text-[11px] font-[650] text-etTextMuted uppercase tracking-[0.08em]">
            BESLUTSCENTER · 1 ÄMNE → 6 PLATTFORMAR
          </div>
          {/* BIG TITLE — Nova dashboard-authority */}
          <h1 className="text-[40px] font-[700] leading-[1.1] tracking-tight">
            {t('generate_content', 'Generera innehåll')}
          </h1>
          <p className="text-[14px] text-etTextMuted leading-[1.5] max-w-[640px]">
            {stage === 'idle' &&
              'Skriv ett ämne. Få 6 plattform-versioner att granska innan du schemalägger.'}
            {stage === 'previewing' && 'Genererar preview… (~30 sek)'}
            {stage === 'reviewing' &&
              `Granska + edit innan schedule. ${selectedCount}/6 plattformar valda.`}
            {stage === 'approving' && 'Skapar drafts… (~3 min)'}
            {stage === 'done' && '✓ Drafts schemalagda!'}
          </p>
        </div>
        {stage !== 'idle' && stage !== 'previewing' && stage !== 'approving' && (
          <button
            onClick={handleReset}
            className="text-[11px] font-[650] text-etTextMuted hover:text-etTextPrimary uppercase tracking-[0.08em] transition-colors"
          >
            Börja om
          </button>
        )}
      </div>

      {/* STAGE: idle (form) — Mockup A Single-Column Refined */}
      {stage === 'idle' && (
        <form onSubmit={handlePreview} className="flex flex-col gap-[24px]">
          {/* Topic input */}
          <div className="flex flex-col gap-[10px]">
            <label htmlFor="topic" className="text-[11px] font-[650] text-etTextMuted uppercase tracking-[0.08em]">
              Skriv ditt ämne
            </label>
            <textarea
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder='T.ex. "Det som tar dig 3 timmar tar mig 3 minuter. Vi byggde vår egen content-cockpit åt Eteya."'
              rows={6}
              className="w-full p-[16px] rounded-[10px] bg-newBgColorInner border border-etBorderDefault text-etTextPrimary placeholder:text-etTextMuted focus:border-etLimeCore focus:outline-none resize-none transition-colors"
              maxLength={500}
              autoFocus
            />
            <div className="text-[12px] text-etTextMuted text-right">
              {topic.length}/500
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-etBorderSubtle" />

          {/* Platform chips — Nova-style status-indicators */}
          <div className="flex flex-col gap-[10px]">
            <div className="text-[11px] font-[650] text-etTextMuted uppercase tracking-[0.08em]">
              Var publiceras det?
            </div>
            <div className="flex flex-wrap gap-[8px]">
              {PLATFORMS.map((p) => (
                <div
                  key={p}
                  className="flex items-center gap-[6px] px-[12px] py-[6px] rounded-[6px] bg-newBgColorInner border border-etBorderSubtle text-[12px] font-[500] text-etTextSecondary"
                >
                  <span className="w-[5px] h-[5px] rounded-full bg-etLimeCore" />
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </div>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-etBorderSubtle" />

          {/* Bottom-bar: meta vänster + CTA höger */}
          <div className="flex items-center justify-between gap-[16px]">
            <div className="flex flex-col gap-[2px]">
              <div className="text-[13px] text-etTextSecondary font-[500]">
                6 plattformar · ~3 min · ~7.50 kr totalt
              </div>
              <div className="text-[11px] text-etTextMuted">
                Preview kostar bara ~0.50 kr. Resten betalas vid Approve.
              </div>
            </div>
            <button
              type="submit"
              disabled={!topic.trim()}
              className="flex items-center gap-[10px] px-[24px] py-[12px] rounded-[10px] bg-etLimeCore text-etTextInverse font-[650] text-[14px] tracking-[0.02em] hover:bg-etLimeDeep disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            >
              <span>Generera preview</span>
              <span className="text-[11px] font-[500] opacity-70">~0.50 kr</span>
              <ArrowRight size={16} weight="bold" />
            </button>
          </div>
        </form>
      )}

      {/* STAGE: previewing (loading) */}
      {stage === 'previewing' && (
        <div className="flex flex-col gap-[16px]">
          <div className="rounded-[10px] bg-[#1A1919] border border-[#2b2a2a] p-[20px] flex items-center gap-[12px]">
            <CircleNotch size={20} weight="light" className="animate-spin text-[#A6D954]" />
            <div>
              <div className="font-[600]">Pass 1 (kimi) genererar 6 texter...</div>
              <div className="text-[12px] text-[#A0A0A0]">~25-30 sek</div>
            </div>
          </div>
          {/* Skeleton placeholders */}
          {PLATFORMS.map((p) => (
            <div
              key={p}
              className="rounded-[10px] bg-[#1A1919] border border-[#2b2a2a] p-[16px] animate-pulse"
            >
              <div className="h-[16px] bg-[#2b2a2a] rounded w-[120px] mb-[10px]"></div>
              <div className="h-[80px] bg-[#0F0E0E] rounded"></div>
            </div>
          ))}
        </div>
      )}

      {/* STAGE: reviewing (6 cards + approve) */}
      {stage === 'reviewing' && preview && (
        <div className="flex flex-col gap-[16px]">
          {preview.warnings && preview.warnings.length > 0 && (
            <div className="rounded-[8px] bg-[#FFA50020] border border-[#FFA500] p-[12px] text-[12px]">
              ⚠️ Warnings: {preview.warnings.join(' | ')}
            </div>
          )}

          {PLATFORMS.map((platform) => (
            <PreviewCard
              key={platform}
              platform={platform}
              aiOriginal={preview.texts[platform] || ''}
              currentText={editedTexts[platform] || ''}
              selected={selected[platform] ?? true}
              onTextChange={(text) =>
                setEditedTexts((prev) => ({ ...prev, [platform]: text }))
              }
              onSelectedChange={(sel) =>
                setSelected((prev) => ({ ...prev, [platform]: sel }))
              }
              onResetToAI={() => handleResetToAI(platform)}
            />
          ))}

          {/* Sticky bottom action-bar */}
          <div className="rounded-[10px] bg-[#0F1F0F] border border-[#A6D954] p-[16px] flex items-center justify-between sticky bottom-[16px]">
            <div className="flex flex-col">
              <div className="font-[700] text-[14px]">
                {selectedCount}/6 plattformar → drafts
              </div>
              <div className="text-[11px] text-[#A0A0A0]">
                Nästa steg: ~7.50 kr (carousel + 3 single-images + Postiz schedule)
              </div>
            </div>
            <button
              onClick={handleApprove}
              disabled={selectedCount === 0}
              className="flex items-center gap-[8px] px-[24px] py-[12px] rounded-[10px] bg-[#A6D954] text-black font-[700] hover:bg-[#a8d800] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check size={18} weight="light" />
              APPROVE & SCHEDULE
              <ArrowRight size={18} weight="light" />
            </button>
          </div>
        </div>
      )}

      {/* STAGE: approving */}
      {stage === 'approving' && (
        <div className="rounded-[10px] bg-[#1A1919] border border-[#2b2a2a] p-[20px] flex flex-col gap-[12px]">
          <div className="flex items-center justify-between gap-[12px]">
            <div className="flex items-center gap-[12px]">
              <CircleNotch size={20} weight="light" className="animate-spin text-[#A6D954]" />
              <div className="font-[700]">
                Skapar carousel + bilder + schemalägger...
              </div>
            </div>
            <div className="text-[13px] text-[#A0A0A0] tabular-nums">
              {Math.floor(pollElapsed / 60)}:{(pollElapsed % 60).toString().padStart(2, '0')} / ~3:00
            </div>
          </div>
          <div className="w-full h-[6px] bg-[#0F0E0E] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#A6D954] transition-all duration-500"
              style={{ width: `${Math.min(100, (pollElapsed / 180) * 100)}%` }}
            />
          </div>
          <div className="text-[13px] text-[#A0A0A0] flex flex-col gap-[4px]">
            <div>→ Pass 2: GPT-4o-mini genererar carousel-data (~10 sek)</div>
            <div>→ Carousel-service renderar 8 PNG (~15 sek)</div>
            <div>→ gpt-image-2 renderar 3 single-images (~60-120 sek)</div>
            <div>→ Postiz schemar 6 drafts (~5 sek)</div>
          </div>
          <div className="text-[11px] text-[#666] mt-[8px]">
            Du kan stänga sidan — workflow:en körs i bakgrunden på servern. Öppnar du sidan igen försvinner status-tracking, men drafts skapas ändå.
          </div>
        </div>
      )}

      {/* STAGE: done */}
      {stage === 'done' && approveResult && (
        <div className="rounded-[10px] bg-[#0F1F0F] border border-[#A6D954] p-[20px] flex flex-col gap-[12px]">
          <div className="flex items-center gap-[8px] text-[#A6D954]">
            <Check size={24} weight="light" />
            <span className="font-[700] text-[18px]">
              {approveResult.succeededCount ?? 0} drafts schemalagda!
            </span>
          </div>
          {approveResult.scheduledFor && (
            <div className="text-[14px]">
              <span className="text-[#A0A0A0]">När: </span>
              <span className="font-[600]">{approveResult.scheduledFor}</span>
            </div>
          )}
          <div className="flex gap-[12px] mt-[8px]">
            <a
              href="/launches"
              className="px-[16px] py-[10px] rounded-[8px] bg-[#A6D954] text-black font-[700] text-[14px] hover:bg-[#a8d800]"
            >
              Visa i Calendar →
            </a>
            <button
              onClick={handleReset}
              className="px-[16px] py-[10px] rounded-[8px] border border-[#2b2a2a] text-white font-[600] text-[14px] hover:bg-[#1A1919]"
            >
              Generera igen
            </button>
          </div>
        </div>
      )}

      {/* STAGE: error */}
      {stage === 'error' && (
        <div className="rounded-[10px] bg-[#1F0F0F] border border-[#FF4444] p-[20px] flex flex-col gap-[8px]">
          <div className="flex items-center gap-[8px] text-[#FF6666]">
            <Warning size={20} weight="light" />
            <span className="font-[700]">Något gick fel</span>
          </div>
          <pre className="text-[12px] text-[#A0A0A0] whitespace-pre-wrap">
            {errorMsg}
          </pre>
          <button
            onClick={handleReset}
            className="self-start mt-[8px] px-[16px] py-[10px] rounded-[8px] border border-[#2b2a2a] text-white font-[600] text-[14px] hover:bg-[#1A1919]"
          >
            Försök igen
          </button>
        </div>
      )}
    </div>
  );
};
