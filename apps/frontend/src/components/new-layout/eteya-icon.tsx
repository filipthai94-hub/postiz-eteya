'use client';

import { FC } from 'react';

/**
 * EteyaIcon — wrapper för Eteyas egna SVG-ikoner.
 * Source: eteya-os/07-design-system/eteya-dashboard-blueprint-handoff.md
 * Asset-path: /eteya-icons/{name}.svg
 *
 * Blueprint-regel: "Eteyas egna SVG-ikoner används för sidebar och brandade systemytor."
 * Lucide kvar för utility-ikoner som inte har Eteya-motsvarighet (Bot, BarChart3, Image, Plug, Puzzle).
 */

export type EteyaIconName = 'calendar' | 'sparkle' | 'settings' | 'bell';

interface EteyaIconProps {
  name: EteyaIconName;
  size?: number;
  className?: string;
  alt?: string;
}

export const EteyaIcon: FC<EteyaIconProps> = ({
  name,
  size = 21,
  className = '',
  alt = '',
}) => {
  return (
    <img
      src={`/eteya-icons/${name}.svg`}
      width={size}
      height={size}
      className={className}
      alt={alt || name}
      draggable={false}
    />
  );
};
