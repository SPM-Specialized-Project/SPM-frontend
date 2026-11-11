import type { ComponentType } from 'react';

import {
  IconDangKyMonHoc,
  IconGiamSat,
  IconKhoaHoc,
  IconLichHoc,
  IconLichSu,
  IconThuVien,
} from './sidebar-icons';
import { SidebarItem } from './sidebar-item';

type SidebarNavigationProps = {
  opened: boolean;
  current: string;
  hasStatsPermission: boolean;
  onNavigate?: () => void;
};

type NavigationItem = {
  name: string;
  route: string;
  icon: ComponentType<{ className?: string }>;
  iconMode: 'fill' | 'stroke';
};

const commonItems: NavigationItem[] = [
  {
    name: 'Khóa học của tôi',
    route: '/dashboard',
    icon: IconKhoaHoc,
    iconMode: 'fill',
  },
  {
    name: 'Giám sát hệ thống',
    route: '/system-monitoring',
    icon: IconGiamSat,
    iconMode: 'stroke',
  },
  {
    name: 'Đăng ký môn học',
    route: '/register-session',
    icon: IconDangKyMonHoc,
    iconMode: 'stroke',
  },
  {
    name: 'Lịch sử đăng ký',
    route: '/registration-history',
    icon: IconLichSu,
    iconMode: 'fill',
  },
  { name: 'Thư viện', route: '/library', icon: IconThuVien, iconMode: 'fill' },
  { name: 'Lịch học', route: '/schedule', icon: IconLichHoc, iconMode: 'fill' },
];

export function getSidebarStatsPermission() {
  return false;
}

function getIconClassName(item: NavigationItem, current: string) {
  const selected = current.startsWith(item.route);
  const color = selected ? 'white' : 'tertiary group-hover:stroke-white';
  return (
    (item.iconMode === 'fill'
      ? selected
        ? 'fill-white'
        : 'fill-tertiary group-hover:fill-white'
      : 'stroke-' + color) + ' size-6 duration-200 ease-in-out'
  );
}

export function SidebarNavigation({
  opened,
  current,
  onNavigate,
}: SidebarNavigationProps) {
  const items = commonItems;

  return (
    <div className="relative flex shrink-0 flex-col gap-2">
      {items.map((item) => (
        <SidebarItem
          key={item.route}
          opened={opened}
          name={item.name}
          route={item.route}
          current={current}
          icon={item.icon}
          onNavigate={onNavigate}
          iconClassName={getIconClassName(item, current)}
        />
      ))}
    </div>
  );
}
