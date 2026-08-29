const COOKIE_NAME = 'finance_session';
const DEFAULT_SESSION_DAYS = 30;
const encoder = new TextEncoder();

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  if (!env.APP_PASSWORD || !env.SESSION_SECRET) {
    return setupError(url.pathname.startsWith('/api/'));
  }

  if (url.pathname === '/auth/login') {
    if (request.method === 'POST') {
      return handleLogin(request, env);
    }
    if (request.method === 'GET') {
      const authenticated = await isAuthenticated(request, env.SESSION_SECRET);
      if (authenticated) return redirect('/');
      return loginPage();
    }
    return methodNotAllowed('GET, POST');
  }

  if (url.pathname === '/auth/logout') {
    if (request.method !== 'GET' && request.method !== 'POST') {
      return methodNotAllowed('GET, POST');
    }
    return logoutResponse();
  }

  const authenticated = await isAuthenticated(request, env.SESSION_SECRET);
  if (!authenticated) {
    if (url.pathname.startsWith('/api/')) {
      return json({ code: 'UNAUTHORIZED', message: 'Требуется вход.' }, 401);
    }
    return loginPage();
  }

  context.data.authenticated = true;
  return context.next();
}

async function handleLogin(request, env) {
  let form;
  try {
    form = await request.formData();
  } catch {
    return loginPage('Некорректный запрос.');
  }

  const password = String(form.get('password') ?? '');
  const valid = await secureStringEqual(password, env.APP_PASSWORD);
  if (!valid) {
    await delay(350);
    return loginPage('Неверный пароль.');
  }

  const days = normalizeSessionDays(env.APP_SESSION_DAYS);
  const maxAge = days * 24 * 60 * 60;
  const token = await createSessionToken(env.SESSION_SECRET, maxAge);

  return new Response(null, {
    status: 303,
    headers: {
      Location: '/',
      'Cache-Control': 'no-store',
      'Set-Cookie': `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`,
    },
  });
}

async function createSessionToken(secret, maxAgeSeconds) {
  const payloadObject = {
    exp: Math.floor(Date.now() / 1000) + maxAgeSeconds,
    nonce: crypto.randomUUID(),
  };
  const payload = base64UrlEncode(encoder.encode(JSON.stringify(payloadObject)));
  const signature = await sign(payload, secret);
  return `${payload}.${signature}`;
}

async function isAuthenticated(request, secret) {
  const token = readCookie(request.headers.get('Cookie'), COOKIE_NAME);
  if (!token) return false;

  const dot = token.indexOf('.');
  if (dot <= 0 || dot === token.length - 1) return false;

  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);

  let signatureBytes;
  try {
    signatureBytes = base64UrlDecode(signature);
  } catch {
    return false;
  }

  const key = await hmacKey(secret, ['verify']);
  const verified = await crypto.subtle.verify(
    'HMAC',
    key,
    signatureBytes,
    encoder.encode(payload),
  );
  if (!verified) return false;

  let data;
  try {
    const jsonText = new TextDecoder().decode(base64UrlDecode(payload));
    data = JSON.parse(jsonText);
  } catch {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  return Number.isFinite(data?.exp) && data.exp > now;
}

async function sign(payload, secret) {
  const key = await hmacKey(secret, ['sign']);
  const signature = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, encoder.encode(payload)),
  );
  return base64UrlEncode(signature);
}

function hmacKey(secret, usages) {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    usages,
  );
}

async function secureStringEqual(left, right) {
  const [aBuffer, bBuffer] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(left)),
    crypto.subtle.digest('SHA-256', encoder.encode(right)),
  ]);
  const a = new Uint8Array(aBuffer);
  const b = new Uint8Array(bBuffer);
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

function readCookie(header, name) {
  if (!header) return null;
  for (const part of header.split(';')) {
    const item = part.trim();
    const equals = item.indexOf('=');
    if (equals <= 0) continue;
    if (item.slice(0, equals) === name) return item.slice(equals + 1);
  }
  return null;
}

