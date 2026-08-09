export default function Sidebar({
  currentPage,
  onNavigate,
  isOpen = true,
  onNavigateAndClose,
  currentUser,
  totalEquipos,
  disponibles,
  syncStatus,
  onSync,
  onLogout,
  isSuperAdmin,
}) {
  const nav = [
    { section: 'Principal', items: [
      { id: 'dashboard', icon: '🏠', label: 'Dashboard' },
      { id: 'inventario', icon: '📋', label: 'Inventario' },
    ]},
    { section: 'Movimientos', items: [
      { id: 'recepciones', icon: '📥', label: 'Recepciones' },
      { id: 'entregas', icon: '📤', label: 'Entregas' },
    ]},
    { section: 'Análisis', items: [
      { id: 'reportes', icon: '📊', label: 'Reportes' },
      ...(isSuperAdmin ? [{ id: 'configuracion', icon: '⚙️', label: 'Configuración' }] : []),
    ]},
  ];

  const statusClass = syncStatus?.type === 'ok' ? 'sync-ok' :
    syncStatus?.type === 'loading' ? 'sync-loading' : 'sync-err';

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="logo">
        <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="13" y="2" width="34" height="46" rx="6" fill="rgba(255,255,255,0.08)" stroke="#ff4d6d" strokeWidth="2"/>
          <rect x="17" y="7" width="26" height="17" rx="2.5" stroke="#ff4d6d" strokeWidth="1.2" fill="rgba(255,77,109,0.08)"/>
          <line x1="20" y1="11" x2="40" y2="11" stroke="#ff4d6d" strokeWidth="1" strokeLinecap="round" opacity="0.7"/>
          <line x1="20" y1="15" x2="32" y2="15" stroke="#ff4d6d" strokeWidth="1" strokeLinecap="round" opacity="0.5"/>
          <circle cx="21" cy="30" r="2.5" fill="#ff4d6d" opacity="0.8"/>
          <circle cx="30" cy="30" r="2.5" fill="#ff4d6d" opacity="0.8"/>
          <circle cx="39" cy="30" r="2.5" fill="#ff4d6d" opacity="0.8"/>
          <circle cx="21" cy="37" r="2.5" fill="#8aa8cc" opacity="0.6"/>
          <circle cx="30" cy="37" r="2.5" fill="#8aa8cc" opacity="0.6"/>
          <circle cx="39" cy="37" r="2.5" fill="#8aa8cc" opacity="0.6"/>
          <circle cx="21" cy="43" r="2.5" fill="#8aa8cc" opacity="0.4"/>
          <circle cx="30" cy="43" r="2.5" fill="#8aa8cc" opacity="0.4"/>
          <circle cx="39" cy="43" r="2.5" fill="#8aa8cc" opacity="0.4"/>
          <rect x="15" y="49" width="30" height="8" rx="4" stroke="#ff4d6d" strokeWidth="1.2" fill="rgba(255,77,109,0.1)"/>
          <line x1="19" y1="53" x2="41" y2="53" stroke="#ff4d6d" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
        <div className="logo-text">
          <h1>Cisa TI</h1>
          <p>Sistema de Inventario</p>
        </div>
      </div>
      <nav>
        {nav.map(sec => (
          <div key={sec.section}>
            <div className="nav-section">{sec.section}</div>
            {sec.items.map(item => (
              <div
                key={item.id}
                className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
                onClick={() => { onNavigate(item.id); onNavigateAndClose?.(); }}
              >
                <span className="nav-icon">{item.icon}</span> {item.label}
              </div>
            ))}
          </div>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className={`sync-status ${statusClass}`}>{syncStatus?.text || '⟳ Iniciando...'}</div>
        <button
          onClick={onSync}
          style={{
            width: '100%', background: 'rgba(255,77,109,0.1)', color: '#ff4d6d',
            border: '1px solid rgba(255,77,109,0.2)', borderRadius: 6, padding: 6,
            fontFamily: "'Syne',sans-serif", fontSize: 11, fontWeight: 600, cursor: 'pointer', marginBottom: 8
          }}
        >
          🔄 Sincronizar ahora
        </button>
        <div className="user-pill">
          <div className="user-avatar">{currentUser?.usuario?.[0]?.toUpperCase() || '?'}</div>
          <div className="user-info">
            <div className="user-name">{currentUser?.usuario || '—'}</div>
            <div className="user-role">{currentUser?.role || '—'}</div>
          </div>
        </div>
        <div className="stat-mini">Total equipos: <span>{totalEquipos}</span></div>
        <div className="stat-mini">Disponibles: <span>{disponibles}</span></div>
        <button className="btn-logout" onClick={onLogout}>🚪 Cerrar Sesión</button>
      </div>
    </aside>
  );
}
