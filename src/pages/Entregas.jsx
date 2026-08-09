import { useState } from 'react';
import Empty from '../components/Empty';

export default function Entregas({ state, onNuevaEntrega, onPrint }) {
  const [search, setSearch] = useState('');

  let items = [...(state.entregas || [])].reverse();
  if (search) {
    const q = search.toLowerCase();
    items = items.filter(e => JSON.stringify(e).toLowerCase().includes(q));
  }

  return (
    <div className="page active">
      <div className="table-wrap">
        <div className="table-header">
          <span className="table-title">📤 Historial de Entregas</span>
          <div className="table-header-right">
            <input className="search-box" placeholder="🔍 Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        {items.length === 0 ? (
          <Empty icon="📤" text="No hay entregas registradas" />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Fecha</th><th>Equipo</th><th>Serie</th>
                <th>Entregado A</th><th>Cód. Empleado</th>
                <th>Departamento</th><th>Entregado Por</th><th>Devolución</th><th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {items.map(e => (
                <tr key={e.id}>
                  <td className="serial">{e.fecha}</td>
                  <td><strong>{e.nombre}</strong></td>
                  <td className="serial">{e.serie}</td>
                  <td>{e.destinatario}</td>
                  <td className="serial">{e.codigo_empleado || '-'}</td>
                  <td>{e.departamento || '-'}</td>
                  <td>{e.responsable}</td>
                  <td className="serial">{e.devolucion || '-'}</td>
                  <td>
                    {e.activo === false
                      ? <span className="badge badge-disponible">✅ Devuelto</span>
                      : <span className="badge badge-entregado">📤 Activo</span>}
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
