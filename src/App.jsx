import { useState, useCallback, useEffect, useRef } from 'react';
import './App.css';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import ModalAgregarEquipo from './components/ModalAgregarEquipo';
import ModalRecepcion from './components/ModalRecepcion';
import ModalEntrega from './components/ModalEntrega';
import ModalAgregarUsuario from './components/ModalAgregarUsuario';
import ModalAgregarEmpleado from './components/ModalAgregarEmpleado';
import ModalCambiarEstado from './components/ModalCambiarEstado';
import ModalEditarEquipo from './components/ModalEditarEquipo';
import ModalDevolucion from './components/ModalDevolucion';
import Dashboard from './pages/Dashboard';
import Inventario from './pages/Inventario';
import Recepciones from './pages/Recepciones';
import Entregas from './pages/Entregas';
import Reportes from './pages/Reportes';
import Configuracion from './pages/Configuracion';
import { DEFAULT_USUARIOS, PAGE_TITLES } from './services/constants';
import {
  loadConfig, clearConfig, isConfigured, fetchAll, dbUpsert, dbPatch, dbDelete,
  uuid, today, timeNow, formatError, withRetry, isOnline, NetworkError,
  loadLocalCache, saveLocalCache,
} from './services/supabase';
import Toast from './components/Toast';
import { syncOrQueue, flushQueue, queueLength, getQueue, getConflicts, getConflictStrategy, setConflictStrategy } from './services/syncQueue';

