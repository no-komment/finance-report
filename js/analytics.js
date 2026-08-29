const DATA_KEY = 'expenses-app:data:v1';
const ANALYTICS_ID = 'finance-analytics-dialog';
const DAY_MS = 86400000;
const MONTH_NAMES = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const MONTH_NAMES_SHORT = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
const WEEKDAYS = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
const CHART_COLORS = ['#647b68','#9a7658','#6f7f98','#a37b85','#7e765f','#668b8c','#8b7193'];

setupAnalytics();

function setupAnalytics() {
  const run = () => {
    if (document.getElementById(ANALYTICS_ID)) return;
    installStyles();
    createDialog();
    installEntryPoints();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
  else run();
}

function installEntryPoints() {
  const header = document.querySelector('.header-actions');
  if (header && !document.getElementById('finance-analytics-open')) {
    const button = document.createElement('button');
    button.id = 'finance-analytics-open';
    button.className = 'icon-button finance-analytics-open';
    button.type = 'button';
    button.setAttribute('aria-label', 'Открыть аналитику');
    button.title = 'Аналитика';
    button.innerHTML = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 19V11M12 19V5M19 19v-8"/><path d="M3 19h18"/></svg>`;
    button.addEventListener('click', openAnalytics);
    const eye = document.getElementById('finance-decoy-toggle');
    if (eye?.parentElement === header) eye.insertAdjacentElement('afterend', button);
    else header.prepend(button);
  }

  const nav = document.querySelector('.nav-stack');
  if (nav && !document.getElementById('finance-analytics-nav')) {
    const button = document.createElement('button');
    button.id = 'finance-analytics-nav';
    button.className = 'nav-item finance-analytics-nav';
    button.type = 'button';
    button.dataset.action = 'analytics';
    button.innerHTML = `<svg viewBox="0 0 24 24" fill="none"><path d="M5 19V11M12 19V5M19 19v-8"/><path d="M3 19h18"/></svg><span>Аналитика</span>`;
    button.addEventListener('click', openAnalytics);
    const first = nav.querySelector('.nav-item');
    if (first) first.insertAdjacentElement('afterend', button); else nav.append(button);
  }

  const dataGrid = document.querySelector('#data-dialog .data-actions-grid');
  if (dataGrid && !document.getElementById('finance-analytics-data-action')) {
    const button = document.createElement('button');
    button.id = 'finance-analytics-data-action';
    button.type = 'button';
    button.dataset.action = 'analytics';
    button.innerHTML = `<svg viewBox="0 0 24 24" fill="none"><path d="M5 19V11M12 19V5M19 19v-8"/><path d="M3 19h18"/></svg><span><strong>Аналитика</strong><small>Графики и наблюдения</small></span>`;
    button.addEventListener('click', (event) => {
      event.preventDefault();
      document.getElementById('data-dialog')?.close();
      openAnalytics();
    });
    dataGrid.prepend(button);
  }
}

function createDialog() {
  const dialog = document.createElement('dialog');
  dialog.id = ANALYTICS_ID;
  dialog.className = 'finance-analytics-dialog';
  dialog.innerHTML = `
    <div class="finance-analytics-shell">
      <header class="finance-analytics-head">
        <div>
          <p class="dialog-kicker">Финансовый обзор</p>
          <h2>Аналитика расходов</h2>
          <p class="finance-analytics-subtitle">Период, динамика и структура расходов — без отправки данных наружу.</p>
        </div>
        <button type="button" class="close-button finance-analytics-close" aria-label="Закрыть"><svg viewBox="0 0 24 24" fill="none"><path d="m6 6 12 12M18 6 6 18"/></svg></button>
      </header>
      <section class="finance-period-panel">
        <div class="finance-mode-switch" role="tablist" aria-label="Режим периода">
          <button type="button" class="is-active" data-analytics-mode="month">Месяц</button>
          <button type="button" data-analytics-mode="range">Диапазон дат</button>
        </div>
        <div class="finance-period-fields" data-period-fields="month">
          <label><span>Месяц</span><select id="finance-analytics-month"></select></label>
        </div>
        <div class="finance-period-fields" data-period-fields="range" hidden>
          <label><span>С</span><input id="finance-analytics-from" type="date"></label>
          <label><span>По</span><input id="finance-analytics-to" type="date"></label>
          <div class="finance-quick-ranges" aria-label="Быстрый период">
            <button type="button" data-range-days="30">30 дней</button>
            <button type="button" data-range-days="90">90 дней</button>
            <button type="button" data-range-year>С начала года</button>
          </div>
        </div>
        <button id="finance-analytics-run" class="button primary finance-run-button" type="button">Показать аналитику</button>
      </section>
      <div id="finance-analytics-error" class="finance-analytics-error" hidden></div>
      <div id="finance-analytics-content" class="finance-analytics-content"></div>
    </div>`;
  document.body.append(dialog);

  dialog.querySelector('.finance-analytics-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.querySelectorAll('[data-analytics-mode]').forEach((button) => {
    button.addEventListener('click', () => setMode(button.dataset.analyticsMode));
  });
  dialog.querySelector('#finance-analytics-run').addEventListener('click', runAnalytics);
  dialog.querySelectorAll('[data-range-days]').forEach((button) => {
    button.addEventListener('click', () => setLastDays(Number(button.dataset.rangeDays)));
  });
  dialog.querySelector('[data-range-year]').addEventListener('click', setYearToDate);
}

