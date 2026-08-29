const CREDENTIAL_KEY = 'expenses-app:device-lock-credential:v1';
const USER_KEY = 'expenses-app:device-lock-user:v1';
const HIDDEN_AT_KEY = 'expenses-app:device-lock-hidden-at:v1';
const LOCK_AFTER_HIDDEN_MS = 700;

let overlay;
let title;
let hint;
let primaryButton;
let secondaryButton;
let busy = false;
let unlocked = false;
let supported = false;
let credentialId = localStorage.getItem(CREDENTIAL_KEY) || '';

start().catch((error) => {
  console.error('Biometric lock setup failed', error);
  releaseLock();
});

async function start() {
  installStyles();
  createOverlay();
  lockNow();

  supported = await biometricAvailable();
  if (!supported) {
    releaseLock();
    return;
  }

  if (!credentialId) {
    showEnrollment();
  } else {
    showUnlock();
    // Пробуем вызвать системную проверку сразу. Safari/iOS иногда требует
    // пользовательский жест — в таком случае останется кнопка «Разблокировать».
    queueMicrotask(() => unlockWithBiometrics({ silentFailure: true }));
  }

  document.addEventListener('visibilitychange', handleVisibilityChange, true);
  window.addEventListener('pagehide', rememberHidden, true);
  window.addEventListener('pageshow', handlePageShow, true);
}

async function biometricAvailable() {
  if (!window.PublicKeyCredential || !navigator.credentials?.create || !navigator.credentials?.get) return false;
  if (!window.isSecureContext) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

function installStyles() {
  if (document.getElementById('finance-device-lock-style')) return;
  const style = document.createElement('style');
  style.id = 'finance-device-lock-style';
  style.textContent = `
    html.finance-device-locked body > :not(#finance-device-lock) {
      visibility: hidden !important;
    }
    #finance-device-lock {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      display: grid;
      place-items: center;
      padding: max(24px, env(safe-area-inset-top)) 24px max(24px, env(safe-area-inset-bottom));
      background: #f4f3ef;
      color: #1d1f1b;
      visibility: visible !important;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    #finance-device-lock[hidden] { display: none !important; }
    .finance-device-lock-card {
      width: min(100%, 390px);
      display: grid;
      gap: 14px;
      text-align: center;
    }
    .finance-device-lock-icon {
      width: 64px;
      height: 64px;
      margin: 0 auto 4px;
      display: grid;
      place-items: center;
      border-radius: 22px;
      background: #1d1f1b;
      color: #fff;
      font-size: 29px;
      line-height: 1;
      box-shadow: 0 14px 34px rgba(29,31,27,.16);
    }
    .finance-device-lock-card h1 {
      margin: 0;
      font-size: 25px;
      line-height: 1.15;
      letter-spacing: -.02em;
    }
    .finance-device-lock-card p {
      margin: 0 auto 8px;
      max-width: 330px;
      color: #686b65;
      font-size: 14px;
      line-height: 1.5;
    }
    .finance-device-lock-button {
      width: 100%;
      min-height: 50px;
      border: 0;
      border-radius: 14px;
      padding: 0 18px;
      background: #1d1f1b;
      color: #fff;
      font: inherit;
      font-weight: 750;
      cursor: pointer;
    }
    .finance-device-lock-button:disabled { opacity: .55; cursor: wait; }
    .finance-device-lock-secondary {
      border: 0;
      background: transparent;
      color: #686b65;
      font: inherit;
      font-size: 13px;
      cursor: pointer;
      padding: 8px;
    }
    @media (prefers-color-scheme: dark) {
      #finance-device-lock { background: #151613; color: #f4f3ef; }
      .finance-device-lock-icon { background: #f4f3ef; color: #151613; box-shadow: none; }
      .finance-device-lock-card p, .finance-device-lock-secondary { color: #a5a79f; }
      .finance-device-lock-button { background: #f4f3ef; color: #151613; }
    }
  `;
  document.head.append(style);
}

function createOverlay() {
  if (document.getElementById('finance-device-lock')) return;
  overlay = document.createElement('section');
  overlay.id = 'finance-device-lock';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.innerHTML = `
    <div class="finance-device-lock-card">
      <div class="finance-device-lock-icon" aria-hidden="true">◉</div>
      <h1></h1>
      <p></p>
      <button class="finance-device-lock-button" type="button"></button>
      <button class="finance-device-lock-secondary" type="button" hidden>Использовать пароль</button>
    </div>
  `;
  document.body.append(overlay);
  title = overlay.querySelector('h1');
  hint = overlay.querySelector('p');
  primaryButton = overlay.querySelector('.finance-device-lock-button');
  secondaryButton = overlay.querySelector('.finance-device-lock-secondary');
  primaryButton.addEventListener('click', handlePrimaryClick);
  secondaryButton.addEventListener('click', usePasswordFallback);
}

function deviceLabel() {
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'Face ID';
  if (/Windows/i.test(ua)) return 'Windows Hello';
  if (/Macintosh|Mac OS X/i.test(ua)) return 'Touch ID';
  if (/Android/i.test(ua)) return 'биометрию';
  return 'биометрию устройства';
}

function showEnrollment(message = '') {
  lockNow();
  title.textContent = `Настроить ${deviceLabel()}`;
  hint.textContent = message || `На этом устройстве биометрическая блокировка ещё не настроена. После настройки приложение будет запрашивать ${deviceLabel()} при каждом открытии.`;
  primaryButton.textContent = `Включить ${deviceLabel()}`;
  primaryButton.dataset.mode = 'enroll';
  secondaryButton.hidden = true;
}

function showUnlock(message = '') {
  lockNow();
  title.textContent = 'Приложение заблокировано';
  hint.textContent = message || `Подтвердите вход через ${deviceLabel()}.`;
  primaryButton.textContent = `Разблокировать · ${deviceLabel()}`;
  primaryButton.dataset.mode = 'unlock';
  secondaryButton.hidden = false;
}

async function handlePrimaryClick() {
  if (busy) return;
  if (primaryButton.dataset.mode === 'enroll') await enrollBiometrics();
  else await unlockWithBiometrics({ silentFailure: false });
}

async function enrollBiometrics() {
  setBusy(true, 'Настройка…');
  try {
    const userId = getOrCreateUserId();
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge: randomBytes(32),
        rp: { name: 'Расходы' },
        user: {
          id: base64UrlToBytes(userId),
          name: 'finance-report-local',
          displayName: 'Расходы',
        },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          residentKey: 'preferred',
          userVerification: 'required',
        },
        timeout: 60000,
        attestation: 'none',
      },
    });

    if (!credential?.rawId) throw new Error('Не удалось создать ключ устройства.');
    credentialId = bytesToBase64Url(new Uint8Array(credential.rawId));
    localStorage.setItem(CREDENTIAL_KEY, credentialId);
    releaseLock();
  } catch (error) {
    if (isUserCancel(error)) {
      showEnrollment('Настройка отменена. Для работы биометрической блокировки подтвердите действие ещё раз.');
    } else {
      console.error('Biometric enrollment failed', error);
      showEnrollment('Не удалось настроить биометрию на этом устройстве. Попробуйте ещё раз.');
    }
  } finally {
    setBusy(false);
  }
}