function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const raw = sessionStorage.getItem('cisa_session_user');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });
  const [currentPage, setCurrentPage] = useState(() => {
    return sessionStorage.getItem('cisa_session_page') || 'dashboard';
  });
  // Estado inicial: se recupera de la caché local (localStorage) si existe,
  // así los datos no se pierden si no hay conexión a Supabase o si la app
  // se cierra de forma inesperada (crash, cierre de pestaña, etc.)
  const [state, setState] = useState(() => {
    const cached = loadLocalCache();
    return {
      equipos: cached?.equipos || [],
      recepciones: cached?.recepciones || [],
      entregas: cached?.entregas || [],
      devoluciones: cached?.devoluciones || [],
      empleados: cached?.empleados || [],
      usuarios: cached?.usuarios?.length ? cached.usuarios : DEFAULT_USUARIOS,
      activities: cached?.activities || [],
    };
  });
  const [syncStatus, setSyncStatus] = useState({ type: 'err', text: '✗ Sin conexión — modo local' });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modals, setModals] = useState({
    agregar: false, recepcion: false, entrega: false, preselectId: null, usuario: false, empleado: false,
    estado: false, estadoId: null, editar: false, editarId: null, devolucion: false, devolverId: null,
  });
  const syncingRef = useRef(false);
  const pollRef = useRef(null);

  const connected = isConfigured();

  const showToast = useCallback((message, type = 'info') => {
    setToast({ id: Date.now(), message, type });
  }, []);

  const refreshQueueBadge = useCallback(() => {
    const n = queueLength();
    if (!isConfigured()) {
      setSyncStatus({ type: 'err', text: '✗ Sin conexión — modo local' });
      return;
    }
    if (!isOnline()) {
      setSyncStatus({ type: 'err', text: n ? `✗ Sin internet · ${n} en cola` : '✗ Sin internet' });
      return;
    }
    if (n > 0) {
      setSyncStatus({ type: 'loading', text: `⟳ ${n} pendiente(s)` });
    }
  }, []);


  // Guardar datos localmente en cada cambio (modo local / respaldo offline).
  // Así, si no hay conexión a Supabase, o si la app se cierra por error,
  // los datos siguen disponibles al reabrir.
  useEffect(() => {
    saveLocalCache(state);
  }, [state]);

  // Respaldo extra ante cierres abruptos (pestaña cerrada, recarga, crash del navegador)
  useEffect(() => {
    const persistNow = () => saveLocalCache(state);
    window.addEventListener('beforeunload', persistNow);
    window.addEventListener('pagehide', persistNow);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') persistNow();
    });
    return () => {
      window.removeEventListener('beforeunload', persistNow);
      window.removeEventListener('pagehide', persistNow);
    };
  }, [state]);

  // Persistir sección y sesión (no cerrar al recargar)
  useEffect(() => {
    if (currentUser) {
      sessionStorage.setItem('cisa_session_user', JSON.stringify(currentUser));
      sessionStorage.setItem('cisa_session_page', currentPage);
    } else {
      sessionStorage.removeItem('cisa_session_user');
      sessionStorage.removeItem('cisa_session_page');
    }
  }, [currentUser, currentPage]);

  // ---------- Sync helpers ----------
  const applyFetched = useCallback((data) => {
    setState(s => ({
      ...s,
      equipos: data.equipos,
      recepciones: data.recepciones,
      entregas: data.entregas,
      devoluciones: data.devoluciones,
      empleados: data.empleados,
      activities: data.activities,
      usuarios: data.usuarios || s.usuarios,
    }));
  }, []);

  const syncFromServer = useCallback(async (force = false) => {
    if (!isConfigured()) return;
    if (!force && syncingRef.current) return;
    syncingRef.current = true;
    try {
      const data = await fetchAll();
      applyFetched(data);
      setSyncStatus({ type: 'ok', text: '✓ ' + timeNow() });
    } catch (e) {
      const msg = formatError(e);
      setSyncStatus({ type: 'err', text: '✗ ' + (msg.length > 40 ? msg.slice(0, 37) + '…' : msg) });
      // no toast en poll silencioso; solo si force
      if (force) showToast(msg, 'error');
    } finally {
      syncingRef.current = false;
    }
  }, [applyFetched, showToast]);

  // Poll every 8s when logged in + configured
  useEffect(() => {
    if (!currentUser || !isConfigured()) {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    syncFromServer(true);
    pollRef.current = setInterval(() => syncFromServer(false), 8000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [currentUser, syncFromServer]);

  // Detectar online / offline + vaciar cola al reconectar
  useEffect(() => {
    const onOff = async () => {
      if (!isOnline()) {
        const n = queueLength();
        setSyncStatus({ type: 'err', text: n ? `✗ Sin internet · ${n} en cola` : '✗ Sin internet' });
        showToast('Sin conexión a internet. Los cambios se encolarán.', 'error');
      } else if (isConfigured() && currentUser) {
        setSyncStatus({ type: 'loading', text: '⟳ Reconectando...' });
        const pending = queueLength();
        if (pending > 0) {
          showToast(`Conexión restaurada. Enviando ${pending} operación(es) pendientes...`, 'info');
          const result = await flushQueue((msg, type) => { if (type === 'error') showToast(msg, 'error'); });
          if (result.ok) showToast(`${result.ok} operación(es) sincronizada(s)`, 'success');
          if (result.conflicts) showToast(`${result.conflicts} conflicto(s): se conservó la versión del servidor`, 'error');
          if (result.remaining) showToast(`${result.remaining} aún pendientes`, 'error');
        } else {
          showToast('Conexión restaurada. Sincronizando...', 'success');
        }
        await syncFromServer(true);
      }
    };
    window.addEventListener('online', onOff);
    window.addEventListener('offline', onOff);
    return () => {
      window.removeEventListener('online', onOff);
      window.removeEventListener('offline', onOff);
    };
  }, [currentUser, syncFromServer, showToast]);


  const logActivity = useCallback(async (icon, title, sub) => {
    const act = {
      id: uuid(),
      icon, title, sub,
      fecha: today(),
      usuario: currentUser?.usuario || '',
      created_at: new Date().toISOString(),
    };
    // Optimistic local
    setState(s => ({ ...s, activities: [act, ...s.activities].slice(0, 60) }));
    if (isConfigured()) {
      try { await syncOrQueue({ op: 'upsert', table: 'activities', row: act }); } catch (_) {}
    }
  }, [currentUser]);

  // ---------- Auth ----------
  const handleLogin = (usuario, password) => {
    const users = state.usuarios.length ? state.usuarios : DEFAULT_USUARIOS;
    const found = users.find(
      u => u.usuario.toLowerCase() === usuario.toLowerCase() && u.password === password
    );
    if (found) {
      setCurrentUser(found);
      if (isConfigured()) {
        const n = queueLength();
        setSyncStatus({ type: 'loading', text: n ? `⟳ Cargando · ${n} en cola` : '⟳ Cargando...' });
      } else {
        setSyncStatus({ type: 'err', text: '✗ Sin conexión — modo local' });
      }
      return true;
    }
    return false;
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentPage('dashboard');
    sessionStorage.removeItem('cisa_session_user');
    sessionStorage.removeItem('cisa_session_page');
    if (pollRef.current) clearInterval(pollRef.current);
  };

  const isSuperAdmin = currentUser?.role === 'Super Admin';

  // ---------- CRUD with persistence ----------
  const withLoading = async (fn, { successMsg } = {}) => {
    setLoading(true);
    try {
      await fn();
      if (successMsg) showToast(successMsg, 'success');
    } catch (e) {
      const msg = formatError(e);
      showToast(msg, 'error');
      setSyncStatus({ type: 'err', text: '✗ Error de red' });
      // Si es offline, no re-lanzar para no romper UX; el caller ya puede haber hecho local fallback
      if (!(e instanceof NetworkError && e.offline)) {
        // rethrow only if caller wants; most callers don't catch
      }
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const addEquipo = async (form) => {
    const equipo = {
      id: uuid(),
      nombre: form.nombre.trim(),
      categoria: form.categoria,
      marca: form.marca.trim(),
      modelo: form.modelo.trim(),
      serie: form.serie.trim(),
      estado: form.estado,
      ubicacion: form.ubicacion.trim() || 'Almacén principal',
      notas: form.notas.trim(),
      fecha_ingreso: form.fecha,
      usuario_registro: currentUser.usuario,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    // Siempre actualiza UI local primero
    setState(s => ({ ...s, equipos: [...s.equipos, equipo] }));
    try {
      await withLoading(async () => {
        const status = await syncOrQueue({ op: 'upsert', table: 'equipos', row: equipo });
        await logActivity('➕', 'Equipo agregado: ' + equipo.nombre, equipo.categoria + ' · ' + equipo.serie);
        if (status === 'synced') {
          await new Promise(r => setTimeout(r, 200));
          await syncFromServer(true);
        } else if (status === 'queued') {
          refreshQueueBadge();
          showToast('Sin conexión: equipo en cola de sincronización', 'info');
        } else if (status === 'conflict') {
          showToast('Conflicto: el servidor tiene una versión distinta. Se recargaron los datos.', 'error');
          await syncFromServer(true);
        }
      }, { successMsg: isConfigured() && isOnline() ? 'Equipo guardado en el servidor' : undefined });
    } catch (e) {
      // encolar si falló de otra forma
      syncOrQueue({ op: 'upsert', table: 'equipos', row: equipo });
      refreshQueueBadge();
    }
  };

  const addRecepcion = async (form) => {
    const eqId = uuid();
    const equipo = {
      id: eqId,
      nombre: form.nombre.trim(),
      categoria: form.categoria,
      marca: form.marca.trim(),
      modelo: form.modelo.trim(),
      serie: form.serie.trim(),
      estado: form.condicion === 'Dañado' ? 'dañado' : 'disponible',
      ubicacion: form.ubicacion.trim() || 'Almacén principal',
      notas: form.notas.trim(),
      fecha_ingreso: form.fecha,
      usuario_registro: currentUser.usuario,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const rec = {
      id: uuid(),
      equipo_id: eqId,
      nombre: form.nombre.trim(),
      serie: form.serie.trim(),
      categoria: form.categoria,
      entregador: form.entregador || '-',
      codigo_empleado: form.codEmp,
      recibidor: form.recibidor.trim(),
      condicion: form.condicion,
      notas: form.notas.trim(),
      fecha: form.fecha,
      usuario_registro: currentUser.usuario,
      created_at: new Date().toISOString(),
    };
    setState(s => ({
      ...s,
      equipos: [...s.equipos, equipo],
      recepciones: [...s.recepciones, rec],
    }));
    try {
      await withLoading(async () => {
        const s1 = await syncOrQueue({ op: 'upsert', table: 'equipos', row: equipo });
        const s2 = await syncOrQueue({ op: 'upsert', table: 'recepciones', row: rec });
        await logActivity('📥', 'Recepción: ' + form.nombre, 'De: ' + (form.entregador || 'N/A') + ' → ' + form.recibidor);
        if (s1 === 'synced' && s2 === 'synced') {
          await new Promise(r => setTimeout(r, 200));
          await syncFromServer(true);
        } else if (s1 === 'queued' || s2 === 'queued') {
          refreshQueueBadge();
          showToast('Sin conexión: recepción en cola de sincronización', 'info');
        }
      }, { successMsg: isConfigured() && isOnline() ? 'Recepción registrada en el servidor' : undefined });
    } catch (_) {
      await syncOrQueue({ op: 'upsert', table: 'equipos', row: equipo });
      await syncOrQueue({ op: 'upsert', table: 'recepciones', row: rec });
      refreshQueueBadge();
    }
  };


  const addEntrega = async (data) => {
    const ent = {
      id: uuid(),
      equipo_id: data.equipoId,
      nombre: data.equipo.nombre,
      serie: data.equipo.serie,
      destinatario: data.destinatario,
      codigo_empleado: data.codEmp,
      departamento: data.depto,
      responsable: data.responsable,
      fecha: data.fecha,
      devolucion: data.devolucion,
      notas: data.notas,
      activo: true,
      usuario_registro: currentUser.usuario,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setState(s => ({
      ...s,
      equipos: s.equipos.map(e => e.id === data.equipoId ? { ...e, estado: 'entregado', entregado_a: data.destinatario } : e),
      entregas: [...s.entregas, ent],
    }));
    try {
      await withLoading(async () => {
        const s1 = await syncOrQueue({
          op: 'patch', table: 'equipos', col: 'id', val: data.equipoId,
          data: { estado: 'entregado', entregado_a: data.destinatario, updated_at: new Date().toISOString() },
          baseUpdatedAt: data.equipo?.updated_at || data.equipo?.created_at || null,
        });
        const s2 = await syncOrQueue({ op: 'upsert', table: 'entregas', row: ent });
        await logActivity('📤', 'Entrega: ' + data.equipo.nombre, 'A: ' + data.destinatario + (data.codEmp ? ' (' + data.codEmp + ')' : ''));
        if (s1 === 'synced' && s2 === 'synced') {
          await new Promise(r => setTimeout(r, 200));
          await syncFromServer(true);
        } else if (s1 === 'queued' || s2 === 'queued') {
          refreshQueueBadge();
          showToast('Sin conexión: entrega en cola de sincronización', 'info');
        }
      }, { successMsg: isConfigured() && isOnline() ? 'Entrega registrada en el servidor' : undefined });
    } catch (_) {
      await syncOrQueue({
        op: 'patch', table: 'equipos', col: 'id', val: data.equipoId,
        data: { estado: 'entregado', entregado_a: data.destinatario, updated_at: new Date().toISOString() },
        baseUpdatedAt: data.equipo?.updated_at || data.equipo?.created_at || null,
      });
      await syncOrQueue({ op: 'upsert', table: 'entregas', row: ent });
      refreshQueueBadge();
    }
  };

  const addDevolucion = async (entregaId, form) => {
    const entrega = state.entregas.find(en => en.id === entregaId);
    if (!entrega) return;
    const equipo = state.equipos.find(eq => eq.id === entrega.equipo_id);
    const dev = {
      id: uuid(),
      entrega_id: entregaId,
      equipo_id: entrega.equipo_id,
      nombre_equipo: entrega.nombre,
      serie: entrega.serie,
      devuelto_por: form.devueltoPor,
      codigo_empleado: form.codigoEmpleado,
      recibidor: form.recibidor,
      condicion: form.condicion,
      estado_inventario: form.estadoInventario,
      notas: form.notas,
      fecha: form.fecha,
      usuario_registro: currentUser.usuario,
      created_at: new Date().toISOString(),
    };
    setState(s => ({
      ...s,
      equipos: s.equipos.map(e => e.id === entrega.equipo_id
        ? { ...e, estado: form.estadoInventario, entregado_a: null, updated_at: new Date().toISOString() }
        : e),
      entregas: s.entregas.map(en => en.id === entregaId ? { ...en, activo: false } : en),
      devoluciones: [...(s.devoluciones || []), dev],
    }));
    try {
      await withLoading(async () => {
        const s1 = await syncOrQueue({
          op: 'patch', table: 'equipos', col: 'id', val: entrega.equipo_id,
          data: { estado: form.estadoInventario, entregado_a: null, updated_at: new Date().toISOString() },
          baseUpdatedAt: equipo?.updated_at || equipo?.created_at || null,
        });
        const s2 = await syncOrQueue({
          op: 'patch', table: 'entregas', col: 'id', val: entregaId,
          data: { activo: false },
          baseUpdatedAt: entrega?.updated_at || entrega?.created_at || null,
        });
        const s3 = await syncOrQueue({ op: 'upsert', table: 'devoluciones', row: dev });
        await logActivity('🔄', 'Devolución: ' + entrega.nombre, 'De: ' + form.devueltoPor + ' → ' + form.recibidor);
        if (s1 === 'synced' && s2 === 'synced' && s3 === 'synced') {
          await new Promise(r => setTimeout(r, 200));
          await syncFromServer(true);
        } else if (s1 === 'queued' || s2 === 'queued' || s3 === 'queued') {
          refreshQueueBadge();
          showToast('Sin conexión: devolución en cola de sincronización', 'info');
        }
      }, { successMsg: isConfigured() && isOnline() ? 'Devolución registrada en el servidor' : undefined });
    } catch (_) {
      await syncOrQueue({
        op: 'patch', table: 'equipos', col: 'id', val: entrega.equipo_id,
        data: { estado: form.estadoInventario, entregado_a: null, updated_at: new Date().toISOString() },
        baseUpdatedAt: equipo?.updated_at || equipo?.created_at || null,
      });
      await syncOrQueue({
        op: 'patch', table: 'entregas', col: 'id', val: entregaId,
        data: { activo: false },
        baseUpdatedAt: entrega?.updated_at || entrega?.created_at || null,
      });
      await syncOrQueue({ op: 'upsert', table: 'devoluciones', row: dev });
      refreshQueueBadge();
    }
  };

  const eliminarEquipo = async (id) => {
    if (!confirm('¿Eliminar este equipo? Esta acción no se puede deshacer.')) return;
    const toDelete = state.equipos.find(e => e.id === id);
    setState(s => ({ ...s, equipos: s.equipos.filter(e => e.id !== id) }));
    const delItem = {
      op: 'delete', table: 'equipos', col: 'id', val: id,
      baseUpdatedAt: toDelete?.updated_at || toDelete?.created_at || null,
    };
    try {
      await withLoading(async () => {
        const status = await syncOrQueue(delItem);
        if (status === 'synced') await syncFromServer(true);
        else if (status === 'queued') {
          refreshQueueBadge();
          showToast('Eliminación en cola de sincronización', 'info');
        } else if (status === 'conflict') {
          showToast('Conflicto: el equipo fue modificado en otro equipo. Se restauró desde el servidor.', 'error');
          await syncFromServer(true);
        }
      }, { successMsg: isConfigured() && isOnline() ? 'Equipo eliminado' : undefined });
    } catch (_) {
      await syncOrQueue(delItem);
      refreshQueueBadge();
    }
  };

  const cambiarEstado = async (id, nuevoEstado, notas) => {
    const current = state.equipos.find(e => e.id === id);
    const patch = {
      estado: nuevoEstado,
      ...(notas != null ? { notas } : {}),
      updated_at: new Date().toISOString(),
    };
    setState(s => ({
      ...s,
      equipos: s.equipos.map(e => e.id === id ? { ...e, ...patch } : e),
    }));
    const queueItem = {
      op: 'patch', table: 'equipos', col: 'id', val: id, data: patch,
      baseUpdatedAt: current?.updated_at || current?.created_at || null,
    };
    try {
      await withLoading(async () => {
        const status = await syncOrQueue(queueItem);
        if (status === 'synced') await syncFromServer(true);
        else if (status === 'queued') refreshQueueBadge();
        else if (status === 'conflict') {
          showToast('Conflicto de estado: se mantuvo la versión del servidor', 'error');
          await syncFromServer(true);
        }
      });
    } catch (_) {
      await syncOrQueue(queueItem);
      refreshQueueBadge();
    }
  };


  const editarEquipo = async (id, { ubicacion, estado, notas }) => {
    const current = state.equipos.find(e => e.id === id);
    const patch = { ubicacion, estado, notas, updated_at: new Date().toISOString() };
    setState(s => ({
      ...s,
      equipos: s.equipos.map(e => e.id === id ? { ...e, ...patch } : e),
    }));
    const queueItem = {
      op: 'patch', table: 'equipos', col: 'id', val: id, data: patch,
      baseUpdatedAt: current?.updated_at || current?.created_at || null,
    };
    try {
      await withLoading(async () => {
        const status = await syncOrQueue(queueItem);
        if (status === 'synced') await syncFromServer(true);
        else if (status === 'queued') refreshQueueBadge();
        else if (status === 'conflict') {
          showToast('Conflicto al editar: se mantuvo la versión del servidor', 'error');
          await syncFromServer(true);
        }
      });
    } catch (_) {
      await syncOrQueue(queueItem);
      refreshQueueBadge();
    }
  };


  const saveUsuario = async ({ usuario, password, role }) => {
    const existing = state.usuarios || [];
    if (existing.find(u => u.usuario.toLowerCase() === usuario.toLowerCase())) {
      showToast('Ya existe ese usuario', 'error');
      return;
    }
    const nu = { id: uuid(), usuario, password, role, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    setState(s => ({ ...s, usuarios: [...(s.usuarios || []), nu] }));
    try {
      await withLoading(async () => {
        const status = await syncOrQueue({ op: 'upsert', table: 'usuarios', row: nu });
        if (status === 'synced') await syncFromServer(true);
        else if (status === 'queued') refreshQueueBadge();
      }, { successMsg: 'Usuario creado' });
    } catch (_) {
      await syncOrQueue({ op: 'upsert', table: 'usuarios', row: nu });
    }
  };

  const saveEmpleado = async ({ codigo, nombre, departamento, cargo }) => {
    if ((state.empleados || []).find(e => e.codigo === codigo)) {
      showToast('Ese código de empleado ya existe', 'error');
      return;
    }
    const ne = { codigo, nombre, departamento, cargo, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    setState(s => ({ ...s, empleados: [...(s.empleados || []), ne] }));
    try {
      await withLoading(async () => {
        const status = await syncOrQueue({ op: 'upsert', table: 'empleados', row: ne });
        if (status === 'synced') await syncFromServer(true);
        else if (status === 'queued') refreshQueueBadge();
      }, { successMsg: 'Empleado registrado' });
    } catch (_) {
      await syncOrQueue({ op: 'upsert', table: 'empleados', row: ne });
    }
  };

  const exportCSV = () => {
    const headers = ['ID', 'Nombre', 'Categoría', 'Marca', 'Modelo', 'Serie', 'Estado', 'Ubicación', 'Fecha Ingreso'];
    const rows = state.equipos.map(e => [e.id, e.nombre, e.categoria, e.marca, e.modelo, e.serie, e.estado, e.ubicacion, e.fecha_ingreso]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v || ''}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(csv);
    a.download = 'inventario-cisa-ti.csv';
    a.click();
  };

  const handleSaveSupabase = async () => {
    setSyncStatus({ type: 'loading', text: '⟳ Conectando...' });
    try {
      if (!isOnline()) throw new NetworkError('Sin conexión a internet', { offline: true });
      await withRetry(() => syncFromServer(true), { retries: 1 });
      setSyncStatus({ type: 'ok', text: '✓ ' + timeNow() });
      showToast('Conectado a Supabase correctamente', 'success');
    } catch (e) {
      const msg = formatError(e);
      setSyncStatus({ type: 'err', text: '✗ Error' });
      showToast(msg, 'error');
    }
  };

  const total = state.equipos.length;
  const disp = state.equipos.filter(e => e.estado === 'disponible').length;

  const topbarActions = () => {
    if (currentPage === 'inventario') {
      return (
        <>
          <button className="btn btn-primary" onClick={() => setModals(m => ({ ...m, agregar: true }))}>➕ Agregar Equipo</button>
          <button className="btn btn-outline" onClick={exportCSV}>⬇️ CSV</button>
        </>
      );
    }
    if (currentPage === 'recepciones') {
      return (
        <>
          <button className="btn btn-primary" onClick={() => setModals(m => ({ ...m, recepcion: true }))}>📥 Nueva Recepción</button>
          <button className="btn btn-print" onClick={() => window.print()}>🖨️ Imprimir</button>
        </>
      );
    }
    if (currentPage === 'entregas') {
      return (
        <>
          <button className="btn btn-primary" onClick={() => setModals(m => ({ ...m, entrega: true, preselectId: null }))}>📤 Nueva Entrega</button>
          <button className="btn btn-print" onClick={() => window.print()}>🖨️ Imprimir</button>
        </>
      );
    }
    return null;
  };

  if (!currentUser) {
    return <Login onLogin={handleLogin} notice={!connected} />;
  }

  return (
    <>
      <Toast toast={toast} onClose={() => setToast(null)} />

      {loading && (
        <div className="loading-overlay show">
          <div className="spinner" />
          <div className="loading-text">Sincronizando con servidor...</div>
        </div>
      )}

      <div
        className={`sidebar-backdrop ${sidebarOpen ? 'show' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />
      <Sidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        isOpen={sidebarOpen}
        onNavigateAndClose={() => setSidebarOpen(false)}
        currentUser={currentUser}
        totalEquipos={total}
        disponibles={disp}
        syncStatus={syncStatus}
        onSync={async () => {
          if (!isConfigured()) {
            alert('Sin conexión Supabase. Configura en Configuración.');
            return;
          }
          if (!isOnline()) {
            showToast('Sin internet. ' + queueLength() + ' operación(es) en cola.', 'error');
            refreshQueueBadge();
            return;
          }
          setSyncStatus({ type: 'loading', text: '⟳ Sincronizando...' });
          const pending = queueLength();
          if (pending > 0) {
            const result = await flushQueue((msg, type) => { if (type === 'error') showToast(msg, 'error'); });
            if (result.ok) showToast(`${result.ok} de cola sincronizada(s)`, 'success');
            if (result.conflicts) showToast(`${result.conflicts} conflicto(s): se conservó la versión del servidor`, 'error');
            if (result.remaining) showToast(`${result.remaining} aún pendientes`, 'error');
          }
          await syncFromServer(true);
          refreshQueueBadge();
        }}
        onLogout={handleLogout}
        isSuperAdmin={isSuperAdmin}
      />

      <main className="main">
        <div className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="menu-toggle"
              onClick={() => setSidebarOpen(o => !o)}
              aria-label="Menú"
            >
              ☰
            </button>
            <h2>{PAGE_TITLES[currentPage] || currentPage}</h2>
          </div>
          <div className="topbar-actions">{topbarActions()}</div>
        </div>
        <div className="content">
          {currentPage === 'dashboard' && <Dashboard state={state} />}
          {currentPage === 'inventario' && (
            <Inventario
              state={state}
              onAgregar={() => setModals(m => ({ ...m, agregar: true }))}
              onCambiarEstado={(id) => setModals(m => ({ ...m, estado: true, estadoId: id }))}
              onEditar={(id) => setModals(m => ({ ...m, editar: true, editarId: id }))}
              onEliminar={eliminarEquipo}
              onEntregaRapida={(id) => setModals(m => ({ ...m, entrega: true, preselectId: id }))}
              onExportCSV={exportCSV}
            />
          )}
          {currentPage === 'recepciones' && (
            <Recepciones
              state={state}
              onNuevaRecepcion={() => setModals(m => ({ ...m, recepcion: true }))}
              onDevolver={(id) => setModals(m => ({ ...m, devolucion: true, devolverId: id }))}
              onPrint={() => window.print()}
            />
          )}
          {currentPage === 'entregas' && (
            <Entregas state={state} onNuevaEntrega={() => setModals(m => ({ ...m, entrega: true, preselectId: null }))} onPrint={() => window.print()} />
          )}
          {currentPage === 'reportes' && (
            <Reportes
              state={state}
              onPrintRecepciones={() => window.print()}
              onPrintEntregas={() => window.print()}
            />
          )}
          {currentPage === 'configuracion' && isSuperAdmin && (
            <Configuracion
              state={state}
              currentUser={currentUser}
              onSaveSupabase={handleSaveSupabase}
              onDisconnect={() => {
                clearConfig();
                setSyncStatus({ type: 'err', text: '✗ Sin conexión — modo local' });
                showToast('Conexión Supabase eliminada. Modo local activo.', 'info');
              }}
              onAddUser={() => setModals(m => ({ ...m, usuario: true }))}
              onDeleteUser={(id) => {
                const target = (state.usuarios || []).find(u => u.id === id);
                if (!target) return;
                if (target.id === currentUser.id) {
                  showToast('No puedes eliminar tu propio usuario mientras tienes la sesión activa.', 'error');
                  return;
                }
                const superAdmins = (state.usuarios || []).filter(u => u.role === 'Super Admin');
                if (target.role === 'Super Admin' && superAdmins.length <= 1) {
                  showToast('No puedes eliminar el último Super Admin del sistema.', 'error');
                  return;
                }
                if (!confirm(`¿Eliminar el usuario "${target.usuario}"? Perderá acceso al sistema de inmediato.`)) return;
                setState(s => ({ ...s, usuarios: s.usuarios.filter(u => u.id !== id) }));
                withLoading(async () => {
                  const status = await syncOrQueue({ op: 'delete', table: 'usuarios', col: 'id', val: id });
                  if (status === 'synced') await syncFromServer(true);
                  else if (status === 'queued') refreshQueueBadge();
                });
              }}
              onAddEmp={() => setModals(m => ({ ...m, empleado: true }))}
              onDeleteEmp={(cod) => {
                if (!confirm('¿Eliminar este empleado?')) return;
                setState(s => ({ ...s, empleados: s.empleados.filter(e => e.codigo !== cod) }));
                withLoading(async () => {
                  const status = await syncOrQueue({ op: 'delete', table: 'empleados', col: 'codigo', val: cod });
                  if (status === 'synced') await syncFromServer(true);
                  else if (status === 'queued') refreshQueueBadge();
                });
              }}
            />
          )}
        </div>
      </main>

      
      {/* Botones flotantes — acciones principales */}
      <div className="fab-stack">
        {currentPage === 'inventario' && (
          <button type="button" className="fab" onClick={() => setModals(m => ({ ...m, agregar: true }))}>
            <span className="fab-icon">➕</span>
            <span className="fab-label">Agregar Equipo</span>
          </button>
        )}
        {currentPage === 'recepciones' && (
          <button type="button" className="fab" onClick={() => setModals(m => ({ ...m, recepcion: true }))}>
            <span className="fab-icon">📥</span>
            <span className="fab-label">Nueva Recepción</span>
          </button>
        )}
        {currentPage === 'entregas' && (
          <button type="button" className="fab" onClick={() => setModals(m => ({ ...m, entrega: true, preselectId: null }))}>
            <span className="fab-icon">📤</span>
            <span className="fab-label">Nueva Entrega</span>
          </button>
        )}
        {currentPage === 'configuracion' && isSuperAdmin && (
          <>
            <button type="button" className="fab fab-secondary" onClick={() => setModals(m => ({ ...m, empleado: true }))}>
              <span className="fab-icon">👷</span>
              <span className="fab-label">Empleado</span>
            </button>
            <button type="button" className="fab" onClick={() => setModals(m => ({ ...m, usuario: true }))}>
              <span className="fab-icon">👤</span>
              <span className="fab-label">Usuario</span>
            </button>
          </>
        )}
      </div>

      <ModalAgregarEquipo
        open={modals.agregar}
        onClose={() => setModals(m => ({ ...m, agregar: false }))}
        onSave={addEquipo}
      />
      <ModalRecepcion
        open={modals.recepcion}
        onClose={() => setModals(m => ({ ...m, recepcion: false }))}
        onSave={addRecepcion}
        empleados={state.empleados}
      />

      <ModalEntrega
        open={modals.entrega}
        onClose={() => setModals(m => ({ ...m, entrega: false, preselectId: null }))}
        onSave={addEntrega}
        equipos={state.equipos}
        empleados={state.empleados}
        preselectId={modals.preselectId}
      />

      <ModalAgregarUsuario
        open={modals.usuario}
        onClose={() => setModals(m => ({ ...m, usuario: false }))}
        onSave={saveUsuario}
      />
      <ModalAgregarEmpleado
        open={modals.empleado}
        onClose={() => setModals(m => ({ ...m, empleado: false }))}
        onSave={saveEmpleado}
      />

      <ModalCambiarEstado
        open={modals.estado}
        onClose={() => setModals(m => ({ ...m, estado: false, estadoId: null }))}
        equipo={state.equipos.find(e => e.id === modals.estadoId)}
        onSave={(nuevoEstado, notas) => {
          const e = state.equipos.find(x => x.id === modals.estadoId);
          if (!e) return;
          cambiarEstado(modals.estadoId, nuevoEstado, notas);
          logActivity('🔄', 'Estado: ' + e.nombre, e.estado + ' → ' + nuevoEstado);
        }}
      />

      <ModalEditarEquipo
        open={modals.editar}
        onClose={() => setModals(m => ({ ...m, editar: false, editarId: null }))}
        equipo={state.equipos.find(e => e.id === modals.editarId)}
        onSave={(data) => {
          const e = state.equipos.find(x => x.id === modals.editarId);
          if (!e) return;
          editarEquipo(modals.editarId, data);
          logActivity('✏️', 'Editado: ' + e.nombre, 'Ubicación / estado actualizados');
        }}
      />

      <ModalDevolucion
        open={modals.devolucion}
        onClose={() => setModals(m => ({ ...m, devolucion: false, devolverId: null }))}
        entrega={state.entregas.find(en => en.id === modals.devolverId)}
        onSave={(formData) => addDevolucion(modals.devolverId, formData)}
      />

    </>
  );
}

export default App;