function base64UrlEncode(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlDecode(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function normalizeSessionDays(value) {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 365) return DEFAULT_SESSION_DAYS;
  return parsed;
}

function loginPage(error = '') {
  const errorBlock = error
    ? `<div class="error" role="alert">${escapeHtml(error)}</div>`
    : '';

  const html = `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="robots" content="noindex,nofollow,noarchive">
  <title>Вход — Расходы</title>
  <style>
    :root { color-scheme: light dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100dvh; display: grid; place-items: center; padding: 24px; background: #f5f7fb; color: #111827; }
    .card { width: min(100%, 390px); padding: 30px; border: 1px solid #e5e7eb; border-radius: 22px; background: #fff; box-shadow: 0 20px 60px rgba(15, 23, 42, .10); }
    .eyebrow { margin: 0 0 8px; color: #6b7280; font-size: 13px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
    h1 { margin: 0 0 8px; font-size: 28px; line-height: 1.15; }
    .hint { margin: 0 0 24px; color: #6b7280; font-size: 14px; line-height: 1.5; }
    label { display: block; margin: 0 0 8px; font-size: 13px; font-weight: 700; }
    input { width: 100%; height: 48px; padding: 0 14px; border: 1px solid #d1d5db; border-radius: 12px; background: transparent; color: inherit; font: inherit; outline: none; }
    input:focus { border-color: #111827; box-shadow: 0 0 0 3px rgba(17, 24, 39, .08); }
    button { width: 100%; height: 48px; margin-top: 14px; border: 0; border-radius: 12px; background: #111827; color: #fff; font: inherit; font-weight: 750; cursor: pointer; }
    .error { margin: 0 0 16px; padding: 11px 12px; border-radius: 10px; background: #fef2f2; color: #991b1b; font-size: 13px; }
    @media (prefers-color-scheme: dark) {
      body { background: #0b0f17; color: #f9fafb; }
      .card { background: #111827; border-color: #253046; box-shadow: none; }
      .eyebrow, .hint { color: #9ca3af; }
      input { border-color: #374151; }
      input:focus { border-color: #f9fafb; box-shadow: 0 0 0 3px rgba(249, 250, 251, .08); }
      button { background: #f9fafb; color: #111827; }
      .error { background: #3f1518; color: #fecaca; }
    }
  </style>
</head>
<body>
  <main class="card">
    <p class="eyebrow">Finance Report</p>
    <h1>Вход</h1>
    <p class="hint">Введите пароль для доступа к приложению.</p>
    ${errorBlock}
    <form method="post" action="/auth/login" autocomplete="on">
      <label for="password">Пароль</label>
      <input id="password" name="password" type="password" autocomplete="current-password" required autofocus>
      <button type="submit">Войти</button>
    </form>
  </main>
</body>
</html>`;

  return new Response(html, {
    status: error ? 401 : 401,
    headers: htmlHeaders(),
  });
}

function setupError(isApi) {
  if (isApi) {
    return json({
      code: 'AUTH_NOT_CONFIGURED',
      message: 'Не настроены APP_PASSWORD и/или SESSION_SECRET.',
    }, 503);
  }

  const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Настройка доступа</title></head><body><h1>Доступ ещё не настроен</h1><p>Добавьте секреты APP_PASSWORD и SESSION_SECRET в настройках Cloudflare Pages.</p></body></html>`;
  return new Response(html, { status: 503, headers: htmlHeaders() });
}

function logoutResponse() {
  return new Response(null, {
    status: 303,
    headers: {
      Location: '/',
      'Cache-Control': 'no-store',
      'Set-Cookie': `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`,
    },
  });
}

function redirect(location) {
  return new Response(null, {
    status: 303,
    headers: { Location: location, 'Cache-Control': 'no-store' },
  });
}

function methodNotAllowed(allow) {
  return new Response('Method Not Allowed', {
    status: 405,
    headers: { Allow: allow, 'Cache-Control': 'no-store' },
  });
}

function json(payload, status) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

function htmlHeaders() {
  return {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store, max-age=0',
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
  };
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