function openAnalytics(event) {
  event?.preventDefault();
  if (document.documentElement.classList.contains('finance-decoy-active')) return;
  const dialog = document.getElementById(ANALYTICS_ID);
  if (!dialog) return;
  const data = readData();
  if (!data?.months?.length) {
    showError('Для аналитики пока нет данных.');
    dialog.showModal();
    return;
  }
  fillMonthOptions(data);
  setDefaultRange(data);
  showError('');
  dialog.showModal();
  runAnalytics();
}

function fillMonthOptions(data) {
  const select = document.getElementById('finance-analytics-month');
  const currentMain = document.getElementById('month-select')?.value;
  const previous = select.value;
  select.replaceChildren();
  for (const month of data.months) {
    select.add(new Option(month.name || `${MONTH_NAMES[month.month - 1]} ${month.year}`, month.id));
  }
  const preferred = currentMain && data.months.some((m) => m.id === currentMain) ? currentMain : previous;
  select.value = preferred && data.months.some((m) => m.id === preferred) ? preferred : data.months[0].id;
}

function setDefaultRange(data) {
  const dates = allExpenseRows(data).map((row) => row.dateMs);
  const selected = data.months.find((m) => m.id === document.getElementById('finance-analytics-month').value) || data.months[0];
  const today = utcToday();
  const start = Date.UTC(selected.year, selected.month - 1, 1);
  const monthEnd = Date.UTC(selected.year, selected.month, 0);
  const end = Math.min(monthEnd, today >= start ? today : monthEnd);
  const globalMin = dates.length ? Math.min(...dates) : start;
  const globalMax = dates.length ? Math.max(...dates) : end;
  const from = document.getElementById('finance-analytics-from');
  const to = document.getElementById('finance-analytics-to');
  if (!from.value) from.value = isoDate(Math.min(start, globalMax));
  if (!to.value) to.value = isoDate(Math.max(end, globalMin));
}

function setMode(mode) {
  document.querySelectorAll('[data-analytics-mode]').forEach((button) => button.classList.toggle('is-active', button.dataset.analyticsMode === mode));
  document.querySelectorAll('[data-period-fields]').forEach((block) => { block.hidden = block.dataset.periodFields !== mode; });
}

function setLastDays(days) {
  const to = Math.min(utcToday(), latestKnownDate(readData()) || utcToday());
  const from = to - (Math.max(1, days) - 1) * DAY_MS;
  document.getElementById('finance-analytics-from').value = isoDate(from);
  document.getElementById('finance-analytics-to').value = isoDate(to);
}

function setYearToDate() {
  const to = Math.min(utcToday(), latestKnownDate(readData()) || utcToday());
  const d = new Date(to);
  const from = Date.UTC(d.getUTCFullYear(), 0, 1);
  document.getElementById('finance-analytics-from').value = isoDate(from);
  document.getElementById('finance-analytics-to').value = isoDate(to);
}

function runAnalytics() {
  const data = readData();
  if (!data?.months?.length) return showError('Не удалось прочитать данные приложения.');
  try {
    const period = selectedPeriod(data);
    if (period.end < period.start) throw new Error('Дата окончания должна быть не раньше даты начала.');
    const rows = allExpenseRows(data);
    const currentRows = rows.filter((row) => row.dateMs >= period.start && row.dateMs <= period.end);
    const days = Math.floor((period.end - period.start) / DAY_MS) + 1;
    const previousEnd = period.start - DAY_MS;
    const previousStart = previousEnd - (days - 1) * DAY_MS;
    const previousRows = rows.filter((row) => row.dateMs >= previousStart && row.dateMs <= previousEnd);
    renderAnalytics(data, period, currentRows, previousRows, days, { start: previousStart, end: previousEnd });
    showError('');
  } catch (error) {
    showError(error.message || 'Не удалось построить аналитику.');
  }
}

function selectedPeriod(data) {
  const mode = document.querySelector('[data-analytics-mode].is-active')?.dataset.analyticsMode || 'month';
  if (mode === 'month') {
    const id = document.getElementById('finance-analytics-month').value;
    const month = data.months.find((m) => m.id === id);
    if (!month) throw new Error('Выберите месяц.');
    const start = Date.UTC(month.year, month.month - 1, 1);
    let end = Date.UTC(month.year, month.month, 0);
    const today = utcToday();
    if (today >= start && today < end) end = today;
    return { start, end, label: month.name || `${MONTH_NAMES[month.month - 1]} ${month.year}`, mode, month };
  }
  const start = parseIsoDate(document.getElementById('finance-analytics-from').value);
  const end = parseIsoDate(document.getElementById('finance-analytics-to').value);
  if (!Number.isFinite(start) || !Number.isFinite(end)) throw new Error('Укажите обе даты периода.');
  return { start, end, label: `${prettyDate(start)} — ${prettyDate(end)}`, mode };
}

