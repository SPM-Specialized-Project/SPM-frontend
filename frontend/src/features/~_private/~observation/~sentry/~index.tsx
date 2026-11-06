import { createFileRoute } from '@tanstack/react-router';

import { redirectToObservabilityDashboard } from '@/services/observability-dashboard-links';

export const Route = createFileRoute('/_private/observation/sentry/')({
  beforeLoad: () => {
    document.title = 'Sentry - Observability - Code Pulse';
    redirectToObservabilityDashboard('sentry');
  },
});
