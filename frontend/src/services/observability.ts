const appEnvironment =
  import.meta.env.VITE_OBSERVABILITY_ENV?.trim() || import.meta.env.MODE;
const release = import.meta.env.VITE_OBSERVABILITY_RELEASE?.trim() || undefined;

type RuntimeClients = {
  datadog?: typeof import('@datadog/browser-rum').datadogRum;
  faro?: typeof import('@grafana/faro-react').faro;
  sentry?: typeof import('@sentry/react');
};

const clients: RuntimeClients = {};
const pendingErrors: Array<{ error: Error; context?: Record<string, string> }> = [];
let initializationFinished = false;

function sanitizeUrl(value: string): string {
  if (!value) return value;

  try {
    const url = new URL(value, window.location.origin);
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return value.split(/[?#]/, 1)[0];
  }
}

function sanitizeTelemetryPayload<T>(payload: T): T {
  const visited = new WeakSet<object>();

  function visit(value: unknown, key = ''): unknown {
    if (typeof value === 'string') {
      if (/authorization|cookie|token|password|secret|api.?key/i.test(key)) {
        return '[REDACTED]';
      }

      if (/(url|href|referrer)$/i.test(key)) {
        return sanitizeUrl(value);
      }

      return value;
    }

    if (Array.isArray(value)) {
      for (let index = 0; index < value.length; index += 1) {
        value[index] = visit(value[index]);
      }
      return value;
    }

    if (value === null || typeof value !== 'object') {
      return value;
    }

    if (visited.has(value)) {
      return value;
    }
    visited.add(value);

    const record = value as Record<string, unknown>;
    for (const [childKey, childValue] of Object.entries(record)) {
      record[childKey] = visit(childValue, childKey);
    }
    return value;
  }

  return visit(payload) as T;
}

function percentage(value: string | undefined, fallback: number): number {
  if (!value?.trim()) return fallback;

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 100
    ? parsed
    : fallback;
}

function samplingRate(value: string | undefined, fallback: number): number {
  if (!value?.trim()) return fallback;

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1
    ? parsed
    : fallback;
}

function initializeDatadog(): Promise<void> {
  const applicationId = import.meta.env.VITE_DATADOG_APPLICATION_ID?.trim();
  const clientToken = import.meta.env.VITE_DATADOG_CLIENT_TOKEN?.trim();

  if (!applicationId || !clientToken) {
    return Promise.resolve();
  }

  return Promise.all([
    import('@datadog/browser-rum'),
    import('@datadog/browser-rum-react'),
  ])
    .then(([{ datadogRum }, { reactPlugin }]) => {
      clients.datadog = datadogRum;
      datadogRum.init({
        applicationId,
        clientToken,
        site: import.meta.env.VITE_DATADOG_SITE?.trim() || 'datadoghq.com',
        service: 'code-pulse-frontend',
        env: appEnvironment,
        version: release,
        sessionSampleRate: percentage(
          import.meta.env.VITE_DATADOG_SESSION_SAMPLE_RATE,
          100,
        ),
        sessionReplaySampleRate: percentage(
          import.meta.env.VITE_DATADOG_SESSION_REPLAY_SAMPLE_RATE,
          20,
        ),
        trackUserInteractions: true,
        trackResources: true,
        trackLongTasks: true,
        trackAnonymousUser: false,
        defaultPrivacyLevel: 'mask',
        plugins: [reactPlugin({ router: false })],
        beforeSend: (event) => {
          if ('view' in event && event.view) {
            const view = event.view as { url?: string; referrer?: string };
            if (view.url) view.url = sanitizeUrl(view.url);
            if (view.referrer) view.referrer = sanitizeUrl(view.referrer);
          }

          if ('resource' in event) {
            const resource = event.resource as { url?: string } | undefined;
            if (resource?.url) resource.url = sanitizeUrl(resource.url);
          }

          return true;
        },
      });
    })
    .catch(() => {
      clients.datadog = undefined;
      console.warn('[observability] Datadog RUM could not initialize');
    });
}

function initializeSentry(): Promise<void> {
  const dsn = import.meta.env.VITE_SENTRY_DSN?.trim();

  if (!dsn) {
    return Promise.resolve();
  }

  return import('@sentry/react')
    .then((sentry) => {
      clients.sentry = sentry;
      sentry.init({
        dsn,
        environment: appEnvironment,
        release,
        dataCollection: {
          userInfo: false,
          cookies: false,
          httpHeaders: { request: false, response: false },
          httpBodies: [],
          urlQueryParams: false,
          genAI: { inputs: false, outputs: false },
          databaseQueryData: false,
          queues: false,
          graphQL: { document: false, variables: false },
          stackFrameVariables: false,
        },
        beforeSend: (event) => sanitizeTelemetryPayload(event),
        beforeBreadcrumb: (breadcrumb) => sanitizeTelemetryPayload(breadcrumb),
      });
    })
    .catch(() => {
      clients.sentry = undefined;
      console.warn('[observability] Sentry could not initialize');
    });
}

function initializeGrafanaFaro(): Promise<void> {
  const url = import.meta.env.VITE_GRAFANA_FARO_URL?.trim();

  if (!url) {
    return Promise.resolve();
  }

  return import('@grafana/faro-react')
    .then(({ getWebInstrumentations, initializeFaro }) => {
      clients.faro = initializeFaro({
        url,
        app: {
          name: import.meta.env.VITE_GRAFANA_APP_NAME?.trim() || 'code-pulse-frontend',
          version: release,
          environment: appEnvironment,
        },
        instrumentations: [...getWebInstrumentations({ captureConsole: false })],
        sessionTracking: {
          samplingRate: samplingRate(
            import.meta.env.VITE_GRAFANA_SESSION_SAMPLING_RATE,
            1,
          ),
        },
        beforeSend: (item) => sanitizeTelemetryPayload(item),
        experimental: { trackNavigation: true },
      });
    })
    .catch(() => {
      clients.faro = undefined;
      console.warn('[observability] Grafana Faro could not initialize');
    });
}

export async function initializeObservability(): Promise<void> {
  await Promise.all([
    initializeDatadog(),
    initializeSentry(),
    initializeGrafanaFaro(),
  ]);

  initializationFinished = true;
  for (const pendingError of pendingErrors.splice(0)) {
    reportToInitializedClients(pendingError.error, pendingError.context);
  }
}

export function captureException(
  value: unknown,
  context?: Record<string, string>,
): void {
  const error = value instanceof Error ? value : new Error(String(value));

  if (!initializationFinished) {
    pendingErrors.push({ error, context });
    return;
  }

  reportToInitializedClients(error, context);
}

function reportToInitializedClients(
  error: Error,
  context?: Record<string, string>,
): void {

  try {
    clients.datadog?.addError(error, context);
  } catch {
    console.warn('[observability] Datadog could not report an error');
  }

  try {
    clients.sentry?.captureException(error, {
      contexts: context ? { app: context } : undefined,
    });
  } catch {
    console.warn('[observability] Sentry could not report an error');
  }

  try {
    clients.faro?.api.pushError(error, {
      context,
    });
  } catch {
    console.warn('[observability] Grafana Faro could not report an error');
  }
}
