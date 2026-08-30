const APP_PUBLIC_NAME = 'Runtime';
const DATA_KEY = 'expenses-app:data:v1';

const MONTH_DATIVE = [
  'январю', 'февралю', 'марту', 'апрелю', 'маю', 'июню',
  'июлю', 'августу', 'сентябрю', 'октябрю', 'ноябрю', 'декабрю',
];

let comparisonScheduled = false;

applyBranding();
installDesktopReadability();
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
  if (brand) brand.textContent = APP_PUBLIC_NAME;

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
