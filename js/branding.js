const APP_PUBLIC_NAME = 'OwenLogic';
const APP_INTERNAL_NAME = 'Расходы';
const DATA_KEY = 'expenses-app:data:v1';

const MONTH_DATIVE = [
  'январю', 'февралю', 'марту', 'апрелю', 'маю', 'июню',
  'июлю', 'августу', 'сентябрю', 'октябрю', 'ноябрю', 'декабрю',
];

let comparisonScheduled = false;

applyBranding();
installDesktopReadability();
installTypeBreakdownPalette();
installSummaryComparisons();

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
  if (brand) brand.textContent = APP_INTERNAL_NAME;

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) document.title = APP_PUBLIC_NAME;
  });
}

function installDesktopReadability() {
  if (document.getElementById('runtime-desktop-readability')) return;
  const style = document.createElement('style');
  style.id = 'runtime-desktop-readability';
  style.textContent = `
    /*
     * Desktop readability pass.
     * Телефонные стили не трогаем: изменения действуют только от 981px.
     */
    @media (min-width: 981px) {
      body { font-size: 15px !important; }

      /* Sidebar / header */
      .brand strong { font-size: 16px !important; }
      .save-status { font-size: 12px !important; color: var(--text-secondary) !important; }
      .sidebar-section-head { font-size: 12px !important; letter-spacing: .05em !important; }
      .month-item small { font-size: 12px !important; color: var(--text-secondary) !important; }
      .theme-control .theme-value { font-size: 12px !important; color: var(--text-secondary) !important; }
      .eyebrow,
      .section-kicker,
      .dialog-kicker { font-size: 12px !important; color: var(--text-secondary) !important; }
      .header-subtitle { font-size: 14px !important; }

      /* Main summary */
      .summary-label { font-size: 14px !important; }
      .balance-context { font-size: 14px !important; }
      .progress-caption { font-size: 13px !important; color: var(--text-secondary) !important; }
      .metric-item span { font-size: 13px !important; }
      .metric-item small { font-size: 13px !important; color: var(--text-secondary) !important; }
      .section-meta { font-size: 13px !important; color: var(--text-secondary) !important; }

      /* "По типам" / "По категориям" */
      .breakdown-name { font-size: 14px !important; }
      .breakdown-row strong { font-size: 14px !important; }
      .breakdown-list.muted { font-size: 13px !important; }
      .breakdown-name .category-dot { width: 8px !important; height: 8px !important; }
      .bar { height: 5px !important; }

      /* Filters / expenses table */
      .filter-reset,
      .filter-chip { font-size: 12px !important; }
      th { font-size: 12px !important; color: var(--text-secondary) !important; }
      .type-text { font-size: 13px !important; }
      .row-action { font-size: 13px !important; }

      /* Dialogs / reference lists / import-export */
      .form-grid label span { font-size: 13px !important; }
      .refs-head p { font-size: 12px !important; color: var(--text-secondary) !important; }
      .notice { font-size: 13px !important; }
      .data-actions-grid strong { font-size: 13px !important; }
      .data-actions-grid small { font-size: 12px !important; color: var(--text-secondary) !important; }
      .reset-data-button { font-size: 12px !important; }
      .toast { font-size: 13px !important; }
      .button.compact { font-size: 13px !important; }

      /* Income / capital UI */
      .income-sources-head > span,
      .income-total-line,
      .capital-columns-head,
      .capital-totals { font-size: 13px !important; }
      .capital-editor-head small { font-size: 13px !important; }
      #expense-amount-result { font-size: 12px !important; }

      /*
       * Analytics: в модуле было много 7–10px подписей.
       * На desktop поднимаем их до читаемого минимума, мобильные размеры не меняются.
       */
      .finance-period-fields label > span { font-size: 12px !important; }
      .finance-quick-ranges button { font-size: 12px !important; }
      .finance-analytics-title-row span { font-size: 12px !important; }
      .finance-period-badge { font-size: 11px !important; }
      .finance-kpi > span,
      .finance-kpi > small { font-size: 12px !important; }
      .finance-card-head span { font-size: 11px !important; }
      .finance-card-head > small { font-size: 12px !important; }
      .finance-card-stat small { font-size: 11px !important; }
      .finance-axis-label { font-size: 11px !important; }
      .finance-peak-label { font-size: 11px !important; }
      .finance-chart-footer { font-size: 11px !important; }
      .finance-donut > div span { font-size: 11px !important; }
      .finance-legend-row { font-size: 12px !important; }
      .finance-legend-row strong { font-size: 12px !important; }
      .finance-legend-row small { font-size: 11px !important; }
      .finance-bar-label { font-size: 12px !important; }
      .finance-bar-row > small { font-size: 11px !important; }
      .finance-income-estimate { font-size: 11px !important; }
      .finance-cashflow-legend { font-size: 11px !important; }
      .finance-cashflow-values { font-size: 10px !important; }
      .finance-cashflow-month > span,
      .finance-cashflow-month > small { font-size: 10px !important; }
      .finance-income-label { font-size: 12px !important; }
      .finance-income-label strong { font-size: 12px !important; }
      .finance-income-meta { font-size: 10px !important; }
      .finance-weekday-value { font-size: 10px !important; }
      .finance-weekday > span { font-size: 11px !important; }
      .finance-observations p { font-size: 12px !important; }
      .finance-top-rank { font-size: 10px !important; }
      .finance-top-row strong,
      .finance-top-row b { font-size: 12px !important; }
      .finance-top-row small { font-size: 10px !important; }
      .finance-empty-chart { font-size: 12px !important; }

      /*
       * About: на 1920x1080 шесть status-карточек в ряд сильно сжимали подписи.
       * Делаем 3 в ряд и увеличиваем самые мелкие подписи.
       */
      .finance-about-status-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
        gap: 10px !important;
      }
      .finance-about-status > div {
        font-size: 12px !important;
        color: var(--text-secondary) !important;
      }
      .finance-about-feature p,
      .finance-about-tech-card p,
      .finance-about-privacy-row p,
      .finance-about-note p,
      .finance-about-warning p { font-size: 12px !important; }
      .finance-about-flow-step > span { font-size: 11px !important; }
      .finance-about-flow-step small { font-size: 11px !important; color: var(--text-secondary) !important; }
      .finance-about-flow-step p { font-size: 11px !important; }
      .finance-about-note strong,
      .finance-about-warning span { font-size: 12px !important; }
      .finance-about-tech-card > span { font-size: 11px !important; color: var(--text-secondary) !important; }
      .finance-about-footer { font-size: 11px !important; color: var(--text-secondary) !important; }
    }

    /* Сравнения на главной сводке. */
    .expense-metric small.is-better { color: var(--positive) !important; }
    .expense-metric small.is-worse { color: var(--negative) !important; }
    .expense-metric small.summary-comparison {
      font-variant-numeric: tabular-nums;
      font-weight: 620;
    }
  `;
  document.head.append(style);
}

