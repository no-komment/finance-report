import { addExpense, createMonth, filterExpenses, mergeData, migrateData, totals, updateExpense, uniqueStrings } from './expenses.js';
import { backupData, getGithubSettings, getTheme, loadInitialData, loadSeed, saveData, saveGithubSettings, setTheme } from './storage.js';
import { exportXlsx, importPreview, parseXlsxFile } from './xlsx.js';
import { fetchGithubData, pushGithubData } from './github-sync.js';
import { daysInMonth, downloadText, formatMoney, MONTH_NAMES, normalizeText, timestampFilePart } from './utils.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

let data;
let selectedMonthId = '';
let pendingImport = null;
let lastGithubSha = null;
let pendingRemoteConflict = null;
let toastTimer;

const filters = { search: '', category: '', type: '', sort: 'day-desc' };

init().catch((error) => fatal(error));

async function init() {
  populateMonthNumberOptions();
  bindEvents();
  applyTheme(getTheme());
  try {
    data = await loadInitialData();
  } catch (error) {
    if (location.protocol === 'file:') {
      throw new Error('Откройте сайт через локальный HTTP-сервер, например: python -m http.server 8000');
    }
    throw error;
  }
  selectedMonthId = data.months[0]?.id || '';
  renderAll();
  setSaved('Сохранено');
}

function bindEvents() {
  $('#month-select').addEventListener('change', (e) => { selectedMonthId = e.target.value; resetFilters(false); renderAll(); });
  $('#new-month-btn').addEventListener('click', () => openMonthDialog('create'));
  $('#edit-month-btn').addEventListener('click', () => openMonthDialog('edit'));
  $('#delete-month-btn').addEventListener('click', deleteSelectedMonth);
  $('#add-expense-btn').addEventListener('click', () => openExpenseDialog());
  $('#expense-form').addEventListener('submit', saveExpenseFromForm);
  $('#expense-amount').addEventListener('input', updateAmountPreview);
  $('#month-form').addEventListener('submit', saveMonthFromForm);
  $('#reference-form').addEventListener('submit', saveReferenceFromForm);
  $('#search-input').addEventListener('input', (e) => { filters.search = e.target.value; renderExpenses(); });
  $('#category-filter').addEventListener('change', (e) => { filters.category = e.target.value; renderExpenses(); });
  $('#type-filter').addEventListener('change', (e) => { filters.type = e.target.value; renderExpenses(); });
  $('#sort-select').addEventListener('change', (e) => { filters.sort = e.target.value; renderExpenses(); });
  $('#reset-filters-btn').addEventListener('click', () => resetFilters(true));
  $('#theme-btn').addEventListener('click', cycleTheme);
  $('#xlsx-input').addEventListener('change', async (e) => { if (e.target.files[0]) await handleXlsxImport(e.target.files[0]); e.target.value=''; });
  $('#json-input').addEventListener('change', async (e) => { if (e.target.files[0]) await handleJsonImport(e.target.files[0]); e.target.value=''; });
  $('#import-merge-btn').addEventListener('click', () => applyImport('merge'));
  $('#import-replace-btn').addEventListener('click', () => applyImport('replace'));
  $('#gh-load').addEventListener('click', githubLoad);
  $('#gh-push').addEventListener('click', githubPush);
  $('#gh-use-remote').addEventListener('click', useRemoteConflict);
  $('#gh-merge').addEventListener('click', mergeRemoteConflict);
  $('#gh-cancel-conflict').addEventListener('click', clearGithubConflict);

  document.addEventListener('click', handleDocumentClick);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') $$('dialog[open]').forEach(d => d.close()); });

  bindFileDrop();
}