function renderAnalytics(data, period, rows, previousRows, days, previousPeriod) {
  const container = document.getElementById('finance-analytics-content');
  const settings = data.settings || { currency: 'RUB', locale: 'ru-RU' };
  const total = sum(rows);
  const previousTotal = sum(previousRows);
  const count = rows.length;
  const activeDays = new Set(rows.map((row) => row.dateMs)).size;
  const avg = days > 0 ? total / days : 0;
  const largest = [...rows].sort((a, b) => b.amount - a.amount)[0] || null;
  const delta = previousTotal > 0 ? ((total - previousTotal) / previousTotal) * 100 : null;
  const categories = group(rows, 'category');
  const types = group(rows, 'type');
  const weekday = weekdayTotals(rows);
  const trend = buildTrend(rows, period.start, period.end);
  const topExpenses = [...rows].sort((a, b) => b.amount - a.amount).slice(0, 7);
  const insights = buildInsights({ rows, previousRows, total, previousTotal, delta, categories, types, weekday, largest, days, activeDays, settings });
  const categorySlices = collapseForDonut(categories, 6);

  container.innerHTML = `
    <section class="finance-analytics-summary">
      <div class="finance-analytics-title-row">
        <div><span>Выбранный период</span><strong>${escapeHtml(period.label)}</strong></div>
        <span class="finance-period-badge">${days} ${plural(days, 'день', 'дня', 'дней')}</span>
      </div>
      <div class="finance-kpi-grid">
        ${kpi('Всего расходов', money(total, settings), deltaBadge(delta))}
        ${kpi('Среднее в день', money(avg, settings), `${activeDays} активных ${plural(activeDays, 'день', 'дня', 'дней')}`)}
        ${kpi('Операции', String(count), count ? `Средний чек ${money(total / count, settings)}` : 'Нет операций')}
        ${kpi('Крупнейшая трата', largest ? money(largest.amount, settings) : '—', largest ? escapeHtml(largest.category) : 'Нет данных')}
      </div>
    </section>

    <section class="finance-analytics-grid finance-analytics-grid-main">
      <article class="finance-analytics-card finance-trend-card">
        <div class="finance-card-head"><div><span>Динамика</span><h3>${trend.kind === 'day' ? 'Расходы по дням' : 'Расходы по месяцам'}</h3></div><div class="finance-card-stat"><strong>${money(total, settings)}</strong><small>${comparisonText(delta, previousTotal, settings)}</small></div></div>
        ${renderTrendChart(trend, settings)}
        <div class="finance-chart-footer"><span>${prettyDate(period.start)}</span><span>предыдущий период: ${money(previousTotal, settings)}</span><span>${prettyDate(period.end)}</span></div>
      </article>

      <article class="finance-analytics-card finance-category-card">
        <div class="finance-card-head"><div><span>Структура</span><h3>По категориям</h3></div><small>${categories.length} ${plural(categories.length, 'категория', 'категории', 'категорий')}</small></div>
        ${renderDonut(categorySlices, total, settings)}
      </article>
    </section>

    <section class="finance-analytics-grid finance-analytics-grid-secondary">
      <article class="finance-analytics-card">
        <div class="finance-card-head"><div><span>Распределение</span><h3>По типам</h3></div></div>
        ${renderBars(types, total, settings)}
      </article>
      <article class="finance-analytics-card">
        <div class="finance-card-head"><div><span>Ритм</span><h3>По дням недели</h3></div></div>
        ${renderWeekdays(weekday, settings)}
      </article>
    </section>

    <section class="finance-analytics-grid finance-analytics-grid-bottom">
      <article class="finance-analytics-card">
        <div class="finance-card-head"><div><span>Что выделяется</span><h3>Наблюдения</h3></div></div>
        <div class="finance-observations">${insights.map((text) => `<div><i></i><p>${escapeHtml(text)}</p></div>`).join('')}</div>
      </article>
      <article class="finance-analytics-card">
        <div class="finance-card-head"><div><span>Топ расходов</span><h3>Крупнейшие операции</h3></div></div>
        ${renderTopExpenses(topExpenses, settings)}
      </article>
    </section>`;
}

function kpi(label, value, note) {
  return `<article class="finance-kpi"><span>${label}</span><strong>${value}</strong><small>${note || ''}</small></article>`;
}

function deltaBadge(delta) {
  if (delta == null) return 'Нет данных для сравнения';
  if (Math.abs(delta) < 0.05) return 'Без изменений к прошлому периоду';
  return `${delta < 0 ? '↓' : '↑'} ${Math.abs(delta).toLocaleString('ru-RU', { maximumFractionDigits: 1 })}% к прошлому периоду`;
}

function comparisonText(delta, previousTotal, settings) {
  if (!previousTotal) return 'нет расходов в предыдущем периоде';
  if (delta == null || Math.abs(delta) < 0.05) return 'без изменений';
  return `${delta < 0 ? 'меньше' : 'больше'} на ${Math.abs(delta).toLocaleString('ru-RU', { maximumFractionDigits: 1 })}%`;
}

