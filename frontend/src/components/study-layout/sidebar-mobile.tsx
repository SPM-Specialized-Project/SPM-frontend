import { useNavigate, useRouterState } from '@tanstack/react-router';

import { SidebarToggleIcon } from '@/components/icons';

import BachKhoaLogo from '../../assets/bachkhoa.png';

import {
  getSidebarStatsPermission,
  SidebarNavigation,
} from './sidebar-navigation';

type SidebarMobileProps = {
  isManager?: boolean;
  opened: boolean;
  close: () => void;
};

const SidebarMobile = ({ opened, close }: SidebarMobileProps) => {
  const router = useRouterState();
  const navigate = useNavigate();

  // const { isStudent } = useUserStore();

  return (
    <>
      <div
        className={`${opened ? 'fixed' : 'hidden'} left-0 top-0 z-[99] h-screen w-screen cursor-pointer bg-[#00000080] xl:hidden`}
        onClick={close}
      />
      <div
        className={`${opened ? 'left-0' : '-left-full'} fixed top-0 z-[99] flex h-screen w-80 flex-col justify-between gap-5 overflow-hidden border-r border-solid border-tertiary-300 bg-white p-5 duration-200 ease-in-out md:w-[22.5rem] xl:hidden`}
      >
        <div className="flex size-full flex-col gap-5 overflow-hidden overflow-y-auto">
          <div className="relative flex h-20 w-full flex-row items-center justify-between md:h-20 3xl:h-24">
            <img
              aria-label="BachKhoa Logo"
              src={BachKhoaLogo}
              onClick={() => {
                navigate({ to: '/dashboard' });
              }}
              className="relative h-6 w-auto cursor-pointer md:h-8"
            />
            <SidebarToggleIcon
              onClick={close}
              className="relative size-8 cursor-pointer fill-tertiary"
            />
          </div>
          <div className="relative flex flex-col gap-2">
            <div className="mb-2 font-bold">Chung</div>
            <SidebarNavigation
              opened
              current={router.location.pathname}
              hasStatsPermission={getSidebarStatsPermission()}
              onNavigate={close}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default SidebarMobile;
