import { useState, useEffect } from 'react';
import Modal from './Modal';
import { CONDICIONES } from '../services/constants';
import { today } from '../services/supabase';

const ESTADOS_DEVOLUCION = [
  { value: 'disponible', label: '✅ Disponible' },
  { value: 'mantenimiento', label: '🔧 Mantenimiento' },
  { value: 'dañado', label: '⚠️ Dañado' },
];

const empty = {
  codigoEmpleado: '',
  devueltoPor: '',
  recibidor: '',
  fecha: today(),
  condicion: 'Bueno',
  estadoInventario: 'disponible',
  notas: '',
};

export default function ModalDevolucion({ open, onClose, onSave, entrega }) {
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open && entrega) {
      setForm({
        ...empty,
        codigoEmpleado: entrega.codigo_empleado || '',
        devueltoPor: entrega.destinatario || '',
        fecha: today(),
      });
      setErrors({});
    }
  }, [open, entrega]);

  if (!open || !entrega) return null;

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    if (errors[k]) setErrors(e => ({ ...e, [k]: undefined }));
  };

  const handleSubmit = () => {
    const err = {};
    if (!form.recibidor.trim()) err.recibidor = 'Indica quién recibe la devolución';
    if (!form.fecha) err.fecha = 'La fecha de devolución es obligatoria';
    if (Object.keys(err).length) {
      setErrors(err);
      return;
    }
    onSave({
      codigoEmpleado: form.codigoEmpleado.trim(),
      devueltoPor: form.devueltoPor.trim(),
      recibidor: form.recibidor.trim(),
      fecha: form.fecha,
      condicion: form.condicion,
      estadoInventario: form.estadoInventario,
      notas: form.notas.trim(),
    });
    onClose();
  };

  const fieldError = (name) =>
    errors[name] ? (
      <span style={{ fontSize: 11, color: 'var(--danger)', fontFamily: "'Space Mono',monospace", marginTop: 2 }}>
        ⚠️ {errors[name]}
      </span>
    ) : null;

  const inputStyle = (name) =>
    errors[name] ? { borderColor: 'var(--danger)', background: '#fef2f2' } : undefined;

  return (
    <Modal open={open} onClose={onClose} title="🔄 Registrar Devolución de Equipo" wide>
      <div className="info-box">
        <div className="info-title">{entrega.nombre}</div>
        <div className="info-sub">Serie: {entrega.serie}</div>
        <div className="info-extra">
          Entregado a: <strong>{entrega.destinatario}</strong>
          {entrega.codigo_empleado ? ` (${entrega.codigo_empleado})` : ''}
          {entrega.departamento ? ` · Depto: ${entrega.departamento}` : ''}
        </div>
      </div>

      <div className="form-grid">
        <div className="form-group">
          <label>Código Empleado (quien devuelve)</label>
          <input
            value={form.codigoEmpleado}
            onChange={e => set('codigoEmpleado', e.target.value)}
            placeholder="Ej. EMP-001"
          />
        </div>
        <div className="form-group">
          <label>Devuelto Por</label>
          <input
            value={form.devueltoPor}
            onChange={e => set('devueltoPor', e.target.value)}
            placeholder="Nombre de quien devuelve"
          />
        </div>
        <div className="form-group">
          <label>Recibido Por *</label>
          <input
            value={form.recibidor}
            onChange={e => set('recibidor', e.target.value)}
            placeholder="Nombre del responsable"
            style={inputStyle('recibidor')}
          />
          {fieldError('recibidor')}
        </div>
        <div className="form-group">
          <label>Fecha de Devolución</label>
          <input
            type="date"
            value={form.fecha}
            onChange={e => set('fecha', e.target.value)}
            style={inputStyle('fecha')}
          />
          {fieldError('fecha')}
        </div>
        <div className="form-group">
          <label>Condición al Regresar</label>
          <select value={form.condicion} onChange={e => set('condicion', e.target.value)}>
            {CONDICIONES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Estado en Inventario</label>
          <select value={form.estadoInventario} onChange={e => set('estadoInventario', e.target.value)}>
            {ESTADOS_DEVOLUCION.map(es => (
              <option key={es.value} value={es.value}>{es.label}</option>
            ))}
          </select>
        </div>
        <div className="form-group full">
          <label>Observaciones</label>
          <textarea
            value={form.notas}
            onChange={e => set('notas', e.target.value)}
            placeholder="Estado del equipo al regresar, accesorios, etc."
          />
        </div>
      </div>

      <div className="modal-actions">
        <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={handleSubmit}>✅ Registrar Devolución</button>
      </div>
    </Modal>
  );
}
