function apiUrl(settings) {
  const owner = encodeURIComponent(settings.owner.trim());
  const repo = encodeURIComponent(settings.repo.trim());
  const path = settings.path.split('/').map(encodeURIComponent).join('/');
  return `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
}

function headers(token) {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

export async function fetchGithubData(settings, token) {
  validate(settings, token);
  const response = await fetch(`${apiUrl(settings)}?ref=${encodeURIComponent(settings.branch || 'main')}`, { headers: headers(token) });
  if (!response.ok) throw new Error(await githubError(response));
  const meta = await response.json();
  const text = decodeBase64Utf8(meta.content.replace(/\n/g, ''));
  return { sha: meta.sha, data: JSON.parse(text) };
}

export async function pushGithubData(settings, token, data, expectedSha) {
  validate(settings, token);
  const current = await fetchGithubData(settings, token);
  if (expectedSha && current.sha !== expectedSha) {
    const error = new Error('Файл в GitHub изменился после последней загрузки. Сначала загрузите свежую версию или выполните merge.');
    error.code = 'SHA_CONFLICT';
    error.remote = current;
    throw error;
  }
  const body = {
    message: `Update expenses: ${new Date().toISOString().slice(0, 10)}`,
    content: encodeBase64Utf8(JSON.stringify(data, null, 2)),
    sha: current.sha,
    branch: settings.branch || 'main',
  };
  const response = await fetch(apiUrl(settings), {
    method: 'PUT',
    headers: { ...headers(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(await githubError(response));
  return response.json();
}

function validate(settings, token) {
  if (!settings.owner || !settings.repo || !settings.path) throw new Error('Укажите owner, repository и path.');
  if (!token) throw new Error('Введите fine-grained PAT. Токен хранится только в sessionStorage.');
}

async function githubError(response) {
  try {
    const body = await response.json();
    return `GitHub API: ${body.message || response.statusText} (${response.status})`;
  } catch { return `GitHub API: ${response.status} ${response.statusText}`; }
}

function decodeBase64Utf8(base64) {
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function encodeBase64Utf8(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}
