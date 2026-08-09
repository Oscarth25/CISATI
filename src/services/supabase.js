// Supabase REST helpers + manejo de errores de red

const DEFAULT_TIMEOUT_MS = 15000;

export class NetworkError extends Error {
  constructor(message, { status = 0, code = 'NETWORK', offline = false, retryable = true } = {}) {
    super(message);
    this.name = 'NetworkError';
    this.status = status;
    this.code = code;
    this.offline = offline;
    this.retryable = retryable;
  }
}

// Config de Supabase: prioridad a lo guardado manualmente en localStorage
// (pantalla de Configuración); si no hay nada guardado, cae a las variables
// de entorno VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY definidas en el build
// (Render → Environment). Así la app queda conectada desde el primer usuario
// sin que nadie tenga que configurarla a mano.
const ENV_URL = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const ENV_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const getConfig = () => {
  const url = (localStorage.getItem('cisa_supa_url') || '').replace(/\/$/, '');
  const key = localStorage.getItem('cisa_supa_key') || '';
  if (url && key) return { url, key };
  return { url: ENV_URL, key: ENV_KEY };
};

export function saveConfig(url, key) {
  localStorage.setItem('cisa_supa_url', url.replace(/\/$/, ''));
  localStorage.setItem('cisa_supa_key', key);
}

export function clearConfig() {
  localStorage.removeItem('cisa_supa_url');
  localStorage.removeItem('cisa_supa_key');
}

export function loadConfig() {
  return getConfig();
}

export function isConfigured() {
  const { url, key } = getConfig();
  return !!(url && key);
}

export function hasEnvDefault() {
  return !!(ENV_URL && ENV_KEY);
}

export function isOnline() {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}

/**
 * Caché local del estado completo de la app (equipos, recepciones, entregas,
 * devoluciones, empleados, usuarios, activities). Permite trabajar sin conexión
 * a Supabase y sobrevive a cierres inesperados de la app/navegador, ya que se
 * escribe en localStorage en cada cambio de estado (ver App.jsx).
 */
const LOCAL_CACHE_KEY = 'cisa_local_cache';

export function loadLocalCache() {
  try {
    const raw = localStorage.getItem(LOCAL_CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data && typeof data === 'object' ? data : null;
  } catch {
    return null;
  }
}

export function saveLocalCache(data) {
  try {
    localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(data));
  } catch (_) {
    // localStorage lleno o no disponible: no interrumpir la app
  }
}