function handleDocumentClick(e) {
  closeMenusOutside(e.target);

  const close = e.target.closest('[data-close]');
  if (close) document.getElementById(close.dataset.close)?.close();

  const monthButton = e.target.closest('[data-month-id]');
  if (monthButton) {
    selectedMonthId = monthButton.dataset.monthId;
    resetFilters(false);
    renderAll();
  }

  const filterChip = e.target.closest('[data-filter-clear]');
  if (filterChip) {
    const key = filterChip.dataset.filterClear;
    if (key in filters) filters[key] = key === 'sort' ? 'day-desc' : '';
    syncFilterControls();
    renderExpenses();
  }

  const actionTarget = e.target.closest('[data-action]');
  const action = actionTarget?.dataset.action;
  if (action && actionTarget?.closest('#data-dialog')) $('#data-dialog').close();
  if (action === 'import-xlsx') $('#xlsx-input').click();
  if (action === 'export-xlsx') safeAction(() => exportXlsx(data), 'XLSX экспортирован');
  if (action === 'import-json') $('#json-input').click();
  if (action === 'export-json') exportJson();
  if (action === 'references') { renderReferences(); $('#references-dialog').showModal(); }
  if (action === 'github') openGithubDialog();
  if (action === 'reset-seed') resetToSeed();
  if (action === 'create-first-month' || action === 'create-month') openMonthDialog('create');
  if (action === 'add-expense') openExpenseDialog();
  if (action === 'open-data-sheet') $('#data-dialog').showModal();
  if (action === 'cycle-theme') cycleTheme();

  if (action) {
    $$('details[open]').forEach((details) => details.removeAttribute('open'));
  }

  const edit = e.target.closest('[data-expense-edit]');
  if (edit) { openExpenseDialog(edit.dataset.expenseEdit); closeRowMenus(); }
  const del = e.target.closest('[data-expense-delete]');
  if (del) { deleteExpense(del.dataset.expenseDelete); closeRowMenus(); }

  const addRef = e.target.closest('[data-ref-add]');
  if (addRef) addReference(addRef.dataset.refAdd);
  const renameRef = e.target.closest('[data-ref-rename]');
  if (renameRef) renameReference(renameRef.dataset.refRename, renameRef.dataset.value);
  const deleteRef = e.target.closest('[data-ref-delete]');
  if (deleteRef) deleteReference(deleteRef.dataset.refDelete, deleteRef.dataset.value);
}

function renderAll() {
  renderMonthSelect();
  const month = getMonth();
  $('#empty-app').hidden = !!month;
  $('#month-content').hidden = !month;
  $('#edit-month-btn').disabled = !month;
  $('#delete-month-btn').disabled = !month;
  $('#add-expense-btn').disabled = !month;
  document.body.classList.toggle('has-month', !!month);
  if (!month) {
    $('#month-title').textContent = 'Расходы';
    $('#month-subtitle').textContent = 'Создайте первый месяц, чтобы начать учет';
    return;
  }
  renderStats();
  renderFilterOptions();
  syncFilterControls();
  renderExpenseFormOptions();
  renderExpenses();
}

function renderMonthSelect() {
  const select = $('#month-select');
  const list = $('#sidebar-months');
  select.replaceChildren();
  list.replaceChildren();
  if (!selectedMonthId && data.months[0]) selectedMonthId = data.months[0].id;

  for (const m of data.months) {
    select.add(new Option(m.name, m.id, false, m.id === selectedMonthId));

    const button = document.createElement('button');
    button.type = 'button';
    button.className = `month-item${m.id === selectedMonthId ? ' is-active' : ''}`;
    button.dataset.monthId = m.id;
    button.setAttribute('aria-current', m.id === selectedMonthId ? 'page' : 'false');
    const name = document.createElement('span'); name.textContent = m.name;
    const count = document.createElement('small'); count.textContent = String(m.expenses.length);
    button.append(name, count);
    list.append(button);
  }
  select.value = selectedMonthId;
}

function renderStats() {
  const month = getMonth();
  const t = totals(month);
  $('#month-title').textContent = month.name;
  $('#month-subtitle').textContent = month.incomeNote || `${month.expenses.length} ${pluralRows(month.expenses.length)} за месяц`;
  $('#stat-income').textContent = formatMoney(month.income, data.settings);
  $('#stat-expenses').textContent = formatMoney(t.total, data.settings);
  $('#stat-balance').textContent = formatMoney(t.balance, data.settings);
  $('#stat-balance').classList.toggle('is-negative', t.balance < 0);
  $('#stat-count').textContent = String(month.expenses.length);
  $('#income-note').textContent = month.incomeNote || '';

  const rawPercent = month.income > 0 ? (t.total / month.income) * 100 : (t.total > 0 ? 100 : 0);
  const shownPercent = Math.max(0, Math.round(rawPercent));
  const progress = $('#spent-progress');
  progress.style.width = `${Math.min(100, rawPercent)}%`;
  progress.classList.toggle('is-over', rawPercent > 100);
  progress.parentElement.setAttribute('aria-valuenow', String(Math.min(100, shownPercent)));
  progress.parentElement.setAttribute('role', 'progressbar');
  progress.parentElement.setAttribute('aria-valuemin', '0');
  progress.parentElement.setAttribute('aria-valuemax', '100');
  $('#spent-progress-label').textContent = month.income > 0 ? `Потрачено ${shownPercent}% дохода` : (t.total > 0 ? 'Доход не указан' : 'Расходов пока нет');
  renderPreviousComparison(month, t.total);

  renderBreakdown($('#by-type'), t.byType);
  renderBreakdown($('#by-category'), t.byCategory);
}

