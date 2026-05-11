'use client';

import { FC, ReactNode, useCallback } from 'react';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { MenuItem } from '@gitroom/frontend/components/new-layout/menu-item';
// Eteya: egna SVG-ikoner för brandade nav-items (Calendar, Generate, Settings)
import { EteyaIcon } from '@gitroom/frontend/components/new-layout/eteya-icon';
// Lucide kvar för utility-ikoner utan Eteya-motsvarighet (Bot, BarChart3, Image, Plug, Puzzle, Video, Users, CreditCard)
import {
  Bot,
  BarChart3,
  Image,
  Plug,
  Puzzle,
  Video,
  Users,
  CreditCard,
} from 'lucide-react';

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
      icon: <EteyaIcon name="calendar" size={21} />,
      path: '/launches',
    },
    {
      name: t('generate', 'Generera'),
      icon: <EteyaIcon name="sparkle" size={21} />,
      path: '/generate',
    },
    {
      name: 'Agent',
      icon: <Bot size={21} strokeWidth={1.8} />,
      path: '/agents',
    },
    {
      name: t('analytics', 'Analytics'),
      icon: <BarChart3 size={21} strokeWidth={1.8} />,
      path: '/analytics',
    },
    {
      name: t('media', 'Media'),
      icon: <Image size={21} strokeWidth={1.8} />,
      path: '/media',
    },
    {
      name: t('plugs', 'Plugs'),
      icon: <Plug size={21} strokeWidth={1.8} />,
      path: '/plugs',
    },
    {
      name: t('integrations', 'Integrations'),
      icon: <Puzzle size={21} strokeWidth={1.8} />,
      path: '/third-party',
    },
  ] satisfies MenuItemInterface[] as MenuItemInterface[];

  const secondMenu = [
    {
      name: t('UGC', 'UGC'),
      icon: <Video size={21} strokeWidth={1.8} />,
      path: '#',
      role: ['ADMIN', 'SUPERADMIN', 'USER'],
      requireBilling: true,
      onClick: handleAgentMediaClick,
    },
    {
      name: t('affiliate', 'Affiliate'),
      icon: <Users size={21} strokeWidth={1.8} />,
      path: 'https://affiliate.postiz.com',
      role: ['ADMIN', 'SUPERADMIN', 'USER'],
      requireBilling: true,
    },
    {
      name: t('billing', 'Billing'),
      icon: <CreditCard size={21} strokeWidth={1.8} />,
      path: '/billing',
      role: ['ADMIN', 'SUPERADMIN'],
      requireBilling: true,
    },
    {
      name: t('settings', 'Settings'),
      icon: <EteyaIcon name="settings" size={21} />,
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
