import type { ComponentType } from 'react';

import {
  IconDangKyMonHoc,
  IconGiamSat,
  IconKhoaHoc,
  IconLichHoc,
  IconLichSu,
  IconThongKe,
  IconThuVien,
  OverviewIcon,
} from './sidebar-icons';
import { SidebarItem } from './sidebar-item';

type SidebarNavigationProps = {
  opened: boolean;
  current: string;
  hasStatsPermission: boolean;
};

type NavigationItem = {
  name: string;
  route: string;
  icon: ComponentType<{ className?: string }>;
  iconMode: 'fill' | 'stroke';
};

const commonItems: NavigationItem[] = [
  { name: 'Khóa học của tôi', route: '/dashboard', icon: IconKhoaHoc, iconMode: 'fill' },
  { name: 'Đăng ký môn học', route: '/register-session', icon: IconDangKyMonHoc, iconMode: 'stroke' },
  { name: 'Lịch sử đăng ký', route: '/registration-history', icon: IconLichSu, iconMode: 'fill' },
  { name: 'Thư viện', route: '/library', icon: IconThuVien, iconMode: 'fill' },
  { name: 'Lịch học', route: '/schedule', icon: IconLichHoc, iconMode: 'fill' },
];

const restrictedItems: NavigationItem[] = [
  { name: 'Giám sát hệ thống', route: '/system-monitoring', icon: IconGiamSat, iconMode: 'stroke' },
  { name: 'Thống Kê', route: '/statistical', icon: IconThongKe, iconMode: 'stroke' },
];

function getIconClassName(item: NavigationItem, current: string) {
  const selected = current.startsWith(item.route);
  const color = selected ? 'white' : 'tertiary group-hover:stroke-white';
  return (
    (item.iconMode === 'fill' ? (selected ? 'fill-white' : 'fill-tertiary group-hover:fill-white') : 'stroke-' + color) +
    ' size-6 duration-200 ease-in-out'
  );
}

export function SidebarNavigation({
  opened,
  current,
  hasStatsPermission,
}: SidebarNavigationProps) {
  const items = hasStatsPermission ? [...commonItems, ...restrictedItems] : commonItems;

  return (
    <div className="relative flex shrink-0 flex-col gap-2">
      {hasStatsPermission && (
        <SidebarItem
          opened={opened}
          name="Quản lý đăng ký"
          route="/overview"
          current={current}
          icon={OverviewIcon}
          iconClassName={
            (current.startsWith('/overview') ? 'stroke-white' : 'stroke-tertiary group-hover:stroke-white') +
            ' size-6 duration-200 ease-in-out'
          }
        />
      )}
      {items.map((item) => (
        <SidebarItem
          key={item.route}
          opened={opened}
          name={item.name}
          route={item.route}
          current={current}
          icon={item.icon}
          iconClassName={getIconClassName(item, current)}
        />
      ))}
    </div>
  );
}
