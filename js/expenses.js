import { daysInMonth, monthId, monthName, normalizeText, uid } from './utils.js';

export function emptyData() {
  return {
    version: 1,
    settings: { currency: 'RUB', locale: 'ru-RU' },
    categories: [],
    types: ['Личный', 'Семейный', 'Жена'],
    capitalSources: [],
    months: [],
  };
}

export function migrateData(input) {
  if (!input || typeof input !== 'object') throw new Error('JSON должен содержать объект.');
  const version = Number(input.version ?? 1);
  if (version !== 1) throw new Error(`Неподдерживаемая версия JSON: ${version}.`);
  return validateData(input);
}

export function validateData(input) {
  const data = emptyData();
  data.version = 1;
  data.settings = {
    currency: normalizeText(input.settings?.currency) || 'RUB',
    locale: normalizeText(input.settings?.locale) || 'ru-RU',
  };
  data.categories = uniqueStrings(input.categories || []);
  data.types = uniqueStrings(input.types || []);
  data.capitalSources = validateCapitalSources(input.capitalSources);
  if (!Array.isArray(input.months)) throw new Error('Поле months должно быть массивом.');
  data.months = input.months.map(validateMonth);

  for (const month of data.months) {
    for (const expense of month.expenses) {
      if (!data.categories.includes(expense.category)) data.categories.push(expense.category);
      if (!data.types.includes(expense.type)) data.types.push(expense.type);
    }
  }
  data.months.sort((a, b) => b.id.localeCompare(a.id));
  return data;
}

function validateMonth(month) {
  const year = Number(month.year);
  const m = Number(month.month);
  if (!Number.isInteger(year) || year < 1900 || year > 2200) throw new Error('Некорректный год месяца.');
  if (!Number.isInteger(m) || m < 1 || m > 12) throw new Error('Некорректный номер месяца.');

  const legacyIncome = Number(month.income ?? 0);
  if (!Number.isFinite(legacyIncome) || legacyIncome < 0) throw new Error(`Некорректный доход в ${monthName(year, m)}.`);
  const incomeSources = validateIncomeSources(month.incomeSources, legacyIncome, year, m);
  const income = incomeSources.reduce((sum, source) => sum + source.amount, 0);
  const expenses = Array.isArray(month.expenses) ? month.expenses.map((e) => validateExpense(e, year, m)) : [];
  return {
    id: monthId(year, m),
    year,
    month: m,
    name: monthName(year, m),
    incomeSources,
    income,
    incomeNote: normalizeText(month.incomeNote),
    expenses,
  };
}

function validateIncomeSources(value, legacyIncome, year, month) {
  const rawSources = Array.isArray(value) && value.length
    ? value
    : [{ name: 'Доход', amount: legacyIncome }];

  return rawSources.map((source, index) => {
    const amount = Number(source?.amount ?? 0);
    if (!Number.isFinite(amount) || amount < 0) {
      throw new Error(`Некорректная сумма источника дохода в ${monthName(year, month)}.`);
    }
    return {
      id: normalizeText(source?.id) || uid(),
      name: normalizeText(source?.name) || `Доход ${index + 1}`,
      amount,
    };
  });
}

function validateCapitalSources(value) {
  if (value == null) return [];
  if (!Array.isArray(value)) throw new Error('Поле capitalSources должно быть массивом.');
  return value.map((source, index) => {
    const owner = normalizeText(source?.owner);
    const name = normalizeText(source?.name);
    const amount = Number(source?.amount ?? 0);
    const currency = normalizeText(source?.currency) || '₽';
    if (!owner) throw new Error(`У источника капитала ${index + 1} отсутствует владелец.`);
    if (!name) throw new Error(`У источника капитала ${index + 1} отсутствует место хранения.`);
    if (!Number.isFinite(amount) || amount < 0) throw new Error(`Некорректная сумма источника капитала ${index + 1}.`);
    return {
      id: normalizeText(source?.id) || uid(),
      owner,
      name,
      amount,
      currency,
    };
  });
}

function validateExpense(expense, year, month) {
  const day = Number(expense.day);
  const amount = Number(expense.amount);
  const category = normalizeText(expense.category);
  const type = normalizeText(expense.type);
  if (!Number.isInteger(day) || day < 1 || day > daysInMonth(year, month)) throw new Error(`Некорректный день: ${expense.day}.`);
  if (!category) throw new Error('У расхода отсутствует категория.');
  if (!type) throw new Error('У расхода отсутствует тип.');
  if (!Number.isFinite(amount) || amount <= 0) throw new Error(`Некорректная сумма: ${expense.amount}.`);
  return {
    id: normalizeText(expense.id) || uid(),
    day,
    category,
    description: normalizeText(expense.description),
    amount,
    type,
  };
}

export function uniqueStrings(values) {
  const result = [];
  for (const value of values) {
    const s = normalizeText(value);
    if (s && !result.includes(s)) result.push(s);
  }
  return result;
}