function renderPreviousComparison(month, currentTotal) {
  const previousDate = month.month === 1 ? { year: month.year - 1, month: 12 } : { year: month.year, month: month.month - 1 };
  const previousId = `${previousDate.year}-${String(previousDate.month).padStart(2, '0')}`;
  const previous = data.months.find((item) => item.id === previousId);
  const el = $('#previous-comparison');
  el.classList.remove('is-better', 'is-worse');
  if (!previous) { el.textContent = 'Нет предыдущего месяца'; return; }
  const previousTotal = totals(previous).total;
  if (!previousTotal) { el.textContent = `Нет расходов в ${MONTH_NAMES[previous.month - 1].toLocaleLowerCase('ru')}`; return; }
  const diff = ((currentTotal - previousTotal) / previousTotal) * 100;
  if (Math.abs(diff) < .05) { el.textContent = `Без изменений к ${MONTH_NAMES[previous.month - 1].toLocaleLowerCase('ru')}`; return; }
  const arrow = diff < 0 ? '↓' : '↑';
  el.textContent = `${arrow} ${Math.abs(diff).toLocaleString('ru-RU', { maximumFractionDigits: 1 })}% к ${MONTH_NAMES[previous.month - 1].toLocaleLowerCase('ru')}`;
  el.classList.add(diff < 0 ? 'is-better' : 'is-worse');
}

function renderBreakdown(container, items) {
  container.replaceChildren();
  if (!items.length) { container.textContent = 'Пока нет данных'; container.classList.add('muted'); return; }
  container.classList.remove('muted');
  const max = items[0]?.amount || 1;
  for (const item of items) {
    const row = document.createElement('div'); row.className = 'breakdown-row'; row.style.setProperty('--item-color', categoryColor(item.name));
    const name = document.createElement('span'); name.className = 'breakdown-name';
    const dot = document.createElement('i'); dot.className = 'category-dot'; dot.setAttribute('aria-hidden', 'true');
    const nameText = document.createElement('span'); nameText.textContent = item.name; name.append(dot, nameText);
    const bar = document.createElement('div'); bar.className = 'bar';
    const fill = document.createElement('i'); fill.style.width = `${Math.max(3, item.amount / max * 100)}%`; bar.append(fill);
    const amount = document.createElement('strong'); amount.textContent = formatMoney(item.amount, data.settings);
    row.append(name, bar, amount); container.append(row);
  }
}

function renderFilterOptions() {
  const month = getMonth();
  const categories = uniqueStrings([...data.categories, ...month.expenses.map(e => e.category)]).sort((a,b)=>a.localeCompare(b,'ru'));
  const types = uniqueStrings([...data.types, ...month.expenses.map(e => e.type)]);
  fillSelect($('#category-filter'), categories, filters.category, 'Все категории');
  fillSelect($('#type-filter'), types, filters.type, 'Все типы');
}

function renderExpenseFormOptions() {
  const month = getMonth();
  const categories = uniqueStrings([...data.categories, ...(month?.expenses.map(e => e.category) || [])]);
  const types = uniqueStrings([...data.types, ...(month?.expenses.map(e => e.type) || [])]);
  const datalist = $('#category-list'); datalist.replaceChildren();
  for (const item of categories) datalist.append(new Option(item, item));
  fillSelect($('#expense-type'), types, sessionStorage.getItem('expenses-app:last-type') || types[0] || '', null);
}

