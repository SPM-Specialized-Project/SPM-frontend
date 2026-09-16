import { useNavigate, useRouterState } from '@tanstack/react-router';

import BachKhoaLogo from '../../assets/bachkhoa.png';

import { SidebarNavigation } from './sidebar-navigation';

type SidebarDesktopProps = {
  isManager?: boolean;
  opened: boolean;
};

const SidebarDesktop = ({ opened }: SidebarDesktopProps) => {
  const router = useRouterState();
  const navigate = useNavigate();
  const rawUserStore = localStorage.getItem('userStore');
  let hasStatsPermission = false;

  try {
    const userStore = rawUserStore ? JSON.parse(rawUserStore) : null;
    hasStatsPermission = Boolean(userStore?.state?.user?.statisticalPermission);
  } catch {
    hasStatsPermission = false;
  }

  return (
    <div
      className={
        (opened ? 'w-80 3xl:w-[22.5rem]' : 'w-24') +
        ' sticky left-0 top-0 z-50 hidden h-screen flex-col justify-between gap-5 overflow-hidden border-r border-solid border-tertiary-300 bg-white px-5 pb-5 duration-200 ease-in-out xl:flex'
      }
    >
      <div className="relative flex h-full flex-col gap-5 overflow-hidden overflow-y-auto">
        <div className="relative flex h-20 w-full shrink-0 flex-row items-center gap-4 overflow-x-hidden md:h-20 3xl:h-24">
          <img
            alt="BackKhoaLogo"
            src={BachKhoaLogo}
            onClick={() => navigate({ to: '/dashboard' })}
            className="h-10 cursor-pointer"
          />
          {opened && (
            <div className="shrink-0 select-none text-xl font-bold text-[#0329E9]">
              Tutor System
            </div>
          )}
        </div>

        <SidebarNavigation
          opened={opened}
          current={router.location.pathname}
          hasStatsPermission={hasStatsPermission}
        />
      </div>
    </div>
  );
};

export default SidebarDesktop;