export function createMonth(data, { year, month, income = 0, incomeSources = null, incomeNote = '' }) {
  const id = monthId(Number(year), Number(month));
  if (data.months.some((m) => m.id === id)) throw new Error('Такой месяц уже существует.');
  const item = validateMonth({
    year: Number(year),
    month: Number(month),
    income: Number(income) || 0,
    incomeSources,
    incomeNote,
    expenses: [],
  });
  data.months.push(item);
  data.months.sort((a, b) => b.id.localeCompare(a.id));
  return item;
}

export function addExpense(data, month, expense) {
  const item = validateExpense({ ...expense, id: uid() }, month.year, month.month);
  month.expenses.push(item);
  if (!data.categories.includes(item.category)) data.categories.push(item.category);
  if (!data.types.includes(item.type)) data.types.push(item.type);
  return item;
}

export function updateExpense(data, month, id, patch) {
  const index = month.expenses.findIndex((e) => e.id === id);
  if (index < 0) throw new Error('Расход не найден.');
  const updated = validateExpense({ ...month.expenses[index], ...patch, id }, month.year, month.month);
  month.expenses[index] = updated;
  if (!data.categories.includes(updated.category)) data.categories.push(updated.category);
  if (!data.types.includes(updated.type)) data.types.push(updated.type);
  return updated;
}

export function totals(month) {
  const total = month.expenses.reduce((sum, e) => sum + e.amount, 0);
  const byType = groupTotals(month.expenses, 'type');
  const byCategory = groupTotals(month.expenses, 'category');
  return { total, balance: month.income - total, byType, byCategory };
}

function groupTotals(expenses, key) {
  const map = new Map();
  for (const e of expenses) map.set(e[key], (map.get(e[key]) || 0) + e.amount);
  return [...map.entries()]
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name, 'ru'));
}

export function filterExpenses(expenses, filters) {
  let result = expenses.filter((e) => {
    const q = normalizeText(filters.search).toLocaleLowerCase('ru');
    return (!q || e.description.toLocaleLowerCase('ru').includes(q) || e.category.toLocaleLowerCase('ru').includes(q))
      && (!filters.category || e.category === filters.category)
      && (!filters.type || e.type === filters.type);
  });
  result = [...result].sort((a, b) => {
    if (filters.sort === 'amount-asc') return a.amount - b.amount;
    if (filters.sort === 'amount-desc') return b.amount - a.amount;
    if (filters.sort === 'day-desc') return b.day - a.day;
    return a.day - b.day;
  });
  return result;
}

export function mergeData(current, incoming) {
  const result = validateData(JSON.parse(JSON.stringify(current)));
  result.categories = uniqueStrings([...result.categories, ...incoming.categories]);
  result.types = uniqueStrings([...result.types, ...incoming.types]);

  const capitalById = new Map(result.capitalSources.map((source) => [source.id, source]));
  const capitalSignatures = new Set(result.capitalSources.map(capitalSourceSignature));
  for (const source of incoming.capitalSources || []) {
    if (source.id && capitalById.has(source.id)) {
      Object.assign(capitalById.get(source.id), JSON.parse(JSON.stringify(source)));
      continue;
    }
    const signature = capitalSourceSignature(source);
    if (!capitalSignatures.has(signature)) {
      const copy = { ...source, id: source.id || uid() };
      result.capitalSources.push(copy);
      capitalSignatures.add(signature);
    }
  }

  for (const incomingMonth of incoming.months) {
    const existing = result.months.find((m) => m.id === incomingMonth.id);
    if (!existing) {
      result.months.push(JSON.parse(JSON.stringify(incomingMonth)));
      continue;
    }
    const signatures = new Set(existing.expenses.map(expenseSignature));
    for (const expense of incomingMonth.expenses) {
      const sig = expenseSignature(expense);
      if (!signatures.has(sig)) {
        existing.expenses.push({ ...expense, id: uid() });
        signatures.add(sig);
      }
    }
    const existingIsLegacyIncome = existing.incomeSources?.length === 1
      && ['Доход', 'Основной доход'].includes(existing.incomeSources[0].name);
    const incomingHasDetailedIncome = incomingMonth.incomeSources?.length > 1
      || (incomingMonth.incomeSources?.length === 1
        && !['Доход', 'Основной доход'].includes(incomingMonth.incomeSources[0].name));
    if ((!existing.income && incomingMonth.income)
      || (existingIsLegacyIncome && incomingHasDetailedIncome && existing.income === incomingMonth.income)) {
      existing.incomeSources = JSON.parse(JSON.stringify(incomingMonth.incomeSources));
      existing.income = incomingMonth.income;
    }
    if (!existing.incomeNote && incomingMonth.incomeNote) existing.incomeNote = incomingMonth.incomeNote;
  }
  result.months.sort((a, b) => b.id.localeCompare(a.id));
  return result;
}

function capitalSourceSignature(source) {
  return [
    normalizeText(source.owner).toLocaleLowerCase('ru'),
    normalizeText(source.name).toLocaleLowerCase('ru'),
    Number(source.amount || 0).toFixed(2),
    normalizeText(source.currency) || '₽',
  ].join('|');
}

export function expenseSignature(e) {
  return [e.day, e.category.trim().toLocaleLowerCase('ru'), e.description.trim().toLocaleLowerCase('ru'), Number(e.amount).toFixed(2), e.type.trim().toLocaleLowerCase('ru')].join('|');
}
