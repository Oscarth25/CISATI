import { useState } from 'react';
import { DEFAULT_USUARIOS } from '../services/constants';
import { loadConfig, saveConfig, clearConfig, testConnection, formatError } from '../services/supabase';
import { getConflictStrategy, setConflictStrategy, getConflicts, clearConflicts } from '../services/syncQueue';

export default function Configuracion({ state, currentUser, onSaveSupabase, onDisconnect, onAddUser, onDeleteUser, onAddEmp, onDeleteEmp }) {
  const cfg = loadConfig();
  const [url, setUrl] = useState(cfg.url || '');
  const [key, setKey] = useState(cfg.key || '');
  const [strategy, setStrategy] = useState(getConflictStrategy());
  const conflicts = getConflicts();

  const users = state.usuarios?.length ? state.usuarios : DEFAULT_USUARIOS;
  const emps = state.empleados || [];
  const superAdminCount = users.filter(u => u.role === 'Super Admin').length;

  const handleSave = () => {
    if (!url.trim() || !key.trim()) {
      alert('Ingresa URL y Key de Supabase');
      return;
    }
    saveConfig(url.trim(), key.trim());
    onSaveSupabase?.(url.trim(), key.trim());
    alert('✅ Configuración guardada.');
  };

  const handleTest = async () => {
    // guardar temporalmente para que testConnection use estos valores
    const prevUrl = localStorage.getItem('cisa_supa_url');
    const prevKey = localStorage.getItem('cisa_supa_key');
    try {
      if (!url.trim() || !key.trim()) {
        alert('Ingresa URL y Key primero');
        return;
      }
      saveConfig(url.trim(), key.trim());
      await testConnection();
      alert('✅ Conexión exitosa con Supabase');
    } catch (e) {
      alert('❌ ' + formatError(e));
      // restaurar si falló
      if (prevUrl != null) localStorage.setItem('cisa_supa_url', prevUrl);
      else localStorage.removeItem('cisa_supa_url');
      if (prevKey != null) localStorage.setItem('cisa_supa_key', prevKey);
      else localStorage.removeItem('cisa_supa_key');
    }
  };

  return (
    <div className="page active">
      <div className="setup-box">
        <h3>🔌 Conexión Supabase</h3>
        <p>Ingresa tus credenciales de Supabase para habilitar sincronización en tiempo real entre múltiples equipos.</p>
        <input
          type="text"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://xxxxxxxx.supabase.co"
        />
        <input
          type="text"
          value={key}
          onChange={e => setKey(e.target.value)}
          placeholder="anon key (ej: eyJhbGciOiJIUzI1NiIs...)"
        />
        <div style={{ display: 'flex', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={handleSave}>💾 Guardar y Conectar</button>
          <button className="btn btn-outline" style={{ color: '#8aa8cc', borderColor: 'rgba(255,255,255,0.2)' }} onClick={handleTest}>
            🧪 Probar Conexión
          </button>
          <button
            className="btn btn-danger"
            style={{ background: 'rgba(220,38,38,0.15)', color: '#fca5a5', border: '1px solid rgba(220,38,38,0.35)' }}
            onClick={() => {
              if (!confirm('¿Eliminar la conexión Supabase de este equipo? Pasarás a modo local.')) return;
              clearConfig();
              setUrl('');
              setKey('');
              onDisconnect?.();
            }}
          >
            🔌 Eliminar conexión
          </button>
        </div>
        <p style={{ marginTop: 12, fontSize: 11, color: '#6b88b5' }}>
          1. Ve a <strong style={{ color: '#4da6ff' }}>supabase.com</strong> → New Project → copia la URL y anon key<br />
          2. Ejecuta el SQL de configuración (ver archivo SETUP.sql incluido)<br />
          3. Pega las credenciales aquí y presiona Guardar
        </p>
      </div>

      <div className="config-section">
        <h3>👥 Gestión de Usuarios</h3>
        <table className="user-table">
          <thead>
            <tr><th>Usuario</th><th>Rol</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>{u.usuario}</td>
                <td>
                  <span className={`role-badge ${u.role === 'Super Admin' ? 'role-super' : u.role === 'Administrador' ? 'role-admin' : 'role-op'}`}>
                    {u.role}
                  </span>
                </td>
                <td>
                  {u.id === currentUser?.id ? (
                    <span style={{ color: 'var(--muted)', fontSize: 11 }} title="No puedes eliminar tu propio usuario mientras tienes sesión activa">
                      Tú (sesión activa)
                    </span>
                  ) : u.role === 'Super Admin' && superAdminCount <= 1 ? (
                    <span style={{ color: 'var(--muted)', fontSize: 11 }} title="No puedes eliminar el último Super Admin del sistema">
                      🔒 Protegido
                    </span>
                  ) : (
                    <button className="btn btn-danger btn-sm" onClick={() => onDeleteUser(u.id)} title="Eliminar usuario">🗑️ Eliminar</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginTop: 14 }}>
          <button className="btn btn-primary" onClick={onAddUser}>➕ Agregar Usuario</button>
        </div>
      </div>

      <div className="config-section">
        <h3>👷 Empleados Registrados</h3>
        <table className="user-table">
          <thead>
            <tr><th>Código</th><th>Nombre</th><th>Departamento</th><th>Cargo</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {emps.length === 0 ? (
              <tr><td colSpan={5} style={{ color: 'var(--muted)', textAlign: 'center' }}>Sin empleados registrados</td></tr>
            ) : (
              emps.map(e => (
                <tr key={e.codigo}>
                  <td className="serial">{e.codigo}</td>
                  <td><strong>{e.nombre}</strong></td>
                  <td>{e.departamento || '-'}</td>
                  <td>{e.cargo || '-'}</td>
                  <td><button className="btn btn-danger btn-sm" onClick={() => onDeleteEmp(e.codigo)} title="Eliminar empleado">🗑️ Eliminar</button></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div style={{ marginTop: 14 }}>
          <button className="btn btn-primary" onClick={onAddEmp}>➕ Agregar Empleado</button>
        </div>
      </div>

      <div className="config-section">
        <h3>⚖️ Conflictos de datos</h3>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>
          Cuando el mismo equipo se modifica en dos lugares sin sincronizar, se usa esta estrategia al subir la cola.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
          <button
            className={`btn ${strategy === 'server-wins' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => { setConflictStrategy('server-wins'); setStrategy('server-wins'); }}
          >
            🖥️ Server wins (recomendado)
          </button>
          <button
            className={`btn ${strategy === 'client-wins' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => { setConflictStrategy('client-wins'); setStrategy('client-wins'); }}
          >
            💻 Client wins
          </button>
        </div>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
          {strategy === 'server-wins'
            ? 'Si el servidor tiene una versión más nueva (updated_at), se descarta el cambio local y se recargan los datos.'
            : 'El cambio local sobrescribe lo que haya en el servidor al sincronizar la cola.'}
        </p>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>
          Conflictos registrados: <strong>{conflicts.length}</strong>
          {conflicts.length > 0 && (
            <button className="btn btn-outline btn-sm" style={{ marginLeft: 10 }} onClick={() => { clearConflicts(); window.location.reload(); }}>
              Limpiar log
            </button>
          )}
        </div>
        {conflicts.slice(0, 5).map((c, i) => (
          <div key={i} style={{ fontSize: 11, marginTop: 8, padding: 8, background: 'var(--surface2)', borderRadius: 6, fontFamily: 'Space Mono, monospace' }}>
            {c.at?.slice(0, 19)} · {c.table} · {c.op} · {c.resolution} · key={String(c.key)}
          </div>
        ))}
      </div>
    </div>
  );
}
