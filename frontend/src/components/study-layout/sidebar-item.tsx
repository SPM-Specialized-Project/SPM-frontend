import { Link } from '@tanstack/react-router';
import type { ComponentType } from 'react';
import { useMemo } from 'react';

type SidebarIcon = ComponentType<{ className?: string }>;

type SidebarItemProps = {
  isComingSoon?: boolean;
  name: string;
  route: string;
  icon: SidebarIcon;
  opened: boolean;
  current: string;
  iconClassName: string;
};

export function SidebarItem({
  isComingSoon,
  name,
  route,
  icon: Icon,
  opened,
  current,
  iconClassName,
}: SidebarItemProps) {
  const selected = useMemo(() => current.startsWith(route), [current, route]);
  const className =
    (opened ? 'justify-start' : 'max-w-14 justify-center') +
    ' ' +
    (selected
      ? 'bg-primary font-bold text-white '
      : 'hover:bg-primary-300 hover:text-white') +
    ' group relative flex h-14 w-full flex-row items-center gap-4 overflow-x-hidden rounded-lg p-4 duration-200 ease-in-out';

  if (isComingSoon) {
    return (
      <div className={className + ' cursor-not-allowed select-none'}>
        <Icon className={iconClassName} />
        <span className={(opened ? 'flex' : 'hidden') + ' overflow-hidden truncate'}>
          <span className="flex group-hover:hidden">{name}</span>
          <span className="hidden font-bold uppercase opacity-0 group-hover:flex group-hover:opacity-100">
            SẮP RA MẮT
          </span>
        </span>
      </div>
    );
  }

  return (
    <Link to={route} className={className}>
      <Icon className={iconClassName} />
      <span className={(opened ? 'flex' : 'hidden') + ' overflow-hidden truncate'}>{name}</span>
    </Link>
  );
}
