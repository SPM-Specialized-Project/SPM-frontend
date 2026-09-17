import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';

import { api } from '@/services/api-client';
import { useAuthStore } from '@/stores';

export const Route = createFileRoute('/_private')({
  beforeLoad: async () => {
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) {
      throw redirect({
        to: '/login',
      });
    }
    try {
      await api.getSession();
    } catch {
      useAuthStore.getState().logout();
      throw redirect({ to: '/login' });
    }
  },
  component: LayoutComponent,
});

function LayoutComponent() {
  return <Outlet />;
}
