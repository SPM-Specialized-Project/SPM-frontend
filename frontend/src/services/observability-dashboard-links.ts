type ObservabilityDashboard = 'datadog' | 'grafana' | 'sentry';

const setupUrls: Record<ObservabilityDashboard, string> = {
  datadog:
    'https://docs.datadoghq.com/real_user_monitoring/application_monitoring/browser/setup/client/',
  grafana:
    'https://grafana.com/docs/grafana-cloud/observe-and-act/monitor-applications/frontend-observability/get-started/instrument-react/',
  sentry: 'https://docs.sentry.io/platforms/javascript/guides/react/',
};

const dashboardUrls: Record<ObservabilityDashboard, string | undefined> = {
  datadog: import.meta.env.VITE_DATADOG_DASHBOARD_URL,
  grafana: import.meta.env.VITE_GRAFANA_DASHBOARD_URL,
  sentry: import.meta.env.VITE_SENTRY_DASHBOARD_URL,
};

function getSafeDashboardUrl(value: string | undefined): string | undefined {
  if (!value?.trim()) return undefined;

  try {
    const url = new URL(value);
    const isLocalHttp =
      url.protocol === 'http:' &&
      ['localhost', '127.0.0.1'].includes(url.hostname);

    if ((url.protocol !== 'https:' && !isLocalHttp) || url.username || url.password) {
      return undefined;
    }

    return url.toString();
  } catch {
    return undefined;
  }
}

export function redirectToObservabilityDashboard(
  dashboard: ObservabilityDashboard,
): void {
  const target =
    getSafeDashboardUrl(dashboardUrls[dashboard]) ?? setupUrls[dashboard];

  window.location.replace(target);
}
