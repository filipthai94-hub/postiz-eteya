import React from 'react';

/**
 * Eteya Wordmark — Fas 4 auth-rebrand
 * Matchar EteyaLogo.tsx från eteya-dashboard repo
 * Bebas Neue, letter-spacing 0.05em
 */
export const LogoTextComponent = () => {
  return (
    <div
      className="font-brand text-etTextPrimary leading-none select-none"
      style={{
        fontFamily: "'Bebas Neue', sans-serif",
        fontSize: '42px',
        letterSpacing: '0.06em',
      }}
    >
      ETEYA
      <span className="text-[0.35em] align-super ml-0.5 opacity-60">©</span>
    </div>
  );
};
