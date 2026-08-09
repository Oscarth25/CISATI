import Empty from '../components/Empty';

export default function Dashboard({ state }) {
  const total = state.equipos.length;
  const disp = state.equipos.filter(e => e.estado === 'disponible').length;
  const ent = state.equipos.filter(e => e.estado === 'entregado').length;
  const mant = state.equipos.filter(e => e.estado === 'mantenimiento' || e.estado === 'dañado').length;
  const acts = state.activities || [];

  return (
    <div className="page active">
      <div className="stats-grid">
        <div className="stat-card accent">
          <div className="label">Total Equipos</div>
          <div className="value">{total}</div>
          <div className="sub">Registrados en sistema</div>
        </div>
        <div className="stat-card green">
          <div className="label">Disponibles</div>
          <div className="value">{disp}</div>
          <div className="sub">Listos para entrega</div>
        </div>
        <div className="stat-card blue">
          <div className="label">Entregados</div>
          <div className="value">{ent}</div>
          <div className="sub">En uso</div>
        </div>
        <div className="stat-card amber">
          <div className="label">Mant. / Dañados</div>
          <div className="value">{mant}</div>
          <div className="sub">En revisión</div>
        </div>
      </div>
      <div className="table-wrap">
        <div className="table-header">
          <span className="table-title">⚡ Actividad Reciente</span>
        </div>
        <div style={{ padding: 16 }}>
          {!acts.length ? (
            <Empty icon="📭" text="No hay actividad aún" />
          ) : (
            <div className="activity-list">
              {acts.slice(0, 10).map((a, i) => (
                <div className="activity-item" key={a.id || i}>
                  <span className="activity-icon">{a.icon}</span>
                  <div className="activity-info">
                    <div className="activity-title">{a.title}</div>
                    <div className="activity-sub">
                      {a.sub}{a.usuario ? ` · ${a.usuario}` : ''}
                    </div>
                  </div>
                  <div className="activity-time">{a.fecha}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
