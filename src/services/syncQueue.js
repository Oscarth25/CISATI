/**
 * Cola de sincronización offline → Supabase
 * + Detección y resolución de conflictos de datos (updated_at)
 *
 * Estrategias:
 *  - server-wins (default): si el servidor tiene una versión más nueva, se descarta el cambio local
 *  - client-wins: fuerza la escritura local sobre el servidor
 */

import {
  dbUpsert, dbPatch, dbDelete, dbSelectOne,
  isConfigured, isOnline, withRetry, formatError,
} from './supabase';

const STORAGE_KEY = 'cisa_sync_queue';
const CONFLICTS_KEY = 'cisa_sync_conflicts';
const MAX_ITEMS = 200;
const MAX_CONFLICT_LOG = 50;

/** Estrategia global: 'server-wins' | 'client-wins' */
let resolveStrategy = localStorage.getItem('cisa_conflict_strategy') || 'server-wins';

export function getConflictStrategy() {
  return resolveStrategy;
}

export function setConflictStrategy(strategy) {
  if (strategy !== 'server-wins' && strategy !== 'client-wins') return;
  resolveStrategy = strategy;
  localStorage.setItem('cisa_conflict_strategy', strategy);
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function save(queue) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue.slice(-MAX_ITEMS)));
}

function loadConflicts() {
  try {
    const raw = localStorage.getItem(CONFLICTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function pushConflict(entry) {
  const list = loadConflicts();
  list.unshift({
    ...entry,
    at: new Date().toISOString(),
  });
  localStorage.setItem(CONFLICTS_KEY, JSON.stringify(list.slice(0, MAX_CONFLICT_LOG)));
}

export function getConflicts() {
  return loadConflicts();
}

export function clearConflicts() {
  localStorage.removeItem(CONFLICTS_KEY);
}

export function getQueue() {
  return load();
}

export function queueLength() {
  return load().length;
}

export function clearQueue() {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Compara timestamps ISO. true si server es más nuevo que base.
 */
function serverIsNewer(serverTs, baseTs) {
  if (!serverTs) return false;
  if (!baseTs) return true; // no teníamos versión local conocida → asumir posible conflicto si existe en server
  const s = Date.parse(serverTs);
  const b = Date.parse(baseTs);
  if (Number.isNaN(s)) return false;
  if (Number.isNaN(b)) return true;
  // margen de 1s para relojes desfasados
  return s > b + 1000;
}

/**
 * Encola operación. Incluye baseUpdatedAt para detectar conflictos al hacer flush.
 */
export function enqueue(item) {
  const queue = load();
  const entry = {
    id: item.id || `q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    op: item.op,
    table: item.table,
    row: item.row,
    col: item.col,
    val: item.val,
    data: item.data,
    /** updated_at que conocía el cliente al editar (para optimistic locking) */
    baseUpdatedAt: item.baseUpdatedAt || item.row?.updated_at || null,
    createdAt: item.createdAt || new Date().toISOString(),
    attempts: 0,
    lastError: null,
  };

  if (entry.op === 'upsert' && entry.row?.id) {
    const idx = queue.findIndex(
      (q) => q.op === 'upsert' && q.table === entry.table && q.row?.id === entry.row.id
    );
    if (idx >= 0) {
      queue[idx] = {
        ...entry,
        attempts: queue[idx].attempts,
        // conservar el base más antiguo (primera lectura)
        baseUpdatedAt: queue[idx].baseUpdatedAt || entry.baseUpdatedAt,
      };
      save(queue);
      return entry.id;
    }
  }

  if (entry.op === 'patch' && entry.val) {
    const idx = queue.findIndex(
      (q) => q.op === 'patch' && q.table === entry.table && q.col === entry.col && q.val === entry.val
    );
    if (idx >= 0) {
      queue[idx] = {
        ...entry,
        data: { ...(queue[idx].data || {}), ...(entry.data || {}) },
        attempts: queue[idx].attempts,
        baseUpdatedAt: queue[idx].baseUpdatedAt || entry.baseUpdatedAt,
      };
      save(queue);
      return entry.id;
    }
  }

  queue.push(entry);
  save(queue);
  return entry.id;
}

/**
 * Resuelve conflicto: devuelve 'apply' | 'skip'
 */
async function resolveConflict(item, serverRow) {
  const strategy = resolveStrategy;
  const conflictInfo = {
    table: item.table,
    op: item.op,
    key: item.val || item.row?.id || item.row?.codigo,
    strategy,
    serverUpdatedAt: serverRow?.updated_at || null,
    baseUpdatedAt: item.baseUpdatedAt || null,
    localData: item.data || item.row || null,
  };

  if (strategy === 'client-wins') {
    pushConflict({ ...conflictInfo, resolution: 'client-wins' });
    return 'apply';
  }

  // server-wins
  pushConflict({ ...conflictInfo, resolution: 'server-wins' });
  return 'skip';
}

/**
 * Ejecuta un ítem con chequeo de conflicto previo (excepto activities).
 */
async function executeItem(item) {
  const pkCol = item.col || (item.row?.id != null ? 'id' : item.row?.codigo != null ? 'codigo' : null);
  const pkVal = item.val || item.row?.id || item.row?.codigo;

  // Tablas sin conflicto estricto
  const skipConflictCheck = item.table === 'activities' || item.op === 'upsert' && !item.baseUpdatedAt && item.op !== 'patch';

  if (pkCol && pkVal && item.table !== 'activities') {
    let serverRow = null;
    try {
      serverRow = await dbSelectOne(item.table, pkCol, pkVal);
    } catch (_) {
      // si no se puede leer, intentar aplicar igual
      serverRow = null;
    }

    if (item.op === 'delete') {
      if (!serverRow) return; // ya no existe
      if (item.baseUpdatedAt && serverIsNewer(serverRow.updated_at, item.baseUpdatedAt)) {
        const decision = await resolveConflict(item, serverRow);
        if (decision === 'skip') {
          const err = new Error('Conflicto: el registro fue modificado en el servidor. Eliminación local descartada.');
          err.code = 'CONFLICT';
          err.retryable = false;
          err.conflict = true;
          throw err;
        }
      }
      await dbDelete(item.table, pkCol, pkVal);
      return;
    }

    if (item.op === 'patch') {
      if (!serverRow) {
        // no existe en servidor: no aplicar patch huérfano
        const err = new Error('El registro ya no existe en el servidor.');
        err.code = 'GONE';
        err.retryable = false;
        throw err;
      }
      if (serverIsNewer(serverRow.updated_at, item.baseUpdatedAt)) {
        const decision = await resolveConflict(item, serverRow);
        if (decision === 'skip') {
          const err = new Error(
            `Conflicto en ${item.table}: el servidor tiene una versión más reciente. Cambio local descartado (server-wins).`
          );
          err.code = 'CONFLICT';
          err.retryable = false;
          err.conflict = true;
          throw err;
        }
      }
      const payload = {
        ...item.data,
        updated_at: new Date().toISOString(),
      };
      await dbPatch(item.table, item.col, item.val, payload);
      return;
    }

    if (item.op === 'upsert') {
      if (serverRow && item.baseUpdatedAt && serverIsNewer(serverRow.updated_at, item.baseUpdatedAt)) {
        const decision = await resolveConflict(item, serverRow);
        if (decision === 'skip') {
          const err = new Error(
            `Conflicto en ${item.table}: versión del servidor más nueva. Upsert local descartado.`
          );
          err.code = 'CONFLICT';
          err.retryable = false;
          err.conflict = true;
          throw err;
        }
      }
      const row = {
        ...item.row,
        updated_at: new Date().toISOString(),
      };
      await dbUpsert(item.table, row);
      return;
    }
  }

  // Fallback sin chequeo
  if (item.op === 'upsert') {
    await dbUpsert(item.table, {
      ...item.row,
      updated_at: new Date().toISOString(),
    });
  } else if (item.op === 'patch') {
    await dbPatch(item.table, item.col, item.val, {
      ...item.data,
      updated_at: new Date().toISOString(),
    });
  } else if (item.op === 'delete') {
    await dbDelete(item.table, item.col, item.val);
  } else {
    throw new Error('Operación desconocida: ' + item.op);
  }
}

/**
 * Procesa la cola. Devuelve { ok, failed, conflicts, remaining, errors }.
 */
export async function flushQueue(onProgress) {
  if (!isConfigured() || !isOnline()) {
    return { ok: 0, failed: 0, conflicts: 0, skipped: true, remaining: queueLength() };
  }

  let queue = load();
  if (!queue.length) {
    return { ok: 0, failed: 0, conflicts: 0, remaining: 0 };
  }

  const remaining = [];
  let ok = 0;
  let failed = 0;
  let conflicts = 0;
  const errors = [];

  for (const item of queue) {
    try {
      await withRetry(() => executeItem(item), { retries: 2, delayMs: 600 });
      ok++;
      onProgress?.(`Sincronizado: ${item.op} ${item.table}`, 'success');
    } catch (e) {
      const msg = formatError(e);
      if (e.conflict || e.code === 'CONFLICT') {
        conflicts++;
        // no reencolar conflictos resueltos como server-wins
        onProgress?.(msg, 'error');
        errors.push({ id: item.id, table: item.table, error: msg, conflict: true });
        continue;
      }
      if (e.code === 'GONE') {
        // registro desapareció: no reencolar
        conflicts++;
        onProgress?.(msg, 'error');
        errors.push({ id: item.id, table: item.table, error: msg, conflict: true });
        continue;
      }

      item.attempts = (item.attempts || 0) + 1;
      item.lastError = msg;
      if (item.attempts >= 5) {
        failed++;
        errors.push({ id: item.id, table: item.table, error: msg });
        onProgress?.(`Descartado tras 5 intentos: ${item.table} — ${msg}`, 'error');
      } else {
        remaining.push(item);
        failed++;
        errors.push({ id: item.id, table: item.table, error: msg });
      }
    }
  }

  save(remaining);
  return { ok, failed, conflicts, remaining: remaining.length, errors };
}

/**
 * Intenta servidor; si red falla → cola.
 * @returns {'synced' | 'queued' | 'local' | 'conflict'}
 */
export async function syncOrQueue(item) {
  if (!isConfigured()) {
    return 'local';
  }
  if (!isOnline()) {
    enqueue(item);
    return 'queued';
  }
  try {
    await withRetry(() => executeItem(item), { retries: 1, delayMs: 500 });
    return 'synced';
  } catch (e) {
    if (e.conflict || e.code === 'CONFLICT' || e.code === 'GONE') {
      return 'conflict';
    }
    const retryable = e?.retryable !== false;
    if (retryable) {
      enqueue(item);
      return 'queued';
    }
    throw e;
  }
}
