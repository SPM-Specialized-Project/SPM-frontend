import ReactDOM from 'react-dom/client';

import './index.css';
import "@/utils/matching";

import App from './app';
import { ObservabilityErrorBoundary } from './components/observability-error-boundary';
import { initializeObservability } from './services/observability';

function renderApp() {
  const rootElement = document.getElementById('root');
  if (!rootElement || rootElement.innerHTML) return;

  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <ObservabilityErrorBoundary>
      <App />
    </ObservabilityErrorBoundary>,
  );
}

void initializeObservability();
renderApp();
