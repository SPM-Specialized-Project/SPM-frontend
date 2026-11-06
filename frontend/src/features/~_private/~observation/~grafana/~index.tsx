import { createFileRoute } from '@tanstack/react-router';

import { redirectToObservabilityDashboard } from '@/services/observability-dashboard-links';

export const Route = createFileRoute('/_private/observation/grafana/')({
  beforeLoad: () => {
    document.title = 'Grafana - Observability - Code Pulse';
    redirectToObservabilityDashboard('grafana');
  },
});