const TYPE_BREAKDOWN_COLORS = new Map([
  ['Семейный', '#b7779a'],
  ['Жена', '#6f93b6'],
  ['Личный', '#c58a5f'],
]);

const TYPE_FALLBACK_COLORS = [
  '#7b9a70',
  '#8d7ab5',
  '#5f9d98',
  '#b76f68',
  '#a0a35f',
  '#6f84a7',
  '#a874a0',
];

function installTypeBreakdownPalette() {
  const start = () => {
    const root = document.getElementById('by-type');
    if (!root) {
      setTimeout(start, 120);
      return;
    }

    const apply = () => {
      const rows = [...root.querySelectorAll('.breakdown-row')];
      rows.forEach((row, index) => {
        const label = row.querySelector('.breakdown-name span:last-child')?.textContent?.trim() || '';
        const color = TYPE_BREAKDOWN_COLORS.get(label) ||
          TYPE_FALLBACK_COLORS[index % TYPE_FALLBACK_COLORS.length];
        row.style.setProperty('--item-color', color);
      });
    };

    new MutationObserver(apply).observe(root, { childList: true, subtree: true });
    apply();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
}

function installSummaryComparisons() {
  const start = () => {
    const monthSelect = document.getElementById('month-select');
    const monthContent = document.getElementById('month-content');
    if (!monthSelect || !monthContent) {
      setTimeout(start, 100);
      return;
    }

    monthSelect.addEventListener('change', scheduleSummaryComparisons);

    const observer = new MutationObserver(() => scheduleSummaryComparisons());
    observer.observe(monthContent, {
      subtree: true,
      childList: true,
      characterData: true,
    });

    // Экран-приманка переключается классом на <html>. При снятии шаблона
    // содержимое месяца может не перерисоваться, поэтому отдельно следим
    // за изменением класса и сразу пересчитываем реальные сравнения.
    const privacyObserver = new MutationObserver((mutations) => {
      if (mutations.some((mutation) =>
        mutation.type === 'attributes' && mutation.attributeName === 'class'
      )) {
        scheduleSummaryComparisons();
      }
    });
    privacyObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    window.addEventListener('storage', (event) => {
      if (event.key === DATA_KEY) scheduleSummaryComparisons();
    });

    scheduleSummaryComparisons();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
}

function scheduleSummaryComparisons() {
  if (comparisonScheduled) return;
  comparisonScheduled = true;
  requestAnimationFrame(() => {
    comparisonScheduled = false;
    renderSummaryComparisons();
  });
}

function renderSummaryComparisons() {
  const balanceComparison = document.getElementById('previous-comparison');
  const expenseMetric = document.querySelector('.expense-metric');
  const expenseComparison = expenseMetric?.querySelector('small');
  const monthSelect = document.getElementById('month-select');

  if (!balanceComparison || !expenseComparison || !monthSelect?.value) return;

  // В режиме-приманке не читаем реальные данные из localStorage,
  // чтобы сравнения случайно не раскрыли настоящие цифры.
  if (document.documentElement.classList.contains('finance-decoy-active')) {
    setComparison(balanceComparison, 'Сравнение скрыто', '');
    setComparison(expenseComparison, 'Сравнение скрыто', '');
    expenseComparison.classList.add('summary-comparison');
    return;
  }

  const data = readData();
  const current = data?.months?.find((month) => month.id === monthSelect.value);
  if (!current) return;

  const previousId = previousMonthId(current.year, current.month);
  const previous = data.months.find((month) => month.id === previousId);

  expenseComparison.classList.add('summary-comparison');

  if (!previous) {
    setComparison(balanceComparison, 'Нет предыдущего месяца', '');
    setComparison(expenseComparison, 'Нет предыдущего месяца', '');
    return;
  }

  const previousName = MONTH_DATIVE[(Number(previous.month) || 1) - 1] || 'предыдущему месяцу';

  const currentExpenses = expenseTotal(current);
  const previousExpenses = expenseTotal(previous);
  const currentBalance = Number(current.income || 0) - currentExpenses;
  const previousBalance = Number(previous.income || 0) - previousExpenses;

  // В блоке «Остаток» теперь сравнивается именно остаток.
  renderPercentComparison(balanceComparison, {
    current: currentBalance,
    previous: previousBalance,
    previousName,
    higherIsBetter: true,
    emptyText: `Нет остатка для сравнения к ${previousName}`,
  });

  // Под суммой расходов показываем прежнее сравнение расходов.
  renderPercentComparison(expenseComparison, {
    current: currentExpenses,
    previous: previousExpenses,
    previousName,
    higherIsBetter: false,
    emptyText: `Нет расходов в предыдущем месяце`,
  });
}

function renderPercentComparison(element, {
  current,
  previous,
  previousName,
  higherIsBetter,
  emptyText,
}) {
  element.classList.remove('is-better', 'is-worse');

  const currentValue = Number(current) || 0;
  const previousValue = Number(previous) || 0;

  if (Math.abs(previousValue) < 0.005) {
    if (Math.abs(currentValue) < 0.005) {
      setComparison(element, `Без изменений к ${previousName}`, '');
    } else {
      setComparison(element, emptyText, '');
    }
    return;
  }

  // Делим на модуль предыдущего значения, чтобы корректно сравнивать
  // и отрицательный остаток: переход -20 000 → -10 000 считается улучшением.
  const diffPercent = ((currentValue - previousValue) / Math.abs(previousValue)) * 100;

  if (Math.abs(diffPercent) < 0.05) {
    setComparison(element, `Без изменений к ${previousName}`, '');
    return;
  }

  const directionUp = diffPercent > 0;
  const arrow = directionUp ? '↑' : '↓';
  const text = `${arrow} ${Math.abs(diffPercent).toLocaleString('ru-RU', {
    maximumFractionDigits: 1,
  })}% к ${previousName}`;

  const better = higherIsBetter ? directionUp : !directionUp;
  setComparison(element, text, better ? 'is-better' : 'is-worse');
}

function setComparison(element, text, stateClass) {
  if (element.textContent !== text) element.textContent = text;
  element.classList.remove('is-better', 'is-worse');
  if (stateClass) element.classList.add(stateClass);
}

function expenseTotal(month) {
  return (Array.isArray(month?.expenses) ? month.expenses : [])
    .reduce((sum, expense) => sum + (Number(expense?.amount) || 0), 0);
}

function previousMonthId(year, month) {
  const y = Number(year);
  const m = Number(month);
  const previousYear = m === 1 ? y - 1 : y;
  const previousMonth = m === 1 ? 12 : m - 1;
  return `${previousYear}-${String(previousMonth).padStart(2, '0')}`;
}

function readData() {
  try {
    const raw = localStorage.getItem(DATA_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
