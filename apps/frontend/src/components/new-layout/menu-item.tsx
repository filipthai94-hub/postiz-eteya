'use client';
import { FC, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import Link from 'next/link';

export const MenuItem: FC<{ label: string; icon: ReactNode; path: string; onClick?: () => void }> = ({
  label,
  icon,
  path,
  onClick,
}) => {
  const currentPath = usePathname();
  const isActive = currentPath.indexOf(path) === 0;

  // Eteya-iteration-1: horisontell top-bar layout (ikon + label sida vid sida)
  const className = clsx(
    'h-[44px] py-[8px] px-[12px] gap-[8px] flex flex-row text-[13px] font-[600] items-center justify-center rounded-[8px] hover:text-textItemFocused hover:bg-boxFocused whitespace-nowrap transition-colors',
    isActive ? 'text-textItemFocused bg-boxFocused' : 'text-textItemBlur'
  );

  if (onClick) {
    return (
      <button onClick={onClick} className={className}>
        <div className="flex-shrink-0">{icon}</div>
        <div>{label}</div>
      </button>
    );
  }

  return (
    <Link
      prefetch={true}
      href={path}
      {...path.indexOf('http') === 0 && { target: '_blank' }}
      className={className}
    >
      <div className="flex-shrink-0">{icon}</div>
      <div>{label}</div>
    </Link>
  );
};