function buildTrend(rows, start, end) {
  const days = Math.floor((end - start) / DAY_MS) + 1;
  if (days <= 92) {
    const map = new Map();
    rows.forEach((row) => map.set(row.dateMs, (map.get(row.dateMs) || 0) + row.amount));
    const points = [];
    for (let t = start; t <= end; t += DAY_MS) points.push({ key: t, label: shortDate(t), amount: map.get(t) || 0 });
    return { kind: 'day', points };
  }
  const map = new Map();
  for (const row of rows) {
    const d = new Date(row.dateMs);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    map.set(key, (map.get(key) || 0) + row.amount);
  }
  const points = [];
  let d = new Date(start);
  let y = d.getUTCFullYear(), m = d.getUTCMonth();
  const endDate = new Date(end);
  while (y < endDate.getUTCFullYear() || (y === endDate.getUTCFullYear() && m <= endDate.getUTCMonth())) {
    const key = `${y}-${String(m + 1).padStart(2, '0')}`;
    points.push({ key, label: `${MONTH_NAMES_SHORT[m]} ${String(y).slice(-2)}`, amount: map.get(key) || 0 });
    m += 1; if (m > 11) { m = 0; y += 1; }
  }
  return { kind: 'month', points };
}

function renderTrendChart(trend, settings) {
  const values = trend.points.map((p) => p.amount);
  const max = Math.max(...values, 1);
  const w = 880, h = 260, left = 16, right = 16, top = 18, bottom = 34;
  const innerW = w - left - right, innerH = h - top - bottom;
  const x = (i) => left + (trend.points.length <= 1 ? innerW / 2 : i / (trend.points.length - 1) * innerW);
  const y = (v) => top + innerH - (v / max) * innerH;
  const coords = trend.points.map((p, i) => [x(i), y(p.amount)]);
  const line = coords.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = `${line} L${coords.at(-1)?.[0] || left},${top + innerH} L${coords[0]?.[0] || left},${top + innerH} Z`;
  const grid = [0, .25, .5, .75, 1].map((ratio) => {
    const yy = top + innerH - ratio * innerH;
    return `<line x1="${left}" y1="${yy}" x2="${w-right}" y2="${yy}" class="finance-grid-line"/>`;
  }).join('');
  const labels = pickLabelIndexes(trend.points.length, 5).map((i) => `<text x="${x(i)}" y="${h-8}" text-anchor="middle" class="finance-axis-label">${escapeHtml(trend.points[i].label)}</text>`).join('');
  const maxIndex = values.indexOf(Math.max(...values));
  const maxPoint = coords[maxIndex] || [left, top + innerH];
  return `<div class="finance-trend-wrap"><svg class="finance-trend-svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="График расходов">${grid}<defs><linearGradient id="financeTrendFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--accent)" stop-opacity=".24"/><stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs><path d="${area}" fill="url(#financeTrendFill)"/><path d="${line}" class="finance-trend-line"/><circle cx="${maxPoint[0]}" cy="${maxPoint[1]}" r="4.5" class="finance-trend-dot"/>${labels}</svg><div class="finance-peak-label">Пик: <strong>${money(Math.max(...values, 0), settings)}</strong>${trend.points[maxIndex]?.label ? ` · ${escapeHtml(trend.points[maxIndex].label)}` : ''}</div></div>`;
}

function renderDonut(items, total, settings) {
  if (!items.length || !total) return '<div class="finance-empty-chart">Нет расходов за выбранный период</div>';
  const radius = 48, circumference = 2 * Math.PI * radius;
  let offset = 0;
  const circles = items.map((item, index) => {
    const share = item.amount / total;
    const dash = share * circumference;
    const html = `<circle cx="70" cy="70" r="${radius}" fill="none" stroke="${CHART_COLORS[index % CHART_COLORS.length]}" stroke-width="16" stroke-dasharray="${dash} ${circumference-dash}" stroke-dashoffset="${-offset}"/>`;
    offset += dash;
    return html;
  }).join('');
  const list = items.map((item, index) => `<div class="finance-legend-row"><i style="background:${CHART_COLORS[index % CHART_COLORS.length]}"></i><span>${escapeHtml(item.name)}</span><strong>${money(item.amount, settings)}</strong><small>${Math.round(item.amount/total*100)}%</small></div>`).join('');
  return `<div class="finance-donut-layout"><div class="finance-donut"><svg viewBox="0 0 140 140" aria-label="Структура расходов по категориям"><circle cx="70" cy="70" r="${radius}" fill="none" stroke="var(--border)" stroke-width="16"/>${circles}</svg><div><strong>${items.length}</strong><span>групп</span></div></div><div class="finance-legend">${list}</div></div>`;
}

function renderBars(items, total, settings) {
  if (!items.length) return '<div class="finance-empty-chart">Нет данных</div>';
  const max = Math.max(...items.map((x) => x.amount), 1);
  return `<div class="finance-bars">${items.map((item, index) => `<div class="finance-bar-row"><div class="finance-bar-label"><span>${escapeHtml(item.name)}</span><strong>${money(item.amount, settings)}</strong></div><div class="finance-bar-track"><i style="width:${Math.max(3, item.amount/max*100)}%;--bar-color:${CHART_COLORS[index % CHART_COLORS.length]}"></i></div><small>${total ? Math.round(item.amount/total*100) : 0}%</small></div>`).join('')}</div>`;
}

