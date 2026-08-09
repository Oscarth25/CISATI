import { useState, useEffect, useRef } from 'react';
import { DEFAULT_USUARIOS } from '../services/constants';

export default function Reportes({ state, onPrintRecepciones, onPrintEntregas }) {
  const [userFilter, setUserFilter] = useState('todos');
  const [fechaFilter, setFechaFilter] = useState('hoy');
  const canvasRef = useRef(null);

  const users = (state.usuarios?.length ? state.usuarios : DEFAULT_USUARIOS).map(u => u.usuario);
  const total = state.equipos.length;
  const disp = state.equipos.filter(e => e.estado === 'disponible').length;
  const mant = state.equipos.filter(e => e.estado === 'mantenimiento' || e.estado === 'dañado').length;

  const getDateFilter = () => {
    const t = new Date().toISOString().split('T')[0];
    if (fechaFilter === 'hoy') return t;
    if (fechaFilter === 'semana') return new Date(Date.now() - 7 * 864e5).toISOString().split('T')[0];
    if (fechaFilter === 'mes') return new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    return null;
  };

  const df = getDateFilter();
  let recs = state.recepciones || [];
  let ents = state.entregas || [];
  if (userFilter !== 'todos') {
    recs = recs.filter(r => r.usuario_registro === userFilter);
    ents = ents.filter(e => e.usuario_registro === userFilter);
  }
  if (df) {
    recs = recs.filter(r => r.fecha >= df);
    ents = ents.filter(e => e.fecha >= df);
  }

  // Actividad del usuario seleccionado en el período elegido.
  // Se recalcula en cada render, así que aparece de inmediato al cambiar el filtro.
  const userActivities = (state.activities || []).filter(a => {
    if (userFilter !== 'todos' && a.usuario !== userFilter) return false;
    if (df && a.fecha < df) return false;
    return true;
  });

  // Charts data
  const cats = {};
  state.equipos.forEach(e => { cats[e.categoria] = (cats[e.categoria] || 0) + 1; });
  const maxCat = Math.max(...Object.values(cats), 1);
  const colors = ['#0a6eb4', '#059669', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#be185d'];

  const estados = { disponible: 0, entregado: 0, mantenimiento: 0, dañado: 0 };
  state.equipos.forEach(e => { if (estados[e.estado] !== undefined) estados[e.estado]++; });
  const dColors = { disponible: '#059669', entregado: '#2563eb', mantenimiento: '#d97706', dañado: '#dc2626' };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 120, 120);
    const totalE = Object.values(estados).reduce((a, b) => a + b, 0) || 1;
    let sa = -Math.PI / 2;
    Object.entries(estados).forEach(([k, v]) => {
      if (!v) return;
      const sl = (v / totalE) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(60, 60);
      ctx.arc(60, 60, 54, sa, sa + sl);
      ctx.closePath();
      ctx.fillStyle = dColors[k];
      ctx.fill();
      sa += sl;
    });
    ctx.beginPath();
    ctx.arc(60, 60, 34, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 16px Syne';
    ctx.textAlign = 'center';
    ctx.fillText(String(totalE), 60, 65);
  }, [state.equipos]);

  return (
    <div className="page active">
      <div className="stats-grid">
        <div className="stat-card green"><div className="label">Total Recepciones</div><div className="value">{recs.length}</div></div>
        <div className="stat-card blue"><div className="label">Total Entregas</div><div className="value">{ents.length}</div></div>
        <div className="stat-card accent"><div className="label">Disponibilidad</div><div className="value">{total ? Math.round(disp / total * 100) + '%' : '0%'}</div></div>
        <div className="stat-card amber"><div className="label">Mant. / Dañados</div><div className="value">{mant}</div></div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <select className="search-box" style={{ width: 'auto' }} value={userFilter} onChange={e => setUserFilter(e.target.value)}>
          <option value="todos">Todos los usuarios</option>
          {users.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
        <select className="search-box" style={{ width: 'auto' }} value={fechaFilter} onChange={e => setFechaFilter(e.target.value)}>
          <option value="hoy">Hoy</option>
          <option value="semana">Esta semana</option>
          <option value="mes">Este mes</option>
          <option value="todos">Todos</option>
        </select>
        <button className="btn btn-print" onClick={onPrintRecepciones}>🖨️ Imprimir Recepciones</button>
        <button className="btn btn-print" onClick={onPrintEntregas}>🖨️ Imprimir Entregas</button>
      </div>

      {userFilter !== 'todos' && (
        <div className="report-user-section">
          <div className="report-user-header">
            <span className="report-user-name">👤 Actividad de {userFilter}</span>
            <span className="report-user-count">{userActivities.length} acción(es) en el período</span>
          </div>
          {userActivities.length === 0 ? (
            <p style={{ color: 'var(--muted)', fontSize: 13 }}>Sin actividad registrada en este período.</p>
          ) : (
            <div className="activity-list">
              {userActivities.slice(0, 30).map((a, i) => (
                <div className="activity-item" key={a.id || i}>
                  <span className="activity-icon">{a.icon}</span>
                  <div className="activity-info">
                    <div className="activity-title">{a.title}</div>
                    <div className="activity-sub">{a.sub}</div>
                  </div>
                  <div className="activity-time">{a.fecha}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-title">Equipos por Categoría</div>
          <div className="bar-chart">
            {Object.keys(cats).length === 0 ? (
              <p style={{ color: 'var(--muted)', fontSize: 13 }}>Sin datos</p>
            ) : (
              Object.entries(cats).map(([k, v], i) => (
                <div className="bar-row" key={k}>
                  <div className="bar-label">{k}</div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: Math.round(v / maxCat * 100) + '%', background: colors[i % colors.length] }} />
                  </div>
                  <div className="bar-val">{v}</div>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="chart-card">
          <div className="chart-title">Estado del Inventario</div>
          <div className="donut-wrap">
            <canvas ref={canvasRef} width="120" height="120" />
            <div className="legend">
              {Object.entries(estados).map(([k, v]) => (
                <div className="legend-item" key={k}>
                  <div className="legend-dot" style={{ background: dColors[k] }} />
                  {k}: <strong>{v}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
