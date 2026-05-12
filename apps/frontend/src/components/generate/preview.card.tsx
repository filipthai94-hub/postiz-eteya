'use client';

import { FC, useState } from 'react';
import { RotateCcw, Check, AlertCircle } from 'lucide-react';

interface PlatformLimits {
  min: number;
  max: number;
}

const LIMITS: Record<string, PlatformLimits> = {
  linkedin: { min: 1040, max: 3000 },
  instagram: { min: 240, max: 2200 },
  x: { min: 50, max: 200 },
  threads: { min: 160, max: 500 },
  bluesky: { min: 100, max: 300 },
  facebook: { min: 60, max: 600 },
};

const PLATFORM_LABELS: Record<string, { name: string; voice: string }> = {
  linkedin: { name: 'LinkedIn', voice: 'long-form, "jag"-voice' },
  instagram: { name: 'Instagram', voice: 'visual, "vi"-voice' },
  x: { name: 'X (Twitter)', voice: 'short + punchy' },
  threads: { name: 'Threads', voice: 'funderings, "jag"' },
  bluesky: { name: 'Bluesky', voice: 'tech-stack' },
  facebook: { name: 'Facebook', voice: 'save-trigger' },
};

interface PreviewCardProps {
  platform: string;
  aiOriginal: string;
  currentText: string;
  selected: boolean;
  onTextChange: (text: string) => void;
  onSelectedChange: (sel: boolean) => void;
  onResetToAI: () => void;
}

export const PreviewCard: FC<PreviewCardProps> = ({
  platform,
  aiOriginal,
  currentText,
  selected,
  onTextChange,
  onSelectedChange,
  onResetToAI,
}) => {
  const limit = LIMITS[platform] ?? { min: 0, max: 5000 };
  const meta = PLATFORM_LABELS[platform] ?? { name: platform, voice: '' };
  const len = currentText.length;
  const edited = currentText !== aiOriginal;

  const overMax = len > limit.max;
  const underMin = len < limit.min;
  const counterColor = overMax
    ? 'text-[#FF4444]'
    : underMin
      ? 'text-[#FFA500]'
      : 'text-[#A0A0A0]';

  return (
    <div
      className={`rounded-[10px] border p-[16px] flex flex-col gap-[10px] transition-colors ${
        selected
          ? 'bg-[#1A1919] border-[#2b2a2a]'
          : 'bg-[#0A0A0A] border-[#1a1a1a] opacity-50'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-[10px]">
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => onSelectedChange(e.target.checked)}
            className="w-[18px] h-[18px] accent-[#A6D954] cursor-pointer"
            title="Include this platform when scheduling"
          />
          <div>
            <div className="font-[700] text-[14px]">{meta.name}</div>
            <div className="text-[11px] text-[#666]">{meta.voice}</div>
          </div>
        </div>

        <div className="flex items-center gap-[8px]">
          {edited && (
            <span className="px-[8px] py-[2px] rounded-[4px] bg-[#A6D954] text-black text-[10px] font-[700] uppercase">
              Edited
            </span>
          )}
          {edited && (
            <button
              onClick={onResetToAI}
              title="Reset to AI original"
              className="text-[#A0A0A0] hover:text-white transition-colors"
            >
              <RotateCcw size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Textarea */}
      <textarea
        value={currentText}
        onChange={(e) => onTextChange(e.target.value)}
        disabled={!selected}
        rows={Math.max(3, Math.min(12, Math.ceil(currentText.length / 80)))}
        className={`w-full p-[12px] rounded-[8px] bg-[#0F0E0E] border text-white text-[13px] resize-none focus:border-[#A6D954] focus:outline-none disabled:opacity-50 ${
          overMax ? 'border-[#FF4444]' : 'border-[#2b2a2a]'
        }`}
      />

      {/* Footer: char counter + warning */}
      <div className="flex items-center justify-between text-[11px]">
        <div className={counterColor}>
          {len} chars (limit: {limit.min}-{limit.max})
          {overMax && (
            <span className="ml-[8px] inline-flex items-center gap-[4px]">
              <AlertCircle size={10} /> {len - limit.max} chars över max
            </span>
          )}
          {underMin && !overMax && (
            <span className="ml-[8px] text-[#FFA500]">
              {limit.min - len} chars under min
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
