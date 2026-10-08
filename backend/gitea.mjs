import { Buffer } from 'node:buffer';

const apiBaseUrl = process.env.GITEA_API_URL?.trim().replace(/\/$/, '');
const token = process.env.GITEA_API_TOKEN?.trim();
const owner = process.env.GITEA_OWNER?.trim();

export const isGiteaConfigured = Boolean(apiBaseUrl && token && owner);

const apiRequest = async (path, options = {}) => {
  if (!isGiteaConfigured) return null;
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Gitea API ${response.status}: ${detail || response.statusText}`);
  }
  return response.status === 204 ? null : response.json();
};

const repositoryPath = (repository) => `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}`;

export async function createAssignmentRepository(repository, description) {
  if (!isGiteaConfigured) return null;
  return apiRequest('/user/repos', {
    method: 'POST',
    body: JSON.stringify({ name: repository, description, private: true, auto_init: true }),
  });
}

export async function createVersionBranch(repository, branch, baseBranch = 'main') {
  if (!isGiteaConfigured) return null;
  return apiRequest(`${repositoryPath(repository)}/branches`, {
    method: 'POST',
    body: JSON.stringify({ new_branch_name: branch, old_branch_name: baseBranch }),
  });
}

export async function commitRepositoryFile(repository, branch, filePath, content, message, author) {
  if (!isGiteaConfigured) return null;
  const encodedPath = filePath.split('/').map(encodeURIComponent).join('/');
  const endpoint = `${repositoryPath(repository)}/contents/${encodedPath}`;
  const current = await apiRequest(`${endpoint}?ref=${encodeURIComponent(branch)}`).catch((error) => {
    if (error.message.startsWith('Gitea API 404:')) return null;
    throw error;
  });
  return apiRequest(endpoint, {
    method: 'PUT',
    body: JSON.stringify({
      message,
      branch,
      content: Buffer.from(content, 'utf8').toString('base64'),
      ...(author ? { author, committer: author } : {}),
      ...(current?.sha ? { sha: current.sha } : {}),
    }),
  });
}

export function assignmentRepositoryName(assignmentId) {
  const slug = String(assignmentId).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);
  return `codepulse-${slug || 'assignment'}`;
}
