const ROW_ID = 1;
const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store, max-age=0',
};

export async function onRequestGet(context) {
  const blocked = apiGuard(context);
  if (blocked) return blocked;

  try {
    const row = await context.env.DB
      .prepare('SELECT data, updated_at FROM app_data WHERE id = ?1')
      .bind(ROW_ID)
      .first();

    if (!row) {
      return json({ code: 'EMPTY_DATABASE', message: 'Cloudflare D1 пока не содержит данных.' }, 404);
    }

    let data;
    try { data = JSON.parse(row.data); }
    catch { return json({ code: 'INVALID_DATABASE_JSON', message: 'В D1 сохранен некорректный JSON.' }, 500); }

    return json({ data, version: row.updated_at }, 200);
  } catch (error) {
    console.error('D1 GET failed', error);
    return json({ code: 'D1_READ_FAILED', message: 'Не удалось прочитать данные из Cloudflare D1.' }, 500);
  }
}

export async function onRequestPut(context) {
  const blocked = apiGuard(context);
  if (blocked) return blocked;

  let body;
  try { body = await context.request.json(); }
  catch { return json({ code: 'INVALID_JSON', message: 'Тело запроса должно быть JSON.' }, 400); }

  if (!body?.data || typeof body.data !== 'object' || Array.isArray(body.data)) {
    return json({ code: 'INVALID_DATA', message: 'Поле data должно содержать объект приложения.' }, 400);
  }

  // Минимальная серверная валидация формата. Полная миграция/валидация остается в клиенте.
  if (Number(body.data.version ?? 1) !== 1 || !Array.isArray(body.data.months)) {
    return json({ code: 'INVALID_APP_DATA', message: 'Неподдерживаемый формат данных приложения.' }, 400);
  }

  const expectedVersion = typeof body.expectedVersion === 'string' && body.expectedVersion
    ? body.expectedVersion
    : null;

  try {
    const current = await context.env.DB
      .prepare('SELECT data, updated_at FROM app_data WHERE id = ?1')
      .bind(ROW_ID)
      .first();

    if (current && (!expectedVersion || current.updated_at !== expectedVersion)) {
      let remoteData = null;
      try { remoteData = JSON.parse(current.data); } catch {}
      return json({
        code: 'VERSION_CONFLICT',
        message: 'Облачная версия изменилась. Сначала загрузите ее или выполните объединение.',
        version: current.updated_at,
        data: remoteData,
      }, 409);
    }

    const version = makeVersion();
    const serialized = JSON.stringify(body.data);

    if (current) {
      await context.env.DB
        .prepare('UPDATE app_data SET data = ?1, updated_at = ?2 WHERE id = ?3')
        .bind(serialized, version, ROW_ID)
        .run();
    } else {
      await context.env.DB
        .prepare('INSERT INTO app_data (id, data, updated_at) VALUES (?1, ?2, ?3)')
        .bind(ROW_ID, serialized, version)
        .run();
    }

    return json({ ok: true, version }, 200);
  } catch (error) {
    console.error('D1 PUT failed', error);
    return json({ code: 'D1_WRITE_FAILED', message: 'Не удалось сохранить данные в Cloudflare D1.' }, 500);
  }
}

export function onRequestOptions() {
  return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
}

function apiGuard(context) {
  if (context.data?.authenticated !== true) {
    return json({ code: 'UNAUTHORIZED', message: 'Требуется вход.' }, 401);
  }

  if (!context.env.DB) {
    return json({ code: 'D1_NOT_BOUND', message: 'Binding DB не настроен в Cloudflare Pages.' }, 500);
  }

  // Дополнительный предохранитель: API включаем только после настройки парольной защиты.
  if (context.env.D1_API_ENABLED !== '1') {
    return json({
      code: 'D1_API_DISABLED',
      message: 'D1 API выключен до завершения настройки защиты приложения.',
    }, 503);
  }

  return null;
}

function makeVersion() {
  return `${new Date().toISOString()}-${crypto.randomUUID()}`;
}

function json(payload, status) {
  return new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS });
}