function renderExpenses() {
  const month = getMonth(); if (!month) return;
  const visible = filterExpenses(month.expenses, filters);
  const body = $('#expenses-body'); body.replaceChildren();
  const monthShort = MONTH_NAMES[month.month - 1].slice(0, 3).toLocaleLowerCase('ru');

  for (const expense of visible) {
    const tr = document.createElement('tr'); tr.className = 'expense-row';

    const day = document.createElement('td'); day.className = 'day-cell'; day.dataset.label = 'День';
    const dayNumber = document.createElement('span'); dayNumber.className = 'day-number'; dayNumber.textContent = String(expense.day);
    const dayMonth = document.createElement('span'); dayMonth.className = 'day-month'; dayMonth.textContent = monthShort;
    day.append(dayNumber, dayMonth);

    const category = document.createElement('td'); category.className = 'category-cell'; category.dataset.label = 'Категория';
    category.append(categoryMark(expense.category));

    const description = td(expense.description || expense.category, 'Описание'); description.className = 'expense-description-cell';
    const amount = td(formatMoney(expense.amount, data.settings), 'Сумма'); amount.className = 'money';
    const type = td(expense.type, 'Тип'); type.className = 'type-text';

    const actions = document.createElement('td'); actions.className = 'row-actions'; actions.dataset.label = 'Действия';
    const menu = document.createElement('details'); menu.className = 'row-menu';
    const summary = document.createElement('summary'); summary.textContent = '···'; summary.setAttribute('aria-label', `Действия: ${expense.description || expense.category}`);
    const panel = document.createElement('div'); panel.className = 'row-menu-panel';
    panel.append(actionButton('Изменить', 'data-expense-edit', expense.id), actionButton('Удалить', 'data-expense-delete', expense.id, 'delete'));
    menu.append(summary, panel); actions.append(menu);

    tr.append(day, category, description, amount, type, actions); body.append(tr);
  }

  const empty = $('#expenses-empty');
  empty.replaceChildren();
  empty.hidden = visible.length > 0;
  if (!visible.length) {
    const title = document.createElement('h3');
    const text = document.createElement('p');
    if (month.expenses.length === 0) {
      title.textContent = `В ${MONTH_NAMES[month.month - 1].toLocaleLowerCase('ru')} пока нет расходов`;
      text.textContent = 'Добавьте первую операцию, чтобы начать учет этого месяца.';
      const button = document.createElement('button'); button.type = 'button'; button.className = 'button primary'; button.dataset.action = 'add-expense'; button.textContent = 'Добавить расход';
      empty.append(title, text, button);
    } else {
      title.textContent = 'Ничего не найдено';
      text.textContent = 'Измените поиск или сбросьте активные фильтры.';
      empty.append(title, text);
    }
  }

  const sum = visible.reduce((s,e)=>s+e.amount,0);
  const filtered = visible.length !== month.expenses.length || filters.search || filters.category || filters.type;
  $('#filtered-total').textContent = filtered ? `${visible.length} · ${formatMoney(sum, data.settings)}` : `${month.expenses.length} ${pluralRows(month.expenses.length)}`;
  renderActiveFilters();
}

function renderActiveFilters() {
  const root = $('#active-filters'); root.replaceChildren();
  const chips = [];
  if (filters.search) chips.push(['search', `Поиск: ${filters.search}`]);
  if (filters.category) chips.push(['category', filters.category]);
  if (filters.type) chips.push(['type', filters.type]);
  if (filters.sort !== 'day-desc') {
    const labels = { 'day-desc':'Сначала поздние', 'amount-desc':'Сначала крупные', 'amount-asc':'Сначала мелкие' };
    chips.push(['sort', labels[filters.sort] || 'Сортировка']);
  }
  root.hidden = chips.length === 0;
  for (const [key, label] of chips) {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'filter-chip'; button.dataset.filterClear = key; button.textContent = label; root.append(button);
  }
}

function categoryMark(text) {
  const wrap = document.createElement('span'); wrap.className = 'category-mark'; wrap.style.setProperty('--item-color', categoryColor(text));
  const dot = document.createElement('i'); dot.className = 'category-dot'; dot.setAttribute('aria-hidden', 'true');
  const label = document.createElement('span'); label.textContent = text;
  wrap.append(dot, label); return wrap;
}

function categoryColor(value) {
  const palette = ['#79866d','#9a765f','#6d8193','#8a7896','#a18459','#657e78','#9b6d71','#7c8064'];
  let hash = 0;
  for (const char of String(value)) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
  return palette[Math.abs(hash) % palette.length];
}

function pluralRows(n) {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'строка';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'строки';
  return 'строк';
}

function closeRowMenus() { $$('.row-menu[open]').forEach((menu) => menu.removeAttribute('open')); }
function closeMenusOutside(target) {
  $$('details[open]').forEach((menu) => {
    if (!menu.contains(target)) menu.removeAttribute('open');
  });
}

function td(text, label='') { const el = document.createElement('td'); el.textContent = text; if (label) el.dataset.label = label; return el; }
function actionButton(text, attr, value, cls='') { const b=document.createElement('button'); b.type='button'; b.className=`row-action ${cls}`; b.textContent=text; b.setAttribute(attr,value); return b; }
function fillSelect(select, values, selected, emptyLabel) {
  select.replaceChildren();
  if (emptyLabel !== null) select.add(new Option(emptyLabel ?? '', ''));
  for (const v of values) select.add(new Option(v, v));
  select.value = values.includes(selected) || selected === '' ? selected : (emptyLabel !== null ? '' : values[0] || '');
}

