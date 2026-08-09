import { useState, useEffect } from 'react';
import Modal from './Modal';

const empty = { codigo: '', nombre: '', departamento: '', cargo: '' };

export default function ModalAgregarEmpleado({ open, onClose, onSave }) {
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setForm(empty);
      setErrors({});
    }
  }, [open]);

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    if (errors[k]) setErrors(e => ({ ...e, [k]: undefined }));
  };

  const validate = () => {
    const err = {};
    if (!form.codigo.trim()) err.codigo = 'El código es obligatorio';
    if (!form.nombre.trim()) err.nombre = 'El nombre es obligatorio';
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSave({
      codigo: form.codigo.trim().toUpperCase(),
      nombre: form.nombre.trim(),
      departamento: form.departamento.trim(),
      cargo: form.cargo.trim(),
    });
    onClose();
  };

  const err = (name) =>
    errors[name] ? (
      <span style={{ fontSize: 11, color: 'var(--danger)', marginTop: 2 }}>⚠️ {errors[name]}</span>
    ) : null;

  const style = (name) =>
    errors[name] ? { borderColor: 'var(--danger)', background: '#fef2f2' } : undefined;

  return (
    <Modal open={open} onClose={onClose} title="👷 Agregar Empleado">
      <div className="form-grid">
        <div className="form-group">
          <label>Código de Empleado *</label>
          <input
            value={form.codigo}
            onChange={e => set('codigo', e.target.value)}
            placeholder="EMP-001"
            style={style('codigo')}
          />
          {err('codigo')}
        </div>
        <div className="form-group">
          <label>Nombre Completo *</label>
          <input
            value={form.nombre}
            onChange={e => set('nombre', e.target.value)}
            placeholder="Nombre del empleado"
            style={style('nombre')}
          />
          {err('nombre')}
        </div>
        <div className="form-group">
          <label>Departamento</label>
          <input
            value={form.departamento}
            onChange={e => set('departamento', e.target.value)}
            placeholder="IT, Finanzas..."
          />
        </div>
        <div className="form-group">
          <label>Cargo</label>
          <input
            value={form.cargo}
            onChange={e => set('cargo', e.target.value)}
            placeholder="Analista, Técnico..."
          />
        </div>
      </div>
      <div className="modal-actions">
        <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={handleSubmit}>✅ Registrar Empleado</button>
      </div>
    </Modal>
  );
}
