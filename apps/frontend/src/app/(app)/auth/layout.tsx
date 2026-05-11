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
    <div className="bg-etBgCanvas flex flex-1 min-h-screen w-screen text-etTextPrimary items-center justify-center px-[24px]">
      <ReturnUrlComponent />

      {/* Single-panel centered (Vercel/Linear-style) */}
      <div className="w-full max-w-[440px] flex flex-col gap-[32px]">
        {/* Eteya brand-mark centrerat */}
        <div className="flex justify-center">
          <LogoTextComponent />
        </div>

        {/* Tagline — Eteya "Premium operativ intelligens" */}
        <div className="text-center flex flex-col gap-[8px]">
          <div className="text-[11px] font-[650] text-etTextMuted uppercase tracking-[0.12em]">
            Eteya Social Manager
          </div>
          <div className="text-[15px] text-etTextSecondary leading-[1.5]">
            1 ämne in. 6 plattformar ut. 3 minuter.
          </div>
        </div>

        {/* Auth form (children: register or login) */}
        <div className="flex">{children}</div>
      </div>
    </div>
  );
}