function openExpenseDialog(id='') {
  const month = getMonth(); if (!month) return;
  renderExpenseFormOptions();
  const existing = id ? month.expenses.find(e=>e.id===id) : null;
  $('#expense-dialog-title').textContent = existing ? 'Изменить расход' : 'Добавить расход';
  $('#expense-id').value = existing?.id || '';
  $('#expense-day').max = daysInMonth(month.year, month.month);
  $('#expense-day').value = existing?.day || String(Math.min(new Date().getDate(), daysInMonth(month.year, month.month)));
  $('#expense-category').value = existing?.category || '';
  $('#expense-description').value = existing?.description || '';
  $('#expense-amount').value = existing?.amount || '';
  updateAmountPreview();
  const lastType = sessionStorage.getItem('expenses-app:last-type');
  $('#expense-type').value = existing?.type || (data.types.includes(lastType) ? lastType : data.types[0] || '');
  $('#expense-dialog').showModal();
  requestAnimationFrame(() => $('#expense-description').focus());
}

function saveExpenseFromForm(e) {
  e.preventDefault();
  const month = getMonth();
  try {
    const payload = {
      day: Number($('#expense-day').value),
      category: normalizeText($('#expense-category').value),
      description: normalizeText($('#expense-description').value),
      amount: parseAmountExpression($('#expense-amount').value),
      type: normalizeText($('#expense-type').value),
    };
    const id = $('#expense-id').value;
    if (id) updateExpense(data, month, id, payload); else addExpense(data, month, payload);
    sessionStorage.setItem('expenses-app:last-type', payload.type);
    persist(); $('#expense-dialog').close(); renderAll(); toast(id ? 'Расход изменен' : 'Расход добавлен');
  } catch (error) { toast(error.message); }
}

function updateAmountPreview() {
  const raw = $('#expense-amount').value.trim();
  const preview = $('#expense-amount-result');
  if (!raw) {
    preview.textContent = 'Можно считать: 2500+450, 1200*3';
    return;
  }
  try {
    const amount = parseAmountExpression(raw);
    preview.textContent = `= ${formatMoney(amount, data.settings)}`;
  } catch {
    preview.textContent = 'Продолжите выражение…';
  }
}

function parseAmountExpression(rawValue) {
  const source = String(rawValue ?? '')
    .trim()
    .replace(/\s+/g, '')
    .replace(/,/g, '.')
    .replace(/[−–—]/g, '-')
    .replace(/[×xхХ]/g, '*')
    .replace(/÷/g, '/');

  if (!source) throw new Error('Укажите сумму.');
  if (!/^[0-9+\-*/().]+$/.test(source)) {
    throw new Error('В сумме можно использовать цифры, +, −, ×, ÷ и скобки.');
  }

  let position = 0;

  function parseExpression() {
    let value = parseTerm();
    while (source[position] === '+' || source[position] === '-') {
      const operator = source[position++];
      const right = parseTerm();
      value = operator === '+' ? value + right : value - right;
    }
    return value;
  }

  function parseTerm() {
    let value = parseUnary();
    while (source[position] === '*' || source[position] === '/') {
      const operator = source[position++];
      const right = parseUnary();
      if (operator === '/' && right === 0) throw new Error('Деление на ноль невозможно.');
      value = operator === '*' ? value * right : value / right;
    }
    return value;
  }

  function parseUnary() {
    if (source[position] === '+') {
      position += 1;
      return parseUnary();
    }
    if (source[position] === '-') {
      position += 1;
      return -parseUnary();
    }
    return parsePrimary();
  }

  function parsePrimary() {
    if (source[position] === '(') {
      position += 1;
      const value = parseExpression();
      if (source[position] !== ')') throw new Error('Проверьте скобки в сумме.');
      position += 1;
      return value;
    }

    const match = source.slice(position).match(/^(?:\d+(?:\.\d*)?|\.\d+)/);
    if (!match) throw new Error('Проверьте выражение суммы.');
    position += match[0].length;
    return Number(match[0]);
  }

  const result = parseExpression();
  if (position !== source.length || !Number.isFinite(result)) {
    throw new Error('Проверьте выражение суммы.');
  }

  const rounded = Math.round((result + Number.EPSILON) * 100) / 100;
  if (!(rounded > 0)) throw new Error('Сумма должна быть больше нуля.');
  return rounded;
}

function deleteExpense(id) {
  const month = getMonth(); const item = month.expenses.find(e=>e.id===id); if (!item) return;
  if (!confirm(`Удалить расход «${item.description || item.category}» на ${formatMoney(item.amount, data.settings)}?`)) return;
  month.expenses = month.expenses.filter(e=>e.id!==id); persist(); renderAll(); toast('Расход удален');
}

function populateMonthNumberOptions() { MONTH_NAMES.forEach((name,i)=>$('#month-number').add(new Option(name,String(i+1)))); }

