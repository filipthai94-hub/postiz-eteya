'use client';

import { FC, ReactNode, useCallback } from 'react';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { MenuItem } from '@gitroom/frontend/components/new-layout/menu-item';
// Phosphor Icons Light — Eteya blueprint utility-icon-system (2026-05-11 Fas 2.1)
// Blueprint: "Phosphor används som utility icon-system. Lucide är legacy/fallback."
// Light weight som standard, Regular bara när kontrasten behöver bli tydligare.
import {
  CalendarBlank,
  Sparkle,
  Robot,
  ChartBar,
  Image,
  Plug,
  PuzzlePiece,
  VideoCamera,
  Users,
  CreditCard,
  Gear,
} from '@phosphor-icons/react';

interface MenuItemInterface {
  name: string;
  icon: ReactNode;
  path: string;
  role?: string[];
  hide?: boolean;
  requireBilling?: boolean;
  onClick?: () => void;
}

export const useMenuItem = () => {
  const { isGeneral } = useVariables();
  const t = useT();
  const fetch = useFetch();

  const handleAgentMediaClick = useCallback(async () => {
    try {
      const response = await fetch('/user/agent-media-sso');
      const data = await response.json();
      if (data.url) {
        window.open(data.url, '_blank');
      }
    } catch (e) {
      // ignore
    }
  }, [fetch]);

  const firstMenu = [
    {
      name: isGeneral ? t('calendar', 'Calendar') : t('launches', 'Launches'),
      icon: <CalendarBlank size={21} weight="light" />,
      path: '/launches',
    },
    {
      name: t('generate', 'Generera'),
      icon: <Sparkle size={21} weight="light" />,
      path: '/generate',
    },
    {
      name: 'Agent',
      icon: <Robot size={21} weight="light" />,
      path: '/agents',
    },
    {
      name: t('analytics', 'Analytics'),
      icon: <ChartBar size={21} weight="light" />,
      path: '/analytics',
    },
    {
      name: t('media', 'Media'),
      icon: <Image size={21} weight="light" />,
      path: '/media',
    },
    {
      name: t('plugs', 'Plugs'),
      icon: <Plug size={21} weight="light" />,
      path: '/plugs',
    },
    {
      name: t('integrations', 'Integrations'),
      icon: <PuzzlePiece size={21} weight="light" />,
      path: '/third-party',
    },
  ] satisfies MenuItemInterface[] as MenuItemInterface[];

  const secondMenu = [
    {
      name: t('UGC', 'UGC'),
      icon: <VideoCamera size={21} weight="light" />,
      path: '#',
      role: ['ADMIN', 'SUPERADMIN', 'USER'],
      requireBilling: true,
      onClick: handleAgentMediaClick,
    },
    {
      name: t('affiliate', 'Affiliate'),
      icon: <Users size={21} weight="light" />,
      path: 'https://affiliate.postiz.com',
      role: ['ADMIN', 'SUPERADMIN', 'USER'],
      requireBilling: true,
    },
    {
      name: t('billing', 'Billing'),
      icon: <CreditCard size={21} weight="light" />,
      path: '/billing',
      role: ['ADMIN', 'SUPERADMIN'],
      requireBilling: true,
    },
    {
      name: t('settings', 'Settings'),
      icon: <Gear size={21} weight="light" />,
      path: '/settings',
      role: ['ADMIN', 'USER', 'SUPERADMIN'],
    },
  ] satisfies MenuItemInterface[] as MenuItemInterface[];

  return {
    all: [...firstMenu, ...secondMenu],
    firstMenu,
    secondMenu,
  };
};

export const TopMenu: FC = () => {
  const user = useUser();
  const { firstMenu, secondMenu } = useMenuItem();
  const { isGeneral, billingEnabled } = useVariables();
  return (
    <>
      <div className="flex flex-1 flex-row items-center gap-[4px] blurMe">
        {
          // @ts-ignore
          user?.orgId &&
            // @ts-ignore
            (user.tier !== 'FREE' || !isGeneral || !billingEnabled) &&
            firstMenu
              .filter((f) => {
                if (f.hide) {
                  return false;
                }
                if (f.requireBilling && !billingEnabled) {
                  return false;
                }
                if (f.name === 'Billing' && user?.isLifetime) {
                  return false;
                }
                if (f.role) {
                  return f.role.includes(user?.role!);
                }
                return true;
              })
              .map((item, index) => (
                <MenuItem
                  path={item.path}
                  label={item.name}
                  icon={item.icon}
                  key={item.name}
                  onClick={item.onClick}
                />
              ))
        }
      </div>
      <div className="flex flex-row items-center gap-[4px] blurMe">
        {secondMenu
          .filter((f) => {
            if (f.hide) {
              return false;
            }
            if (f.requireBilling && !billingEnabled) {
              return false;
            }
            if (f.name === 'Billing' && user?.isLifetime) {
              return false;
            }
            if (f.role) {
              return f.role.includes(user?.role!);
            }
            return true;
          })
          .map((item, index) => (
            <MenuItem
              path={item.path}
              label={item.name}
              icon={item.icon}
              key={item.name}
              onClick={item.onClick}
            />
          ))}
      </div>
    </>
  );
};