function headers(extra = {}) {
  const { key } = getConfig();
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

/** Mensaje legible a partir de status / cuerpo */
function friendlyMessage(status, bodyText) {
  if (!status || status === 0) {
    return 'No se pudo conectar al servidor. Revisa tu internet o la URL de Supabase.';
  }
  if (status === 401 || status === 403) {
    return 'Credenciales inválidas (anon key). Verifica la clave en Configuración.';
  }
  if (status === 404) {
    return 'Recurso no encontrado. ¿Ejecutaste el SETUP.sql en Supabase?';
  }
  if (status === 409) {
    return 'Conflicto de datos (registro duplicado).';
  }
  if (status === 422) {
    return 'Datos inválidos enviados al servidor.';
  }
  if (status >= 500) {
    return 'Error del servidor Supabase (' + status + '). Intenta más tarde.';
  }
  // try parse JSON error from PostgREST
  try {
    const j = JSON.parse(bodyText);
    if (j.message) return j.message;
    if (j.error) return j.error;
    if (j.hint) return j.hint;
  } catch (_) {}
  if (bodyText && bodyText.length < 200) return bodyText;
  return `Error HTTP ${status}`;
}

/**
 * fetch con timeout y clasificación de errores de red
 */
async function request(pathOrUrl, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  if (!isOnline()) {
    throw new NetworkError('Sin conexión a internet. Trabajando en modo local.', {
      code: 'OFFLINE',
      offline: true,
      retryable: true,
    });
  }

  const { url, key } = getConfig();
  if (!url || !key) {
    throw new NetworkError('Supabase no configurado. Ve a Configuración.', {
      code: 'NOT_CONFIGURED',
      retryable: false,
    });
  }

  const fullUrl = pathOrUrl.startsWith('http') ? pathOrUrl : `${url}/rest/v1/${pathOrUrl}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(fullUrl, {
      ...options,
      signal: controller.signal,
      headers: {
        ...headers(options.headers || {}),
        ...(options.headers || {}),
      },
    });

    if (!res.ok) {
      const bodyText = await res.text().catch(() => '');
      const msg = friendlyMessage(res.status, bodyText);
      throw new NetworkError(msg, {
        status: res.status,
        code: 'HTTP_' + res.status,
        retryable: res.status >= 500 || res.status === 429,
      });
    }

    // 204 / empty
    if (res.status === 204) return null;
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      return res.json().catch(() => null);
    }
    return null;
  } catch (err) {
    if (err instanceof NetworkError) throw err;

    if (err.name === 'AbortError') {
      throw new NetworkError('Tiempo de espera agotado. El servidor no respondió a tiempo.', {
        code: 'TIMEOUT',
        retryable: true,
      });
    }

    // TypeError: Failed to fetch, CORS, DNS, etc.
    const offline = !isOnline();
    throw new NetworkError(
      offline
        ? 'Sin conexión a internet. Los cambios se guardarán solo en este equipo.'
        : 'Error de red: no se pudo alcanzar Supabase. Revisa URL, CORS o tu conexión.',
      {
        code: offline ? 'OFFLINE' : 'FETCH_FAILED',
        offline,
        retryable: true,
      }
    );
  } finally {
    clearTimeout(timer);
  }
}

/** Reintento simple con backoff */
export async function withRetry(fn, { retries = 2, delayMs = 800 } = {}) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const retryable = e instanceof NetworkError ? e.retryable : true;
      if (!retryable || i === retries) break;
      await new Promise(r => setTimeout(r, delayMs * (i + 1)));
    }
  }
  throw lastErr;
}


/** Obtiene un registro por columna = valor (o null) */
export async function dbSelectOne(table, col, val) {
  const rows = await dbSelect(
    `${table}?${col}=eq.${encodeURIComponent(val)}&select=*&limit=1`
  );
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

export async function dbSelect(path) {
  return request(path, { method: 'GET' });
}

export async function dbUpsert(table, row) {
  await request(table, {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(row),
  });
  return true;
}

export async function dbPatch(table, col, val, data) {
  await request(`${table}?${col}=eq.${encodeURIComponent(val)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify(data),
  });
  return true;
}

export async function dbDelete(table, col, val) {
  await request(`${table}?${col}=eq.${encodeURIComponent(val)}`, {
    method: 'DELETE',
  });
  return true;
}

export async function fetchAll() {
  const safe = (p, fallback = []) =>
    dbSelect(p).catch((e) => {
      // tablas opcionales no deben tumbar todo el sync
      if (e instanceof NetworkError && (e.status === 404 || e.code === 'HTTP_404')) return fallback;
      throw e;
    });

  const [equipos, recepciones, entregas, devoluciones, empleados, usuarios, activities] = await Promise.all([
    dbSelect('equipos?select=*&order=created_at.asc'),
    dbSelect('recepciones?select=*&order=created_at.asc'),
    dbSelect('entregas?select=*&order=created_at.asc'),
    safe('devoluciones?select=*&order=created_at.desc'),
    dbSelect('empleados?select=*&order=nombre.asc'),
    safe('usuarios?select=*'),
    safe('activities?select=*&order=created_at.desc&limit=60'),
  ]);

  return {
    equipos: Array.isArray(equipos) ? equipos : [],
    recepciones: Array.isArray(recepciones) ? recepciones : [],
    entregas: Array.isArray(entregas) ? entregas : [],
    devoluciones: Array.isArray(devoluciones) ? devoluciones : [],
    empleados: Array.isArray(empleados) ? empleados : [],
    usuarios: Array.isArray(usuarios) && usuarios.length ? usuarios : null,
    activities: Array.isArray(activities) ? activities : [],
  };
}

export async function testConnection() {
  const { url, key } = getConfig();
  if (!url || !key) throw new NetworkError('Configura URL y Key primero', { code: 'NOT_CONFIGURED', retryable: false });
  await request(`${url}/rest/v1/`, { method: 'GET' }, 10000);
  return true;
}

export function uuid() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2);
}

export function today() {
  return new Date().toISOString().split('T')[0];
}

export function timeNow() {
  return new Date().toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' });
}

/** Formatea cualquier error para mostrar al usuario */
export function formatError(err) {
  if (!err) return 'Error desconocido';
  if (err instanceof NetworkError) return err.message;
  if (err.message) return err.message;
  return String(err);
}