function openMonthDialog(mode) {
  const current = getMonth();
  $('#month-mode').value = mode;
  $('#month-dialog-title').textContent = mode === 'create' ? 'Новый месяц' : 'Изменить месяц';
  const creating = mode === 'create';
  $('#month-number-wrap').hidden = !creating; $('#month-year-wrap').hidden = !creating;
  const now = new Date();
  $('#month-number').value = String(creating ? now.getMonth()+1 : current.month);
  $('#month-year').value = String(creating ? now.getFullYear() : current.year);
  $('#month-income').value = creating ? '' : current.income;
  $('#month-note').value = creating ? '' : current.incomeNote;
  $('#month-dialog').showModal();
}

function saveMonthFromForm(e) {
  e.preventDefault();
  try {
    if ($('#month-mode').value === 'create') {
      const month = createMonth(data, { year:Number($('#month-year').value), month:Number($('#month-number').value), income:Number($('#month-income').value)||0, incomeNote:$('#month-note').value });
      selectedMonthId = month.id;
    } else {
      const month = getMonth(); month.income = Math.max(0, Number($('#month-income').value)||0); month.incomeNote = normalizeText($('#month-note').value);
    }
    persist(); $('#month-dialog').close(); renderAll(); toast('Месяц сохранен');
  } catch (error) { toast(error.message); }
}

function deleteSelectedMonth() {
  const month = getMonth(); if (!month) return;
  if (!confirm(`Удалить ${month.name}? Будет удалено строк расходов: ${month.expenses.length}.`)) return;
  data.months = data.months.filter(m=>m.id!==month.id); selectedMonthId = data.months[0]?.id || ''; persist(); renderAll(); toast('Месяц удален');
}

async function handleXlsxImport(file) {
  try { setSaved('Импорт XLSX…'); const incoming = await parseXlsxFile(file); showImportPreview(incoming, `Импорт XLSX: ${file.name}`); }
  catch (error) { toast(`Ошибка XLSX: ${error.message}`); }
  finally { setSaved('Сохранено'); }
}

async function handleJsonImport(file) {
  try {
    const text = await file.text(); const incoming = migrateData(JSON.parse(text)); showImportPreview(incoming, `Импорт JSON: ${file.name}`);
  } catch (error) { toast(`Ошибка JSON: ${error.message}`); }
}

function showImportPreview(incoming, title) {
  pendingImport = incoming; const p = importPreview(incoming); $('#import-title').textContent = title;
  const root=$('#import-preview'); root.replaceChildren();
  const summary=document.createElement('p'); summary.textContent=`Найдено месяцев: ${p.months.length}. Всего расходов: ${p.totalExpenses}.`; root.append(summary);
  const ul=document.createElement('ul'); for(const m of p.months){const li=document.createElement('li'); li.textContent=`${m.name} — ${m.count} расходов`; ul.append(li);} root.append(ul);
  const note=document.createElement('p'); note.className='notice'; note.textContent='При объединении совпадающие месяцы объединяются, а точные дубликаты расходов по дню/категории/описанию/сумме/типу не добавляются повторно.'; root.append(note);
  $('#import-dialog').showModal();
}

function applyImport(mode) {
  if (!pendingImport) return;
  backupData(data);
  data = mode === 'replace' ? pendingImport : mergeData(data, pendingImport);
  selectedMonthId = data.months[0]?.id || ''; persist(); pendingImport=null; $('#import-dialog').close(); renderAll(); toast(mode === 'replace' ? 'Данные заменены' : 'Данные объединены');
}

function exportJson() { downloadText(JSON.stringify(data,null,2), `expenses-backup-${timestampFilePart()}.json`); toast('JSON экспортирован'); }

async function resetToSeed() {
  if (!confirm('Сбросить локальные изменения и заново загрузить data/expenses.json? Перед сбросом будет сохранена резервная копия в localStorage.')) return;
  try { backupData(data); data=await loadSeed(); selectedMonthId=data.months[0]?.id||''; renderAll(); toast('Seed JSON загружен'); }
  catch(error){toast(error.message);}
}

function renderReferences() {
  renderRefList('categories', $('#categories-list'));
  renderRefList('types', $('#types-list'));
}
function renderRefList(kind, container) {
  container.replaceChildren();
  for (const value of data[kind]) {
    const row=document.createElement('div'); row.className='ref-row';
    const name=document.createElement('span'); name.className='ref-name'; name.style.setProperty('--item-color', categoryColor(value));
    if (kind === 'categories') { const dot=document.createElement('i'); dot.className='category-dot'; dot.setAttribute('aria-hidden','true'); name.append(dot); }
    const label=document.createElement('span'); label.textContent=value; name.append(label);
    const actions=document.createElement('div'); actions.className='ref-actions';
    const r=actionButton('Изменить','data-ref-rename',kind); r.dataset.value=value; r.setAttribute('aria-label',`Переименовать ${value}`);
    const d=actionButton('Удалить','data-ref-delete',kind,'delete'); d.dataset.value=value; d.setAttribute('aria-label',`Удалить ${value}`);
    actions.append(r,d); row.append(name,actions); container.append(row);
  }
}

