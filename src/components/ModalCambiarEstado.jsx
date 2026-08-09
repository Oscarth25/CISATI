import { useState, useEffect } from 'react';
import Modal from './Modal';
import Badge from './Badge';
import { ESTADOS } from '../services/constants';

const ESTADO_LABELS = {
  disponible: '✅ Disponible',
  entregado: '📤 Entregado',
  mantenimiento: '🔧 Mantenimiento',
  dañado: '⚠️ Dañado',
};

export default function ModalCambiarEstado({ open, onClose, onSave, equipo }) {
  const [nuevoEstado, setNuevoEstado] = useState('disponible');
  const [notas, setNotas] = useState('');

  useEffect(() => {
    if (open && equipo) {
      setNuevoEstado(equipo.estado || 'disponible');
      setNotas('');
    }
  }, [open, equipo]);

  if (!open || !equipo) return null;

  const handleSubmit = () => {
    onSave(nuevoEstado, notas.trim());
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="🔄 Cambiar Estado del Equipo">
      <div className="info-box">
        <div className="info-title">{equipo.nombre}</div>
        <div className="info-sub">{equipo.serie} · {equipo.categoria}</div>
        <div className="info-extra">
          Estado actual: <Badge estado={equipo.estado} />
        </div>
      </div>

      <div className="form-grid">
        <div className="form-group full">
          <label>Nuevo Estado</label>
          <select value={nuevoEstado} onChange={e => setNuevoEstado(e.target.value)}>
            {ESTADOS.map(es => (
              <option key={es} value={es}>{ESTADO_LABELS[es] || es}</option>
            ))}
          </select>
        </div>
        <div className="form-group full">
          <label>Motivo / Nota</label>
          <textarea
            value={notas}
            onChange={e => setNotas(e.target.value)}
            placeholder="Razón del cambio de estado..."
          />
        </div>
      </div>

      <div className="modal-actions">
        <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={handleSubmit}>💾 Guardar Estado</button>
      </div>
    </Modal>
  );
}
