const APP_PUBLIC_NAME = 'Runtime';

applyBranding();
installDesktopReadability();

function applyBranding() {
  document.title = APP_PUBLIC_NAME;

  let applicationName = document.querySelector('meta[name="application-name"]');
  if (!applicationName) {
    applicationName = document.createElement('meta');
    applicationName.name = 'application-name';
    document.head.append(applicationName);
  }
  applicationName.content = APP_PUBLIC_NAME;

  const appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
  if (appleTitle) appleTitle.content = APP_PUBLIC_NAME;

  const brand = document.querySelector('.brand strong');
  if (brand) brand.textContent = APP_PUBLIC_NAME;

  // На случай повторной отрисовки оболочки.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) document.title = APP_PUBLIC_NAME;
  });
}

function installDesktopReadability() {
  if (document.getElementById('runtime-desktop-readability')) return;
  const style = document.createElement('style');
  style.id = 'runtime-desktop-readability';
  style.textContent = `
    /* Телефон уже хорошо читается — увеличиваем только desktop/tablet UI. */
    @media (min-width: 981px) {
      .save-status { font-size: 12px; }
      .sidebar-section-head { font-size: 12px; letter-spacing: .05em; }
      .month-item small { font-size: 11px; }
      .theme-control .theme-value { font-size: 12px; }

      .eyebrow,
      .section-kicker,
      .dialog-kicker { font-size: 11px; }

      .progress-caption,
      .metric-item small,
      .section-meta,
      .filter-reset,
      .filter-chip { font-size: 12px; }

      th { font-size: 11px; }

      .income-sources-head > span,
      .income-total-line,
      .capital-columns-head,
      .capital-totals { font-size: 12px !important; }

      .capital-editor-head small { font-size: 12px !important; }

      #expense-amount-result {
        font-size: 11px !important;
      }
    }
  `;
  document.head.append(style);
}
