import { useState } from 'react';
import Badge from '../components/Badge';
import Empty from '../components/Empty';

const FILTERS = [
  { id: 'todos', label: 'Todos' },
  { id: 'disponible', label: '✅ Disponibles' },
  { id: 'entregado', label: '📤 Entregados' },
  { id: 'mantenimiento', label: '🔧 Mantenimiento' },
  { id: 'dañado', label: '⚠️ Dañados' },
];

export default function Inventario({
  state,
  onAgregar,
  onCambiarEstado,
  onEditar,
  onEliminar,
  onEntregaRapida,
  onExportCSV,
}) {
  const [filter, setFilter] = useState('todos');
  const [search, setSearch] = useState('');

  let items = state.equipos || [];
  if (filter !== 'todos') items = items.filter(e => e.estado === filter);
  if (search) {
    const q = search.toLowerCase();
    items = items.filter(e => JSON.stringify(e).toLowerCase().includes(q));
  }

  return (
    <div className="page active">
      <div className="filters">
        {FILTERS.map(f => (
          <button
            key={f.id}
            className={`filter-btn ${filter === f.id ? 'active' : ''}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="table-wrap">
        <div className="table-header">
          <span className="table-title">📋 Equipos Registrados</span>
          <div className="table-header-right">
            <input
              className="search-box"
              placeholder="🔍 Buscar..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
        {items.length === 0 ? (
          <Empty icon="🔍" text="No se encontraron equipos" />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Equipo</th>
                <th>Marca / Modelo</th>
                <th>Serie</th>
                <th>Categoría</th>
                <th>Estado</th>
                <th>Fecha Ingreso</th>
                <th>Ubicación</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map(e => (
                <tr key={e.id}>
                  <td><strong>{e.nombre}</strong></td>
                  <td>{[e.marca, e.modelo].filter(Boolean).join(' ')}</td>
                  <td className="serial">{e.serie}</td>
                  <td>{e.categoria}</td>
                  <td><Badge estado={e.estado} /></td>
                  <td className="serial">{e.fecha_ingreso || '-'}</td>
                  <td style={{ fontSize: 12 }}>{e.ubicacion || '-'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      <button className="btn btn-green btn-sm" onClick={() => onCambiarEstado(e.id)} title="Cambiar estado">☑ Estado</button>
                      {e.estado === 'disponible' && (
                        <button className="btn btn-primary btn-sm" onClick={() => onEntregaRapida(e.id)} title="Entregar">📤</button>
                      )}
                      <button className="btn btn-outline btn-sm" onClick={() => onEditar(e.id)}>✏️</button>
                      <button className="btn btn-danger btn-sm" onClick={() => onEliminar(e.id)}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
