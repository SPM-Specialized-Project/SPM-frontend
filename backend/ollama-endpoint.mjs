import { readFileSync } from 'node:fs';

const LOCAL_OLLAMA_ENDPOINT = 'http://127.0.0.1:11434/api/chat';

export function parseDefaultGateway(routeTable) {
  if (typeof routeTable !== 'string') return null;
  const rows = routeTable.split(/\r?\n/).slice(1);
  for (const row of rows) {
    const [interfaceName, destination, gateway, flagsText] = row.trim().split(/\s+/);
    if (!interfaceName || destination !== '00000000' || !/^[0-9a-f]{8}$/i.test(gateway || '')) continue;
    const flags = Number.parseInt(flagsText, 16);
    if (!Number.isFinite(flags) || (flags & 0x3) !== 0x3) continue;

    const octets = gateway.match(/../g).reverse().map((octet) => Number.parseInt(octet, 16));
    if (octets.some((octet) => octet > 255) || octets.every((octet) => octet === 0)) continue;
    return octets.join('.');
  }
  return null;
}

export function defaultOllamaEndpoint({
  platform = process.platform,
  isWsl = Boolean(process.env.WSL_DISTRO_NAME),
  routeTable,
} = {}) {
  if (platform !== 'linux' || !isWsl) return LOCAL_OLLAMA_ENDPOINT;
  try {
    const routes = routeTable ?? readFileSync('/proc/net/route', 'utf8');
    const gateway = parseDefaultGateway(routes);
    if (gateway) return `http://${gateway}:11434/api/chat`;
  } catch {
    // Keep the conventional local endpoint when WSL route discovery is unavailable.
  }
  return LOCAL_OLLAMA_ENDPOINT;
}
