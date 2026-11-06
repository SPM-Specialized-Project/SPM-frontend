/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OBSERVABILITY_ENV?: string;
  readonly VITE_OBSERVABILITY_RELEASE?: string;
  readonly VITE_DATADOG_APPLICATION_ID?: string;
  readonly VITE_DATADOG_CLIENT_TOKEN?: string;
  readonly VITE_DATADOG_SITE?: string;
  readonly VITE_DATADOG_SESSION_SAMPLE_RATE?: string;
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_GRAFANA_FARO_URL?: string;
  readonly VITE_GRAFANA_APP_NAME?: string;
  readonly VITE_GRAFANA_SESSION_SAMPLING_RATE?: string;
}