function renderWeekdays(items, settings) {
  const max = Math.max(...items.map((x) => x.amount), 1);
  return `<div class="finance-weekdays">${items.map((item, index) => `<div class="finance-weekday"><div class="finance-weekday-value">${item.amount ? compactMoney(item.amount, settings) : ''}</div><div class="finance-weekday-track"><i style="height:${item.amount ? Math.max(7, item.amount/max*100) : 2}%;--bar-color:${CHART_COLORS[index % CHART_COLORS.length]}"></i></div><span>${item.name}</span></div>`).join('')}</div>`;
}

function renderTopExpenses(items, settings) {
  if (!items.length) return '<div class="finance-empty-chart">Нет операций</div>';
  return `<div class="finance-top-list">${items.map((item, index) => `<div class="finance-top-row"><span class="finance-top-rank">${index + 1}</span><div><strong>${escapeHtml(item.description || item.category)}</strong><small>${prettyDate(item.dateMs)} · ${escapeHtml(item.category)} · ${escapeHtml(item.type)}</small></div><b>${money(item.amount, settings)}</b></div>`).join('')}</div>`;
}

function buildInsights(ctx) {
  const result = [];
  if (!ctx.rows.length) return ['За выбранный период расходов нет.'];
  if (ctx.delta != null && Math.abs(ctx.delta) >= 2) {
    result.push(`Расходы ${ctx.delta < 0 ? 'снизились' : 'выросли'} на ${Math.abs(ctx.delta).toLocaleString('ru-RU', { maximumFractionDigits: 1 })}% относительно предыдущего периода такой же длины.`);
  }
  const top = ctx.categories[0];
  if (top && ctx.total) result.push(`Главная категория — «${top.name}»: ${Math.round(top.amount / ctx.total * 100)}% всех расходов (${money(top.amount, ctx.settings)}).`);
  const top3 = ctx.categories.slice(0, 3).reduce((sum, item) => sum + item.amount, 0);
  if (ctx.categories.length >= 3 && ctx.total && top3 / ctx.total >= .5) result.push(`Три крупнейшие категории формируют ${Math.round(top3 / ctx.total * 100)}% расходов — бюджет заметно сконцентрирован.`);
  if (ctx.largest && ctx.total && ctx.largest.amount / ctx.total >= .12) result.push(`Крупнейшая операция — ${money(ctx.largest.amount, ctx.settings)} (${ctx.largest.description || ctx.largest.category}); это ${Math.round(ctx.largest.amount / ctx.total * 100)}% расходов периода.`);
  const busiest = [...ctx.weekday].sort((a, b) => b.amount - a.amount)[0];
  if (busiest?.amount) result.push(`Больше всего денег уходит в ${weekdayPhrase(busiest.name)} — ${money(busiest.amount, ctx.settings)} за выбранный период.`);
  if (ctx.days >= 7) {
    const zeroDays = Math.max(0, ctx.days - ctx.activeDays);
    result.push(`${ctx.activeDays} ${plural(ctx.activeDays, 'день', 'дня', 'дней')} с расходами и ${zeroDays} ${plural(zeroDays, 'день', 'дня', 'дней')} без операций.`);
  }
  return result.slice(0, 5);
}

function allExpenseRows(data) {
  const rows = [];
  for (const month of data?.months || []) {
    for (const expense of month.expenses || []) {
      const dateMs = Date.UTC(Number(month.year), Number(month.month) - 1, Number(expense.day));
      if (!Number.isFinite(dateMs)) continue;
      rows.push({ ...expense, amount: Number(expense.amount) || 0, year: month.year, month: month.month, monthId: month.id, dateMs });
    }
  }
  return rows;
}

function group(rows, key) {
  const map = new Map();
  rows.forEach((row) => map.set(row[key] || 'Без категории', (map.get(row[key] || 'Без категории') || 0) + row.amount));
  return [...map.entries()].map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name, 'ru'));
}

function collapseForDonut(items, maxItems) {
  if (items.length <= maxItems) return items;
  const main = items.slice(0, maxItems - 1);
  main.push({ name: 'Остальное', amount: items.slice(maxItems - 1).reduce((sum, x) => sum + x.amount, 0) });
  return main;
}

function weekdayTotals(rows) {
  const result = WEEKDAYS.map((name) => ({ name, amount: 0 }));
  for (const row of rows) {
    const jsDay = new Date(row.dateMs).getUTCDay();
    const index = jsDay === 0 ? 6 : jsDay - 1;
    result[index].amount += row.amount;
  }
  return result;
}

