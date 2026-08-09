import { useState } from 'react';
import Empty from '../components/Empty';
import Badge from '../components/Badge';

export default function Recepciones({ state, onNuevaRecepcion, onDevolver, onPrint }) {
  const [tab, setTab] = useState('recepciones');
  const [search, setSearch] = useState('');
  const [searchDev, setSearchDev] = useState('');

  let recs = [...(state.recepciones || [])].reverse();
  if (search) {
    const q = search.toLowerCase();
    recs = recs.filter(r => JSON.stringify(r).toLowerCase().includes(q));
  }

  let pendientes = (state.entregas || []).filter(e => e.activo !== false);
  if (searchDev) {
    const q = searchDev.toLowerCase();
    pendientes = pendientes.filter(e => JSON.stringify(e).toLowerCase().includes(q));
  }

  const devs = [...(state.devoluciones || [])].reverse();
  const t = new Date().toISOString().split('T')[0];

  return (
    <div className="page active">
      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 0, marginBottom: 18,
        border: '1.5px solid var(--border)', borderRadius: 8, overflow: 'hidden',
        width: 'fit-content', background: 'var(--surface)'
      }}>
        <button
          onClick={() => setTab('recepciones')}
          style={{
            padding: '9px 22px', fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 700,
            border: 'none', cursor: 'pointer',
            background: tab === 'recepciones' ? 'var(--accent)' : 'var(--surface)',
            color: tab === 'recepciones' ? '#fff' : 'var(--muted)',
          }}
        >
          📥 Recepciones
        </button>
        <button
          onClick={() => setTab('devoluciones')}
          style={{
            padding: '9px 22px', fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 700,
            border: 'none', cursor: 'pointer',
            background: tab === 'devoluciones' ? 'var(--accent)' : 'var(--surface)',
            color: tab === 'devoluciones' ? '#fff' : 'var(--muted)',
          }}
        >
          🔄 Devoluciones
        </button>
      </div>

      {tab === 'recepciones' && (
        <div className="table-wrap">
          <div className="table-header">
            <span className="table-title">📥 Historial de Recepciones</span>
            <div className="table-header-right">
              <input className="search-box" placeholder="🔍 Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          {recs.length === 0 ? (
            <Empty icon="📥" text="No hay recepciones registradas" />
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Fecha</th><th>Equipo / Categoría</th><th>Serie</th>
                  <th>Usuario que Entrega</th><th>Cód. Empleado</th>
                  <th>Recibido Por</th><th>Condición</th><th>Notas</th>
                </tr>
              </thead>
              <tbody>
                {recs.map(r => (
                  <tr key={r.id}>
                    <td className="serial">{r.fecha}</td>
                    <td>
                      <strong>{r.nombre}</strong><br />
                      <span style={{ color: 'var(--muted)', fontSize: 10 }}>{r.categoria}</span>
                    </td>
                    <td className="serial">{r.serie}</td>
                    <td>{r.entregador || r.proveedor || '-'}</td>
                    <td className="serial">{r.codigo_empleado || '-'}</td>
                    <td>{r.recibidor}</td>
                    <td>{r.condicion}</td>
                    <td style={{ maxWidth: 140, fontSize: 11, color: 'var(--muted)' }}>{r.notas || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'devoluciones' && (
        <>
          <div className="table-wrap">
            <div className="table-header">
              <span className="table-title">🔄 Equipos Entregados — Registrar Devolución</span>
              <div className="table-header-right">
                <input className="search-box" placeholder="🔍 Buscar equipo entregado..." value={searchDev} onChange={e => setSearchDev(e.target.value)} />
              </div>
            </div>
            {pendientes.length === 0 ? (
              <Empty icon="✅" text="No hay equipos pendientes de devolución" />
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Equipo</th><th>Serie</th><th>Entregado A</th><th>Cód. Empleado</th>
                    <th>Departamento</th><th>Fecha Entrega</th><th>Devolución Esperada</th><th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {pendientes.map(e => {
                    const vencido = e.devolucion && e.devolucion < t;
                    return (
                      <tr key={e.id} style={vencido ? { background: '#fff5f5' } : undefined}>
                        <td><strong>{e.nombre}</strong></td>
                        <td className="serial">{e.serie}</td>
                        <td>{e.destinatario}</td>
                        <td className="serial">{e.codigo_empleado || '-'}</td>
                        <td>{e.departamento || '-'}</td>
                        <td className="serial">{e.fecha}</td>
                        <td className="serial" style={vencido ? { color: 'var(--danger)', fontWeight: 700 } : undefined}>
                          {e.devolucion || '—'}{vencido ? ' ⚠️' : ''}
                        </td>
                        <td>
                          <button className="btn btn-primary btn-sm" onClick={() => onDevolver(e.id)}>🔄 Devolver</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="table-wrap" style={{ marginTop: 16 }}>
            <div className="table-header">
              <span className="table-title">📋 Historial de Devoluciones Registradas</span>
            </div>
            {devs.length === 0 ? (
              <Empty icon="📋" text="Sin devoluciones registradas aún" />
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Fecha Devolución</th><th>Equipo</th><th>Serie</th>
                    <th>Devuelto Por</th><th>Cód. Empleado</th><th>Recibido Por</th><th>Condición</th><th>Notas</th>
                  </tr>
                </thead>
                <tbody>
                  {devs.map(d => (
                    <tr key={d.id}>
                      <td className="serial">{d.fecha}</td>
                      <td><strong>{d.nombre_equipo}</strong></td>
                      <td className="serial">{d.serie}</td>
                      <td>{d.devuelto_por || '-'}</td>
                      <td className="serial">{d.codigo_empleado || '-'}</td>
                      <td>{d.recibidor}</td>
                      <td>
                        <span className={`badge ${d.condicion === 'Dañado' ? 'badge-dañado' : d.condicion === 'Regular' ? 'badge-mantenimiento' : 'badge-disponible'}`}>
                          {d.condicion}
                        </span>
                      </td>
                      <td style={{ fontSize: 11, color: 'var(--muted)' }}>{d.notas || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
