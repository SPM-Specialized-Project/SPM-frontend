import { createFileRoute } from '@tanstack/react-router';

import { redirectToObservabilityDashboard } from '@/services/observability-dashboard-links';

export const Route = createFileRoute('/_private/observation/datadog/')({
  beforeLoad: () => {
    document.title = 'Datadog - Observability - Code Pulse';
    redirectToObservabilityDashboard('datadog');
  },
});