function readData() {
  try {
    const raw = localStorage.getItem(DATA_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn('Analytics: failed to read local data', error);
    return null;
  }
}

function latestKnownDate(data) {
  const rows = allExpenseRows(data);
  return rows.length ? Math.max(...rows.map((r) => r.dateMs)) : null;
}

function sum(rows) { return rows.reduce((value, row) => value + row.amount, 0); }
function utcToday() { const d = new Date(); return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()); }
function parseIsoDate(value) { if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return NaN; const [y,m,d] = value.split('-').map(Number); return Date.UTC(y,m-1,d); }
function isoDate(ms) { return new Date(ms).toISOString().slice(0, 10); }
function shortDate(ms) { const d = new Date(ms); return `${d.getUTCDate()} ${MONTH_NAMES_SHORT[d.getUTCMonth()]}`; }
function prettyDate(ms) { const d = new Date(ms); return `${d.getUTCDate()} ${MONTH_NAMES_SHORT[d.getUTCMonth()]} ${d.getUTCFullYear()}`; }
function pickLabelIndexes(length, maxLabels) { if (!length) return []; if (length <= maxLabels) return [...Array(length).keys()]; const result = new Set([0, length - 1]); for (let i=1;i<maxLabels-1;i++) result.add(Math.round(i*(length-1)/(maxLabels-1))); return [...result].sort((a,b)=>a-b); }
function plural(n, one, few, many) { const v = Math.abs(Number(n)) % 100, n1 = v % 10; if (v > 10 && v < 20) return many; if (n1 > 1 && n1 < 5) return few; if (n1 === 1) return one; return many; }
function weekdayPhrase(name) { return ({'Пн':'понедельник','Вт':'вторник','Ср':'среду','Чт':'четверг','Пт':'пятницу','Сб':'субботу','Вс':'воскресенье'})[name] || name; }

function money(value, settings) {
  const locale = settings?.locale || 'ru-RU', currency = settings?.currency || 'RUB';
  try { return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(value) || 0); }
  catch { return `${Math.round(Number(value) || 0).toLocaleString('ru-RU')} ₽`; }
}
function compactMoney(value, settings) {
  const amount = Number(value) || 0;
  if (amount >= 1000000) return `${(amount/1000000).toLocaleString('ru-RU',{maximumFractionDigits:1})}м`;
  if (amount >= 1000) return `${(amount/1000).toLocaleString('ru-RU',{maximumFractionDigits:0})}к`;
  return Math.round(amount).toLocaleString('ru-RU');
}
function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])); }
function showError(message) { const el = document.getElementById('finance-analytics-error'); if (!el) return; el.textContent = message || ''; el.hidden = !message; }