function addReference(kind) {
  openReferenceDialog(kind);
}
function renameReference(kind, oldValue) {
  openReferenceDialog(kind, oldValue);
}
function openReferenceDialog(kind, oldValue='') {
  const isCategory = kind === 'categories';
  $('#reference-kind').value = kind;
  $('#reference-old-value').value = oldValue;
  $('#reference-dialog-title').textContent = oldValue ? `Изменить ${isCategory ? 'категорию' : 'тип'}` : `Новая ${isCategory ? 'категория' : 'тип'}`;
  $('#reference-value').value = oldValue;
  $('#reference-dialog').showModal();
  requestAnimationFrame(() => { $('#reference-value').focus(); $('#reference-value').select(); });
}
function saveReferenceFromForm(e) {
  e.preventDefault();
  const kind = $('#reference-kind').value;
  const oldValue = normalizeText($('#reference-old-value').value);
  const value = normalizeText($('#reference-value').value);
  if (!['categories','types'].includes(kind) || !value) return;
  if (data[kind].includes(value) && value !== oldValue) return toast('Такое значение уже существует.');
  if (!oldValue) {
    data[kind].push(value);
  } else if (value !== oldValue) {
    const expenseKey = kind === 'categories' ? 'category' : 'type';
    for (const month of data.months) for (const expense of month.expenses) if (expense[expenseKey] === oldValue) expense[expenseKey] = value;
    data[kind] = data[kind].map((item) => item === oldValue ? value : item);
  }
  persist();
  $('#reference-dialog').close();
  renderReferences();
  renderAll();
  toast(oldValue ? 'Справочник и старые строки обновлены' : 'Значение добавлено');
}

function deleteReference(kind, value) {
  const key=kind==='categories'?'category':'type'; const used=data.months.reduce((n,m)=>n+m.expenses.filter(e=>e[key]===value).length,0);
  const text=used?`«${value}» используется в ${used} строках. Удалить только из справочника? Старые строки останутся без изменений.`:`Удалить «${value}» из справочника?`;
  if(!confirm(text))return; data[kind]=data[kind].filter(v=>v!==value); persist(); renderReferences(); renderAll();
}

function openGithubDialog() {
  const s = getGithubSettings();
  const persistentToken = localStorage.getItem('expenses-app:gh-token:persistent') || '';
  const sessionToken = sessionStorage.getItem('expenses-app:gh-token') || '';

  $('#gh-owner').value = s.owner || '';
  $('#gh-repo').value = s.repo || '';
  $('#gh-branch').value = s.branch || 'main';
  $('#gh-path').value = s.path || 'data/expenses.json';
  $('#gh-token').value = sessionToken || persistentToken;
  $('#gh-remember-token').checked = Boolean(persistentToken);

  clearGithubConflict();
  $('#github-dialog').showModal();
}
function currentGithubSettings() { return { owner:normalizeText($('#gh-owner').value), repo:normalizeText($('#gh-repo').value), branch:normalizeText($('#gh-branch').value)||'main', path:normalizeText($('#gh-path').value)||'data/expenses.json' }; }
function saveGithubForm() {
  const s = currentGithubSettings();
  saveGithubSettings(s);

  const token = $('#gh-token').value.trim();
  const remember = $('#gh-remember-token').checked;

  if (token) sessionStorage.setItem('expenses-app:gh-token', token);
  else sessionStorage.removeItem('expenses-app:gh-token');

  if (remember && token) localStorage.setItem('expenses-app:gh-token:persistent', token);
  else localStorage.removeItem('expenses-app:gh-token:persistent');

  return { s, token };
}
async function githubLoad() {
  try { const {s,token}=saveGithubForm(); $('#gh-status').textContent='Загрузка…'; const remote=await fetchGithubData(s,token); data=migrateData(remote.data); lastGithubSha=remote.sha; selectedMonthId=data.months[0]?.id||''; persist(); renderAll(); $('#gh-status').textContent='Свежая версия загружена.'; toast('Данные загружены из GitHub'); }
  catch(error){$('#gh-status').textContent=error.message;}
}
async function githubPush() {
  try { const {s,token}=saveGithubForm(); $('#gh-status').textContent='Сохранение…'; const result=await pushGithubData(s,token,data,lastGithubSha); lastGithubSha=result.content?.sha||null; clearGithubConflict(); $('#gh-status').textContent='Изменения сохранены в GitHub.'; toast('GitHub Sync завершен'); }
  catch(error){ if(error.code==='SHA_CONFLICT'){pendingRemoteConflict=error.remote; $('#gh-conflict').hidden=false; $('#gh-status').textContent='Обнаружен конфликт версий.';} else $('#gh-status').textContent=error.message; }
}
function useRemoteConflict() { if(!pendingRemoteConflict)return; backupData(data); data=migrateData(pendingRemoteConflict.data); lastGithubSha=pendingRemoteConflict.sha; selectedMonthId=data.months[0]?.id||''; persist(); renderAll(); clearGithubConflict(); $('#gh-status').textContent='Загружена удаленная версия.'; }
function mergeRemoteConflict() { if(!pendingRemoteConflict)return; data=mergeData(migrateData(pendingRemoteConflict.data),data); lastGithubSha=pendingRemoteConflict.sha; persist(); renderAll(); clearGithubConflict(); $('#gh-status').textContent='Изменения объединены локально. Нажмите «Сохранить в GitHub» еще раз.'; }
function clearGithubConflict(){pendingRemoteConflict=null; $('#gh-conflict').hidden=true;}

