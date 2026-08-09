import { useState, useEffect } from 'react';
import Modal from './Modal';
import { ESTADOS } from '../services/constants';

const ESTADO_LABELS = {
  disponible: '✅ Disponible',
  entregado: '📤 Entregado',
  mantenimiento: '🔧 Mantenimiento',
  dañado: '⚠️ Dañado',
};

const empty = { ubicacion: '', estado: 'disponible', notas: '' };

export default function ModalEditarEquipo({ open, onClose, onSave, equipo }) {
  const [form, setForm] = useState(empty);

  useEffect(() => {
    if (open && equipo) {
      setForm({
        ubicacion: equipo.ubicacion || '',
        estado: equipo.estado || 'disponible',
        notas: equipo.notas || '',
      });
    }
  }, [open, equipo]);

  if (!open || !equipo) return null;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = () => {
    onSave({
      ubicacion: form.ubicacion.trim(),
      estado: form.estado,
      notas: form.notas.trim(),
    });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="✏️ Editar Equipo">
      <div className="form-grid">
        <div className="form-group">
          <label>Ubicación</label>
          <input
            value={form.ubicacion}
            onChange={e => set('ubicacion', e.target.value)}
            placeholder="Estante A-3"
          />
        </div>
        <div className="form-group">
          <label>Estado</label>
          <select value={form.estado} onChange={e => set('estado', e.target.value)}>
            {ESTADOS.map(es => (
              <option key={es} value={es}>{ESTADO_LABELS[es] || es}</option>
            ))}
          </select>
        </div>
        <div className="form-group full">
          <label>Notas</label>
          <textarea
            value={form.notas}
            onChange={e => set('notas', e.target.value)}
            placeholder="Observaciones, accesorios..."
          />
        </div>
      </div>

      <div className="modal-actions">
        <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={handleSubmit}>💾 Guardar</button>
      </div>
    </Modal>
  );
}
