const ABOUT_ID = 'finance-about-dialog';
const DATA_KEY = 'expenses-app:data:v1';
const D1_DIRTY_KEY = 'expenses-app:d1-dirty:v1';
const D1_LAST_SYNCED_KEY = 'expenses-app:d1-last-synced:v1';
const BIOMETRIC_KEY = 'expenses-app:device-lock-credential:v1';

setupAbout();

function setupAbout() {
  const run = () => {
    if (document.getElementById(ABOUT_ID)) return;
    installAboutStyles();
    createAboutDialog();
    installAboutEntryPoints();
    window.addEventListener('online', refreshAbout);
    window.addEventListener('offline', refreshAbout);
    window.addEventListener('finance:d1-sync-state', refreshAbout);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }
}

function installAboutEntryPoints() {
  const nav = document.querySelector('.nav-stack');
  if (nav && !document.getElementById('finance-about-nav')) {
    const button = document.createElement('button');
    button.id = 'finance-about-nav';
    button.className = 'nav-item finance-about-nav';
    button.type = 'button';
    button.dataset.action = 'about';
    button.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="8.5"/>
        <path d="M12 10.6v5.1M12 7.4h.01"/>
      </svg>
      <span>О приложении</span>`;
    button.addEventListener('click', openAbout);
    nav.append(button);
  }

  const header = document.querySelector('.header-actions');
  if (header && !document.getElementById('finance-about-open')) {
    const button = document.createElement('button');
    button.id = 'finance-about-open';
    button.className = 'icon-button finance-about-open';
    button.type = 'button';
    button.setAttribute('aria-label', 'О приложении');
    button.title = 'О приложении';
    button.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="8.5"/>
        <path d="M12 10.6v5.1M12 7.4h.01"/>
      </svg>`;
    button.addEventListener('click', openAbout);

    const analytics = document.getElementById('finance-analytics-open');
    const eye = document.getElementById('finance-decoy-toggle');
    if (analytics?.parentElement === header) analytics.insertAdjacentElement('afterend', button);
    else if (eye?.parentElement === header) eye.insertAdjacentElement('afterend', button);
    else header.prepend(button);
  }

  const dataGrid = document.querySelector('#data-dialog .data-actions-grid');
  if (dataGrid && !document.getElementById('finance-about-data-action')) {
    const button = document.createElement('button');
    button.id = 'finance-about-data-action';
    button.type = 'button';
    button.dataset.action = 'about';
    button.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="8.5"/>
        <path d="M12 10.6v5.1M12 7.4h.01"/>
      </svg>
      <span><strong>О приложении</strong><small>Возможности, хранение и защита</small></span>`;
    button.addEventListener('click', (event) => {
      event.preventDefault();
      document.getElementById('data-dialog')?.close();
      openAbout();
    });
    dataGrid.append(button);
  }
}

function createAboutDialog() {
  const dialog = document.createElement('dialog');
  dialog.id = ABOUT_ID;
  dialog.className = 'finance-about-dialog';
  dialog.innerHTML = `
    <div class="finance-about-shell">
      <header class="finance-about-head">
        <div class="finance-about-brand">
          <div class="finance-about-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M5 16.5V7.7C5 6.8 5.7 6 6.7 6h10.6c.9 0 1.7.7 1.7 1.7v8.6c0 .9-.7 1.7-1.7 1.7H6.7C5.7 18 5 17.3 5 16.5Z"/>
              <path d="M8 10h8M8 14h5"/>
            </svg>
          </div>
          <div>
            <p class="dialog-kicker">О приложении</p>
            <h2>Расходы</h2>
            <p>Личный финансовый журнал с офлайн-режимом, защищённой облачной синхронизацией и аналитикой.</p>
          </div>
        </div>
        <button type="button" class="close-button finance-about-close" aria-label="Закрыть">
          <svg viewBox="0 0 24 24" fill="none"><path d="m6 6 12 12M18 6 6 18"/></svg>
        </button>
      </header>

      <section class="finance-about-hero">
        <div class="finance-about-pills">
          <span><i></i>PWA</span>
          <span><i></i>Cloudflare D1</span>
          <span><i></i>Офлайн</span>
          <span><i></i>Face ID / Windows Hello</span>
        </div>
        <div class="finance-about-status-grid" id="finance-about-status-grid"></div>
      </section>

      <nav class="finance-about-tabs" aria-label="Разделы «О приложении»">
        <button type="button" class="is-active" data-about-tab="features">Возможности</button>
        <button type="button" data-about-tab="architecture">Как устроено</button>
        <button type="button" data-about-tab="privacy">Приватность</button>
        <button type="button" data-about-tab="tech">Технологии</button>
      </nav>

      <div class="finance-about-panels">
        <section class="finance-about-panel is-active" data-about-panel="features">
          <div class="finance-about-feature-grid">
            ${featureCard('wallet', 'Учёт расходов и доходов', 'Месяцы, категории, типы, несколько источников дохода и источники капитала.')}
            ${featureCard('chart', 'Локальная аналитика', 'Графики доходов и расходов, категории, типы, динамика, сравнение периодов и автоматические наблюдения.')}
            ${featureCard('cloud', 'Автосинхронизация', 'Изменения сначала сохраняются локально, затем автоматически отправляются в Cloudflare D1.')}
            ${featureCard('file', 'XLSX и JSON', 'Импорт с объединением или заменой, экспорт Excel и полный переносимый JSON-backup.')}
            ${featureCard('eye', 'Экран-приманка', 'По умолчанию можно показывать шаблонные данные и открывать настоящие только по кнопке-глазу.')}
            ${featureCard('mobile', 'PWA для телефона и ПК', 'Устанавливается как приложение, работает на iPhone и desktop и поддерживает офлайн-запуск.')}
          </div>
        </section>

        <section class="finance-about-panel" data-about-panel="architecture">
          <div class="finance-about-flow" role="list">
            ${flowStep('1', 'Интерфейс', 'HTML / CSS / Vanilla JS', 'Все действия выполняются в PWA без UI-фреймворков.')}
            ${flowConnector()}
            ${flowStep('2', 'Локальная копия', 'localStorage', 'Каждое изменение сохраняется в браузере сразу, поэтому работа не зависит от сети.')}
            ${flowConnector()}
            ${flowStep('3', 'API', 'Cloudflare Pages Functions', 'Серверная прослойка проверяет авторизацию и не раскрывает секреты клиенту.')}
            ${flowConnector()}
            ${flowStep('4', 'Облако', 'Cloudflare D1', 'Актуальная копия данных хранится в SQL-базе и доступна после входа.')}
          </div>
          <div class="finance-about-note">
            <strong>Офлайн-first</strong>
            <p>Если интернет пропал, приложение продолжает работать с локальной копией. После восстановления сети изменения синхронизируются автоматически.</p>
          </div>
        </section>

        <section class="finance-about-panel" data-about-panel="privacy">
          <div class="finance-about-privacy-list">
            ${privacyRow('lock', 'Пароль на сервере', 'Вход защищён серверной сессией. Пароль хранится в Cloudflare Secret, а не в JavaScript.')}
            ${privacyRow('face', 'Биометрическая блокировка', 'Face ID / Touch ID / Windows Hello реализованы через WebAuthn. Биометрические данные приложение не получает.')}
            ${privacyRow('database', 'Финансы не лежат в репозитории', 'Рабочие данные находятся в D1 и локальном хранилище устройства, а не в публичном JSON-файле.')}
            ${privacyRow('eye', 'Шаблонный режим', 'Экран-приманка помогает не показывать реальные суммы, когда приложение открыто рядом с посторонними.')}
            ${privacyRow('cache', 'API не кэшируется', 'Service Worker сохраняет интерфейс для офлайн-работы, но запросы /api/* исключены из Cache Storage.')}
          </div>
          <div class="finance-about-warning">
            <span>Важно</span>
            <p>Доступ к разблокированному устройству всё равно даёт доступ к локальной копии. Биометрия, пароль устройства и резервные копии остаются частью общей защиты.</p>
          </div>
        </section>

        <section class="finance-about-panel" data-about-panel="tech">
          <div class="finance-about-tech-grid">
            ${techCard('Frontend', 'HTML · CSS · ES Modules', 'Без React, Vue и других UI-фреймворков.')}
            ${techCard('PWA', 'Service Worker · Web App Manifest', 'Установка на домашний экран и офлайн shell.')}
            ${techCard('Cloud', 'Cloudflare Pages · Functions · D1', 'Хостинг, API и база данных в одной инфраструктуре.')}
            ${techCard('Security', 'WebAuthn · HttpOnly cookie · HMAC', 'Биометрия устройства и подписанная серверная сессия.')}
            ${techCard('Data', 'XLSX · JSON · localStorage', 'Импорт, экспорт, резервные копии и локальная рабочая копия.')}
            ${techCard('Analytics', 'SVG · DOM · Vanilla JS', 'Графики строятся локально без отправки финансовых данных стороннему API.')}
          </div>
        </section>
      </div>

      <footer class="finance-about-footer">
        <span>Персональное приложение для учёта финансов</span>
        <button type="button" data-about-refresh>Обновить статус</button>
      </footer>
    </div>`;

  document.body.append(dialog);

  dialog.querySelector('.finance-about-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.querySelectorAll('[data-about-tab]').forEach((button) => {
    button.addEventListener('click', () => selectAboutTab(button.dataset.aboutTab));
  });
  dialog.querySelector('[data-about-refresh]').addEventListener('click', refreshAbout);
}

function openAbout(event) {
  event?.preventDefault();
  const dialog = document.getElementById(ABOUT_ID);
  if (!dialog) return;
  refreshAbout();
  dialog.showModal();
}

function selectAboutTab(tab) {
  document.querySelectorAll('[data-about-tab]').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.aboutTab === tab);
  });
  document.querySelectorAll('[data-about-panel]').forEach((panel) => {
    panel.classList.toggle('is-active', panel.dataset.aboutPanel === tab);
  });
}

function refreshAbout() {
  const grid = document.getElementById('finance-about-status-grid');
  if (!grid) return;

  const decoy = document.documentElement.classList.contains('finance-decoy-active');
  const data = safeReadData();
  const months = Array.isArray(data?.months) ? data.months : [];
  const expenses = months.reduce((sum, month) => sum + (Array.isArray(month?.expenses) ? month.expenses.length : 0), 0);
  const biometric = Boolean(localStorage.getItem(BIOMETRIC_KEY));
  const dirty = localStorage.getItem(D1_DIRTY_KEY) === '1';
  const lastSynced = localStorage.getItem(D1_LAST_SYNCED_KEY);
  const standalone = isStandalone();

  const cards = [
    statusCard(navigator.onLine ? 'Онлайн' : 'Офлайн', navigator.onLine ? 'Сеть доступна' : 'Работаем локально', navigator.onLine ? 'online' : 'offline'),
    statusCard(standalone ? 'Установлено' : 'Браузер', standalone ? 'Запущено как PWA' : 'Можно установить как PWA', standalone ? 'ok' : 'neutral'),
    statusCard(biometric ? 'Настроено' : 'Не настроено', biometric ? biometricLabel() : 'Face ID / Windows Hello', biometric ? 'ok' : 'neutral'),
    statusCard(dirty ? 'Ожидает' : 'Синхронизировано', dirty ? 'Есть локальные изменения' : lastSynced ? 'D1 актуальна' : 'Автосинхронизация D1', dirty ? 'warn' : 'ok'),
    statusCard(decoy ? 'Скрыто' : String(months.length || 0), decoy ? 'Месяцы скрыты шаблоном' : plural(months.length, 'месяц', 'месяца', 'месяцев'), decoy ? 'private' : 'neutral'),
    statusCard(decoy ? 'Скрыто' : String(expenses || 0), decoy ? 'Операции скрыты шаблоном' : plural(expenses, 'операция', 'операции', 'операций'), decoy ? 'private' : 'neutral'),
  ];

  grid.innerHTML = cards.join('');
}

function statusCard(value, label, state) {
  return `<article class="finance-about-status ${state || ''}">
    <div><i></i><span>${escapeHtml(label)}</span></div>
    <strong>${escapeHtml(value)}</strong>
  </article>`;
}

function featureCard(icon, title, text) {
  return `<article class="finance-about-feature">
    <div class="finance-about-feature-icon">${iconSvg(icon)}</div>
    <div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(text)}</p></div>
  </article>`;
}

function flowStep(number, title, tech, text) {
  return `<button type="button" class="finance-about-flow-step" role="listitem">
    <span>${number}</span>
    <div><small>${escapeHtml(tech)}</small><strong>${escapeHtml(title)}</strong><p>${escapeHtml(text)}</p></div>
  </button>`;
}

function flowConnector() {
  return `<div class="finance-about-flow-connector" aria-hidden="true"><i></i><i></i><i></i></div>`;
}

function privacyRow(icon, title, text) {
  return `<article class="finance-about-privacy-row">
    <div class="finance-about-privacy-icon">${iconSvg(icon)}</div>
    <div><strong>${escapeHtml(title)}</strong><p>${escapeHtml(text)}</p></div>
    <span>✓</span>
  </article>`;
}

function techCard(label, title, text) {
  return `<article class="finance-about-tech-card">
    <span>${escapeHtml(label)}</span>
    <strong>${escapeHtml(title)}</strong>
    <p>${escapeHtml(text)}</p>
  </article>`;
}

function iconSvg(name) {
  const icons = {
    wallet: '<svg viewBox="0 0 24 24" fill="none"><path d="M4 7.5h15v10H4z"/><path d="M7 7.5V5.5h9v2M15 12h4"/></svg>',
    chart: '<svg viewBox="0 0 24 24" fill="none"><path d="M5 19V11M12 19V5M19 19v-8"/><path d="M3 19h18"/></svg>',
    cloud: '<svg viewBox="0 0 24 24" fill="none"><path d="M7 18h10a4 4 0 0 0 .7-7.9A6 6 0 0 0 6.3 9 4.5 4.5 0 0 0 7 18Z"/><path d="M12 10v5m0 0 2-2m-2 2-2-2"/></svg>',
    file: '<svg viewBox="0 0 24 24" fill="none"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5M9 13h6M9 16h6"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none"><path d="M3.5 12s3-5 8.5-5 8.5 5 8.5 5-3 5-8.5 5-8.5-5-8.5-5Z"/><circle cx="12" cy="12" r="2.2"/></svg>',
    mobile: '<svg viewBox="0 0 24 24" fill="none"><rect x="7" y="3" width="10" height="18" rx="2"/><path d="M10 6h4M11 18h2"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
    face: '<svg viewBox="0 0 24 24" fill="none"><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"/><path d="M8.5 10h.01M15.5 10h.01M9 15c1.7 1.3 4.3 1.3 6 0"/></svg>',
    database: '<svg viewBox="0 0 24 24" fill="none"><ellipse cx="12" cy="5.5" rx="7" ry="3"/><path d="M5 5.5v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6M5 11.5v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/></svg>',
    cache: '<svg viewBox="0 0 24 24" fill="none"><path d="M4 7h12l4 5-4 5H4z"/><path d="M8 10h6M8 14h4"/></svg>',
  };
  return icons[name] || icons.wallet;
}

function safeReadData() {
  try {
    const raw = localStorage.getItem(DATA_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;
}

function biometricLabel() {
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'Face ID / Touch ID';
  if (/Windows/i.test(ua)) return 'Windows Hello';
  return 'Биометрия устройства';
}

function plural(value, one, few, many) {
  const n = Math.abs(Number(value) || 0) % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) return many;
  if (n1 > 1 && n1 < 5) return few;
  if (n1 === 1) return one;
  return many;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function installAboutStyles() {
  if (document.getElementById('finance-about-style')) return;
  const style = document.createElement('style');
  style.id = 'finance-about-style';
  style.textContent = `
    .finance-about-dialog{width:min(1080px,calc(100vw - 28px));max-width:none;border:0;padding:0;background:transparent;color:var(--text-primary)}
    .finance-about-dialog::backdrop{background:rgba(16,18,16,.52);backdrop-filter:blur(8px)}
    .finance-about-shell{max-height:min(900px,calc(100dvh - 28px));overflow:auto;border:1px solid var(--border);border-radius:24px;background:var(--surface);box-shadow:0 30px 90px rgba(15,18,15,.22)}
    .finance-about-head{position:sticky;top:0;z-index:5;display:flex;justify-content:space-between;gap:22px;align-items:flex-start;padding:24px 26px 20px;background:color-mix(in srgb,var(--surface) 92%,transparent);backdrop-filter:blur(18px);border-bottom:1px solid var(--border)}
    .finance-about-brand{display:flex;align-items:center;gap:15px;min-width:0}
    .finance-about-mark{width:52px;height:52px;display:grid;place-items:center;flex:0 0 auto;border-radius:17px;background:var(--text-primary);color:var(--surface);box-shadow:0 12px 28px rgba(15,18,15,.13)}
    .finance-about-mark svg{width:27px;height:27px;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
    .finance-about-head h2{margin:1px 0 4px;font-size:27px;letter-spacing:-.04em}
    .finance-about-head p:not(.dialog-kicker){max-width:680px;margin:0;color:var(--text-secondary);font-size:12px;line-height:1.55}
    .finance-about-hero{padding:22px 26px 10px}
    .finance-about-pills{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:14px}
    .finance-about-pills span{display:flex;align-items:center;gap:6px;padding:6px 10px;border:1px solid var(--border);border-radius:999px;background:var(--surface-raised);font-size:9px;font-weight:680;color:var(--text-secondary)}
    .finance-about-pills i{width:6px;height:6px;border-radius:50%;background:#66906e;box-shadow:0 0 0 3px color-mix(in srgb,#66906e 16%,transparent)}
    .finance-about-status-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px}
    .finance-about-status{min-width:0;padding:13px 13px 12px;border:1px solid var(--border);border-radius:15px;background:var(--surface-raised)}
    .finance-about-status>div{display:flex;align-items:center;gap:6px;min-width:0;color:var(--text-tertiary);font-size:8px;white-space:nowrap;overflow:hidden}
    .finance-about-status>div span{overflow:hidden;text-overflow:ellipsis}
    .finance-about-status>div i{width:6px;height:6px;border-radius:50%;background:var(--text-tertiary);flex:0 0 auto}
    .finance-about-status strong{display:block;margin-top:7px;font-size:14px;letter-spacing:-.02em;overflow:hidden;text-overflow:ellipsis}
    .finance-about-status.ok>div i,.finance-about-status.online>div i{background:#66906e}
    .finance-about-status.warn>div i{background:#ba8a46}.finance-about-status.offline>div i{background:#9b765d}
    .finance-about-status.private>div i{background:#7a718e}
    .finance-about-tabs{position:sticky;top:97px;z-index:4;display:flex;gap:5px;padding:10px 26px;background:color-mix(in srgb,var(--surface) 94%,transparent);backdrop-filter:blur(18px);border-bottom:1px solid var(--border)}
    .finance-about-tabs button{border:0;border-radius:10px;padding:8px 11px;background:transparent;color:var(--text-secondary);font:inherit;font-size:10px;font-weight:670;cursor:pointer}
    .finance-about-tabs button:hover{background:var(--surface-hover);color:var(--text-primary)}
    .finance-about-tabs button.is-active{background:var(--text-primary);color:var(--surface)}
    .finance-about-panels{padding:18px 26px 24px}
    .finance-about-panel{display:none}.finance-about-panel.is-active{display:block;animation:finance-about-in 180ms ease-out}
    @keyframes finance-about-in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
    .finance-about-feature-grid,.finance-about-tech-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
    .finance-about-feature{display:flex;gap:12px;min-height:116px;padding:17px;border:1px solid var(--border);border-radius:17px;background:linear-gradient(145deg,var(--surface-raised),color-mix(in srgb,var(--surface-raised) 82%,var(--surface-hover)));transition:transform 160ms ease,border-color 160ms ease}
    .finance-about-feature:hover{transform:translateY(-2px);border-color:color-mix(in srgb,var(--text-tertiary) 45%,var(--border))}
    .finance-about-feature-icon,.finance-about-privacy-icon{width:34px;height:34px;display:grid;place-items:center;flex:0 0 auto;border-radius:11px;background:var(--surface-hover);color:var(--text-primary)}
    .finance-about-feature-icon svg,.finance-about-privacy-icon svg{width:19px;height:19px;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
    .finance-about-feature h3{margin:1px 0 6px;font-size:12px}.finance-about-feature p,.finance-about-tech-card p,.finance-about-privacy-row p,.finance-about-note p,.finance-about-warning p{margin:0;color:var(--text-secondary);font-size:9px;line-height:1.55}
    .finance-about-flow{display:grid;grid-template-columns:minmax(0,1fr) 42px minmax(0,1fr) 42px minmax(0,1fr) 42px minmax(0,1fr);align-items:stretch}
    .finance-about-flow-step{border:1px solid var(--border);border-radius:17px;padding:17px;text-align:left;background:var(--surface-raised);color:inherit;font:inherit;cursor:default;transition:transform 160ms ease,box-shadow 160ms ease}
    .finance-about-flow-step:hover{transform:translateY(-2px);box-shadow:0 12px 28px rgba(15,18,15,.07)}
    .finance-about-flow-step>span{width:24px;height:24px;display:grid;place-items:center;margin-bottom:18px;border-radius:8px;background:var(--text-primary);color:var(--surface);font-size:9px;font-weight:750}
    .finance-about-flow-step small{display:block;color:var(--text-tertiary);font-size:8px;margin-bottom:4px}.finance-about-flow-step strong{display:block;font-size:12px;margin-bottom:6px}.finance-about-flow-step p{margin:0;color:var(--text-secondary);font-size:8px;line-height:1.5}
    .finance-about-flow-connector{display:flex;justify-content:center;align-items:center;gap:3px}.finance-about-flow-connector i{width:4px;height:4px;border-radius:50%;background:var(--border)}.finance-about-flow-connector i:nth-child(2){background:var(--text-tertiary)}
    .finance-about-note,.finance-about-warning{margin-top:12px;padding:14px 16px;border:1px solid var(--border);border-radius:15px;background:var(--surface-hover)}
    .finance-about-note strong,.finance-about-warning span{display:block;margin-bottom:3px;font-size:10px}
    .finance-about-privacy-list{display:grid;gap:8px}
    .finance-about-privacy-row{display:grid;grid-template-columns:34px minmax(0,1fr) 22px;gap:12px;align-items:center;padding:13px 15px;border:1px solid var(--border);border-radius:15px;background:var(--surface-raised)}
    .finance-about-privacy-row>div:nth-child(2)>strong{display:block;margin-bottom:4px;font-size:11px}.finance-about-privacy-row>span{width:22px;height:22px;display:grid;place-items:center;border-radius:50%;background:color-mix(in srgb,#66906e 15%,transparent);color:#668b6e;font-size:10px;font-weight:800}
    .finance-about-warning{border-color:color-mix(in srgb,#a98254 30%,var(--border));background:color-mix(in srgb,#a98254 6%,var(--surface-raised))}
    .finance-about-tech-card{min-height:120px;padding:17px;border:1px solid var(--border);border-radius:17px;background:var(--surface-raised)}
    .finance-about-tech-card>span{display:inline-block;margin-bottom:18px;padding:4px 7px;border-radius:7px;background:var(--surface-hover);color:var(--text-tertiary);font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.06em}
    .finance-about-tech-card strong{display:block;margin-bottom:6px;font-size:12px}
    .finance-about-footer{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:13px 26px calc(13px + env(safe-area-inset-bottom));border-top:1px solid var(--border);color:var(--text-tertiary);font-size:8px}
    .finance-about-footer button{border:0;background:transparent;color:var(--text-secondary);font:inherit;font-size:9px;font-weight:680;cursor:pointer}
    .finance-about-open svg,.finance-about-nav svg{stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
    @media(max-width:860px){
      .finance-about-dialog{width:calc(100vw - 18px)}
      .finance-about-status-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
      .finance-about-feature-grid,.finance-about-tech-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
      .finance-about-flow{grid-template-columns:1fr;gap:8px}.finance-about-flow-connector{height:16px;transform:rotate(90deg)}
    }
    @media(max-width:560px){
      .finance-about-dialog{width:100vw;height:100dvh;margin:0;max-height:none}
      .finance-about-shell{height:100dvh;max-height:none;border:0;border-radius:0}
      .finance-about-head{padding:max(17px,env(safe-area-inset-top)) 17px 15px}.finance-about-mark{width:44px;height:44px;border-radius:14px}
      .finance-about-head h2{font-size:23px}.finance-about-head p:not(.dialog-kicker){font-size:10px}
      .finance-about-hero{padding:16px 17px 8px}.finance-about-status-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
      .finance-about-tabs{top:84px;overflow-x:auto;padding:8px 17px}.finance-about-tabs button{white-space:nowrap}
      .finance-about-panels{padding:14px 17px 22px}.finance-about-feature-grid,.finance-about-tech-grid{grid-template-columns:1fr}
      .finance-about-feature{min-height:auto}.finance-about-footer{padding-left:17px;padding-right:17px}
    }
    @media(prefers-reduced-motion:reduce){.finance-about-panel.is-active{animation:none}.finance-about-feature,.finance-about-flow-step{transition:none}}
  `;
  document.head.append(style);
}