async function unlockWithBiometrics({ silentFailure }) {
  if (busy || !credentialId || document.hidden) return;
  setBusy(true, 'Проверка…');
  try {
    const credential = await navigator.credentials.get({
      publicKey: {
        challenge: randomBytes(32),
        allowCredentials: [{
          type: 'public-key',
          id: base64UrlToBytes(credentialId),
          transports: ['internal'],
        }],
        userVerification: 'required',
        timeout: 60000,
      },
    });

    if (!credential?.rawId) throw new Error('Устройство не вернуло подтверждение.');
    const returnedId = bytesToBase64Url(new Uint8Array(credential.rawId));
    if (returnedId !== credentialId) throw new Error('Получен другой ключ устройства.');
    if (!hasUserVerification(credential.response?.authenticatorData)) {
      throw new Error('Биометрическая проверка не подтверждена.');
    }
    releaseLock();
  } catch (error) {
    if (!silentFailure && !isUserCancel(error)) console.error('Biometric unlock failed', error);
    showUnlock(silentFailure
      ? `Нажмите кнопку и подтвердите вход через ${deviceLabel()}.`
      : `Не удалось разблокировать. Повторите проверку через ${deviceLabel()}.`);
  } finally {
    setBusy(false);
  }
}

function hasUserVerification(authenticatorData) {
  if (!authenticatorData) return false;
  const bytes = new Uint8Array(authenticatorData);
  // authenticatorData: 32 bytes rpIdHash, затем byte flags. UV = bit 2 (0x04).
  return bytes.length > 32 && (bytes[32] & 0x04) === 0x04;
}

function handleVisibilityChange() {
  if (!supported || !credentialId) return;
  if (document.hidden) {
    rememberHidden();
    if (!busy) lockNow();
    return;
  }
  const hiddenAt = Number(sessionStorage.getItem(HIDDEN_AT_KEY) || 0);
  if (hiddenAt && Date.now() - hiddenAt >= LOCK_AFTER_HIDDEN_MS) {
    showUnlock();
    unlockWithBiometrics({ silentFailure: true });
  }
  sessionStorage.removeItem(HIDDEN_AT_KEY);
}

function rememberHidden() {
  if (!supported || !credentialId) return;
  sessionStorage.setItem(HIDDEN_AT_KEY, String(Date.now()));
  if (!busy) lockNow();
}

function handlePageShow(event) {
  if (!supported || !credentialId) return;
  if (event.persisted) {
    showUnlock();
    unlockWithBiometrics({ silentFailure: true });
  }
}

function lockNow() {
  unlocked = false;
  document.documentElement.classList.add('finance-device-locked');
  if (overlay) overlay.hidden = false;
}

function releaseLock() {
  unlocked = true;
  sessionStorage.removeItem(HIDDEN_AT_KEY);
  document.documentElement.classList.remove('finance-device-locked');
  if (overlay) overlay.hidden = true;
}

function setBusy(value, text = '') {
  busy = value;
  if (!primaryButton) return;
  primaryButton.disabled = value;
  if (value && text) primaryButton.textContent = text;
  else if (!unlocked) {
    if (credentialId) primaryButton.textContent = `Разблокировать · ${deviceLabel()}`;
    else primaryButton.textContent = `Включить ${deviceLabel()}`;
  }
}

function usePasswordFallback() {
  // Парольная Cloudflare-сессия остаётся главным способом восстановления доступа.
  // Удаляем только локальный ключ блокировки этого браузера и просим пароль заново.
  localStorage.removeItem(CREDENTIAL_KEY);
  localStorage.removeItem(USER_KEY);
  credentialId = '';
  location.href = '/auth/logout';
}

function getOrCreateUserId() {
  let value = localStorage.getItem(USER_KEY);
  if (value) return value;
  value = bytesToBase64Url(randomBytes(32));
  localStorage.setItem(USER_KEY, value);
  return value;
}

function randomBytes(length) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

function bytesToBase64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function isUserCancel(error) {
  return error?.name === 'NotAllowedError' || error?.name === 'AbortError';
}
