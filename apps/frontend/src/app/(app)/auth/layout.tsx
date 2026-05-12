import { getT } from '@gitroom/react/translation/get.translation.service.backend';

export const dynamic = 'force-dynamic';
import { ReactNode } from 'react';
import loadDynamic from 'next/dynamic';
import { LogoTextComponent } from '@gitroom/frontend/components/ui/logo-text.component';
const ReturnUrlComponent = loadDynamic(() => import('./return.url.component'));

/**
 * Eteya Auth Layout — Fas 4 redesign
 * Pattern: Linear/Vercel "Premium operativ" — single-panel centered, no testimonials.
 * Research-baserad 2026: 0/10 premium B2B SaaS-sites har testimonials på auth.
 * Blueprint: "Stora sammanhängande ytor", lime är signal endast på CTA + focus.
 */
export default async function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  const t = await getT();

  return (
    <div className="bg-etBgCanvas flex flex-1 min-h-screen w-screen text-etTextPrimary items-center justify-center px-[16px] py-[24px]">
      <ReturnUrlComponent />

      {/* Single-panel centered (Vercel/Linear-style) */}
      <div className="w-full max-w-[420px] flex flex-col gap-[20px]">
        {/* Eteya brand-mark centrerat */}
        <div className="flex justify-center">
          <LogoTextComponent />
        </div>

        {/* Eyebrow — Eteya Social Manager */}
        <div className="text-center">
          <div className="text-[11px] font-[650] text-etTextMuted uppercase tracking-[0.12em]">
            Eteya Social Manager
          </div>
        </div>

        {/* Auth form (children: register or login) — flex-col så disabled-state med flera siblings stackas korrekt */}
        <div className="flex flex-col w-full">{children}</div>
      </div>
    </div>
  );
}