function installStyles() {
  if (document.getElementById('finance-analytics-style')) return;
  const style = document.createElement('style');
  style.id = 'finance-analytics-style';
  style.textContent = `
    .finance-analytics-open svg,.finance-analytics-nav svg,#finance-analytics-data-action svg{stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;fill:none}
    .finance-analytics-open svg{width:20px;height:20px}
    .finance-analytics-dialog{width:min(1180px,calc(100vw - 34px));max-width:none;height:min(900px,calc(100dvh - 34px));max-height:none;padding:0;border:1px solid var(--border);border-radius:22px;background:var(--surface);color:var(--text-primary);box-shadow:0 30px 90px rgba(0,0,0,.24);overflow:hidden}
    .finance-analytics-dialog::backdrop{background:rgba(18,20,18,.52);backdrop-filter:blur(4px)}
    .finance-analytics-shell{height:100%;overflow:auto;padding:0 24px 28px;background:var(--surface)}
    .finance-analytics-head{position:sticky;top:0;z-index:5;display:flex;align-items:flex-start;justify-content:space-between;gap:20px;padding:22px 0 16px;background:color-mix(in srgb,var(--surface) 94%,transparent);backdrop-filter:blur(16px);border-bottom:1px solid var(--border)}
    .finance-analytics-head h2{margin:2px 0 4px;font-size:24px;letter-spacing:-.03em}.finance-analytics-subtitle{margin:0;color:var(--text-secondary);font-size:12px;line-height:1.5}
    .finance-period-panel{display:grid;grid-template-columns:auto minmax(190px,1fr) auto;gap:14px;align-items:end;margin:20px 0 18px;padding:14px;border:1px solid var(--border);border-radius:16px;background:var(--surface-raised, var(--surface))}
    .finance-mode-switch{display:flex;padding:3px;background:var(--surface-hover);border-radius:11px;align-self:center}.finance-mode-switch button{border:0;border-radius:8px;padding:8px 12px;background:transparent;color:var(--text-secondary);font:inherit;font-size:12px;cursor:pointer}.finance-mode-switch button.is-active{background:var(--surface);color:var(--text-primary);box-shadow:0 1px 5px rgba(0,0,0,.08)}
    .finance-period-fields{display:flex;gap:10px;align-items:end;min-width:0}.finance-period-fields[hidden]{display:none}.finance-period-fields label{display:grid;gap:5px;min-width:0}.finance-period-fields label>span{font-size:10px;color:var(--text-secondary);font-weight:650}.finance-period-fields select,.finance-period-fields input{height:38px;min-height:38px;border:1px solid var(--border);border-radius:10px;background:var(--surface);color:var(--text-primary);font:inherit;font-size:13px;padding:0 10px;min-width:170px}.finance-period-fields input{min-width:145px}
    .finance-quick-ranges{display:flex;gap:6px;align-items:center}.finance-quick-ranges button{height:34px;border:1px solid var(--border);border-radius:999px;background:transparent;color:var(--text-secondary);font:inherit;font-size:10px;padding:0 10px;cursor:pointer}.finance-quick-ranges button:hover{background:var(--surface-hover);color:var(--text-primary)}.finance-run-button{height:40px;white-space:nowrap}
    .finance-analytics-error{padding:12px 14px;margin-bottom:14px;border-radius:12px;background:color-mix(in srgb,var(--negative) 10%,var(--surface));color:var(--negative);font-size:12px}.finance-analytics-content{display:grid;gap:14px}
    .finance-analytics-summary{display:grid;gap:12px}.finance-analytics-title-row{display:flex;justify-content:space-between;gap:18px;align-items:end}.finance-analytics-title-row>div{display:grid;gap:2px}.finance-analytics-title-row span{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-tertiary);font-weight:700}.finance-analytics-title-row strong{font-size:18px;letter-spacing:-.02em}.finance-period-badge{padding:6px 9px;border:1px solid var(--border);border-radius:999px;background:var(--surface-hover);font-size:9px!important;white-space:nowrap}
    .finance-kpi-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border:1px solid var(--border);border-radius:16px;overflow:hidden}.finance-kpi{display:grid;gap:5px;padding:16px 17px;min-width:0;background:var(--surface)}.finance-kpi+.finance-kpi{border-left:1px solid var(--border)}.finance-kpi>span{font-size:10px;color:var(--text-secondary);font-weight:650}.finance-kpi>strong{font-size:21px;letter-spacing:-.035em;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.finance-kpi>small{font-size:10px;color:var(--text-tertiary);line-height:1.35;min-height:14px}
    .finance-analytics-grid{display:grid;gap:14px}.finance-analytics-grid-main{grid-template-columns:minmax(0,1.55fr) minmax(330px,.8fr)}.finance-analytics-grid-secondary,.finance-analytics-grid-bottom{grid-template-columns:1fr 1fr}.finance-analytics-card{min-width:0;padding:17px;border:1px solid var(--border);border-radius:16px;background:var(--surface)}.finance-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:12px}.finance-card-head>div:first-child{display:grid;gap:2px}.finance-card-head span{font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-tertiary);font-weight:700}.finance-card-head h3{margin:0;font-size:16px;letter-spacing:-.02em}.finance-card-head>small{font-size:10px;color:var(--text-tertiary)}.finance-card-stat{text-align:right;display:grid;gap:2px}.finance-card-stat strong{font-size:14px}.finance-card-stat small{font-size:9px;color:var(--text-tertiary)}
    .finance-trend-wrap{position:relative}.finance-trend-svg{display:block;width:100%;height:auto;min-height:230px}.finance-grid-line{stroke:var(--border);stroke-width:1}.finance-axis-label{fill:var(--text-tertiary);font-size:10px}.finance-trend-line{fill:none;stroke:var(--accent);stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round}.finance-trend-dot{fill:var(--surface);stroke:var(--accent);stroke-width:3}.finance-peak-label{position:absolute;right:8px;top:4px;padding:5px 8px;border:1px solid var(--border);border-radius:8px;background:color-mix(in srgb,var(--surface) 90%,transparent);font-size:9px;color:var(--text-secondary)}.finance-peak-label strong{color:var(--text-primary)}.finance-chart-footer{display:flex;justify-content:space-between;gap:12px;color:var(--text-tertiary);font-size:9px;margin-top:-4px}.finance-chart-footer span:nth-child(2){text-align:center}
    .finance-donut-layout{display:grid;grid-template-columns:150px 1fr;gap:12px;align-items:center}.finance-donut{position:relative;width:140px;height:140px}.finance-donut svg{width:140px;height:140px;transform:rotate(-90deg)}.finance-donut>div{position:absolute;inset:0;display:grid;place-content:center;text-align:center;pointer-events:none}.finance-donut>div strong{font-size:22px}.finance-donut>div span{font-size:9px;color:var(--text-tertiary)}.finance-legend{display:grid;gap:8px;min-width:0}.finance-legend-row{display:grid;grid-template-columns:8px minmax(0,1fr) auto 28px;gap:7px;align-items:center;font-size:10px}.finance-legend-row i{width:7px;height:7px;border-radius:50%}.finance-legend-row span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.finance-legend-row strong{font-size:10px;font-weight:650}.finance-legend-row small{text-align:right;color:var(--text-tertiary);font-size:9px}
    .finance-bars{display:grid;gap:11px}.finance-bar-row{display:grid;grid-template-columns:minmax(0,1fr) 32px;gap:4px 10px}.finance-bar-label{grid-column:1/-1;display:flex;justify-content:space-between;gap:12px;font-size:10px}.finance-bar-label strong{font-weight:650}.finance-bar-track{height:7px;border-radius:999px;background:var(--surface-hover);overflow:hidden}.finance-bar-track i{display:block;height:100%;border-radius:inherit;background:var(--bar-color)}.finance-bar-row>small{text-align:right;font-size:9px;color:var(--text-tertiary)}
    .finance-weekdays{height:165px;display:grid;grid-template-columns:repeat(7,1fr);gap:8px;align-items:end;padding-top:6px}.finance-weekday{height:100%;display:grid;grid-template-rows:18px 1fr 18px;gap:4px;text-align:center}.finance-weekday-value{font-size:8px;color:var(--text-tertiary);align-self:end}.finance-weekday-track{height:100%;display:flex;align-items:end;justify-content:center;border-bottom:1px solid var(--border)}.finance-weekday-track i{display:block;width:min(28px,70%);border-radius:5px 5px 2px 2px;background:var(--bar-color)}.finance-weekday>span{font-size:9px;color:var(--text-secondary)}
    .finance-observations{display:grid;gap:10px}.finance-observations>div{display:grid;grid-template-columns:8px 1fr;gap:9px;align-items:start}.finance-observations i{width:6px;height:6px;margin-top:5px;border-radius:50%;background:var(--accent)}.finance-observations p{margin:0;font-size:11px;line-height:1.5;color:var(--text-secondary)}
    .finance-top-list{display:grid}.finance-top-row{display:grid;grid-template-columns:24px minmax(0,1fr) auto;gap:9px;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)}.finance-top-row:last-child{border-bottom:0}.finance-top-rank{display:grid;place-items:center;width:22px;height:22px;border-radius:7px;background:var(--surface-hover);font-size:9px;color:var(--text-tertiary)}.finance-top-row>div{display:grid;gap:2px;min-width:0}.finance-top-row strong{font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.finance-top-row small{font-size:8px;color:var(--text-tertiary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.finance-top-row b{font-size:10px;font-weight:650;white-space:nowrap}.finance-empty-chart{display:grid;place-items:center;min-height:130px;color:var(--text-tertiary);font-size:11px}
    html.finance-decoy-active #finance-analytics-open,html.finance-decoy-active #finance-analytics-nav,html.finance-decoy-active #finance-analytics-data-action{opacity:.3;pointer-events:none}
    @media(max-width:900px){.finance-analytics-dialog{width:calc(100vw - 20px);height:calc(100dvh - 20px)}.finance-period-panel{grid-template-columns:1fr auto}.finance-mode-switch{grid-column:1/-1;width:max-content}.finance-period-fields{flex-wrap:wrap}.finance-analytics-grid-main{grid-template-columns:1fr}.finance-analytics-grid-secondary,.finance-analytics-grid-bottom{grid-template-columns:1fr}.finance-kpi-grid{grid-template-columns:1fr 1fr}.finance-kpi:nth-child(3){border-left:0;border-top:1px solid var(--border)}.finance-kpi:nth-child(4){border-top:1px solid var(--border)}}
    @media(max-width:700px){.finance-analytics-dialog{inset:0;width:100vw;height:100dvh;max-width:none;max-height:none;margin:0;border:0;border-radius:0}.finance-analytics-shell{padding:0 14px max(24px,env(safe-area-inset-bottom))}.finance-analytics-head{padding-top:max(18px,env(safe-area-inset-top));align-items:center}.finance-analytics-head h2{font-size:21px}.finance-analytics-subtitle{display:none}.finance-period-panel{grid-template-columns:1fr;margin:14px 0;padding:11px;gap:10px}.finance-mode-switch{grid-column:auto;width:100%}.finance-mode-switch button{flex:1}.finance-period-fields{display:grid;grid-template-columns:1fr 1fr;gap:8px}.finance-period-fields[data-period-fields="month"]{grid-template-columns:1fr}.finance-period-fields select,.finance-period-fields input{width:100%;min-width:0;height:44px;font-size:16px}.finance-quick-ranges{grid-column:1/-1;overflow-x:auto;padding-bottom:1px}.finance-quick-ranges button{flex:0 0 auto}.finance-run-button{width:100%;height:44px}.finance-analytics-title-row{align-items:center}.finance-analytics-title-row strong{font-size:16px}.finance-kpi-grid{grid-template-columns:1fr 1fr}.finance-kpi{padding:13px}.finance-kpi>strong{font-size:18px}.finance-analytics-card{padding:14px}.finance-trend-svg{min-height:190px}.finance-chart-footer span:nth-child(2){display:none}.finance-donut-layout{grid-template-columns:128px 1fr}.finance-donut,.finance-donut svg{width:122px;height:122px}.finance-weekdays{gap:5px}.finance-weekday-track i{width:70%}.finance-analytics-open{width:42px;height:42px}}
    @media(max-width:420px){.finance-kpi-grid{grid-template-columns:1fr}.finance-kpi+.finance-kpi{border-left:0;border-top:1px solid var(--border)}.finance-donut-layout{grid-template-columns:1fr}.finance-donut{margin:0 auto}.finance-legend-row{grid-template-columns:8px minmax(0,1fr) auto 28px}.finance-analytics-title-row{align-items:flex-start}.finance-period-badge{display:none}}
  `;
  document.head.append(style);
}