function resetFilters(render=true){
  filters.search=''; filters.category=''; filters.type=''; filters.sort='day-desc';
  syncFilterControls();
  if(render) renderExpenses();
}
function syncFilterControls(){
  $('#search-input').value=filters.search;
  $('#category-filter').value=filters.category;
  $('#type-filter').value=filters.type;
  $('#sort-select').value=filters.sort;
}

function getMonth(){return data?.months.find(m=>m.id===selectedMonthId)||data?.months[0]||null;}
function persist(){saveData(data);setSaved('Сохранено');}
function setSaved(text){$('#save-status').textContent=text;}
function toast(message){clearTimeout(toastTimer);const el=$('#toast');el.textContent=message;el.hidden=false;toastTimer=setTimeout(()=>el.hidden=true,3200);}
function fatal(error){console.error(error);document.body.replaceChildren();const box=document.createElement('main');box.className='workspace';const card=document.createElement('section');card.className='empty-state app-empty';const h=document.createElement('h1');h.textContent='Не удалось запустить приложение';const p=document.createElement('p');p.textContent=error.message;card.append(h,p);box.append(card);document.body.append(box);}
function safeAction(fn,success){try{fn();toast(success);}catch(error){toast(error.message);}}
function bindFileDrop() {
  const overlay = $('#drop-overlay');
  let dragDepth = 0;

  // Chromium-based browsers (including Yandex) may otherwise navigate to a dropped file.
  // Prevent the browser default in capture phase; the overlay itself remains optional.
  document.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = hasDraggedFile(e) ? 'copy' : 'none';
  }, true);

  document.addEventListener('dragenter', (e) => {
    if (!hasDraggedFile(e)) return;
    e.preventDefault();
    dragDepth += 1;
    overlay.hidden = false;
  }, true);

  document.addEventListener('dragleave', (e) => {
    if (overlay.hidden) return;
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0 || e.relatedTarget === null) overlay.hidden = true;
  }, true);

  document.addEventListener('drop', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepth = 0;
    overlay.hidden = true;

    const files = [...(e.dataTransfer?.files || [])];
    if (!files.length) return;
    const file = files.find((item) => /\.xlsx?$/i.test(item.name));
    if (!file) { toast('Для импорта перетащите файл .xlsx или .xls'); return; }
    await handleXlsxImport(file);
  }, true);

  window.addEventListener('blur', () => { dragDepth = 0; overlay.hidden = true; });
}

function hasDraggedFile(e) {
  const transfer = e.dataTransfer;
  if (!transfer) return false;
  if (transfer.files?.length) return true;
  if ([...(transfer.items || [])].some((item) => item.kind === 'file')) return true;
  return [...(transfer.types || [])].some((type) => String(type).toLowerCase() === 'files');
}
function applyTheme(theme){
  document.documentElement.dataset.theme=theme==='auto'?'':theme;
  setTheme(theme);
  const labels={auto:'Авто',light:'Светлая',dark:'Темная'};
  $('#theme-btn').title=`Тема: ${labels[theme] || theme}`;
  $('#theme-btn').setAttribute('aria-label',`Тема: ${labels[theme] || theme}. Переключить`);
  const value=$('#theme-btn .theme-value'); if(value)value.textContent=labels[theme] || theme;
  const themeColor = theme === 'dark' ? '#151613' : '#f4f3ef';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColor);
}
function cycleTheme(){const order=['auto','light','dark'];const current=getTheme();const next=order[(order.indexOf(current)+1)%order.length];applyTheme(next);toast(`Тема: ${{auto:'авто',light:'светлая',dark:'темная'}[next]}`);}
