import { useState, useEffect } from 'react';
import Modal from './Modal';

const empty = { usuario: '', password: '', role: 'Operador' };

export default function ModalAgregarUsuario({ open, onClose, onSave }) {
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
    if (!form.usuario.trim()) err.usuario = 'El nombre de usuario es obligatorio';
    if (!form.password.trim()) err.password = 'La contraseña es obligatoria';
    else if (form.password.length < 4) err.password = 'Mínimo 4 caracteres';
    if (!form.role) err.role = 'Selecciona un rol';
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSave({
      usuario: form.usuario.trim(),
      password: form.password,
      role: form.role,
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
    <Modal open={open} onClose={onClose} title="👤 Agregar Usuario">
      <div className="form-grid">
        <div className="form-group">
          <label>Nombre de Usuario *</label>
          <input
            value={form.usuario}
            onChange={e => set('usuario', e.target.value)}
            placeholder="Ej. María"
            style={style('usuario')}
          />
          {err('usuario')}
        </div>
        <div className="form-group">
          <label>Contraseña *</label>
          <input
            type="password"
            value={form.password}
            onChange={e => set('password', e.target.value)}
            placeholder="••••••••"
            style={style('password')}
          />
          {err('password')}
        </div>
        <div className="form-group full">
          <label>Rol *</label>
          <select value={form.role} onChange={e => set('role', e.target.value)} style={style('role')}>
            <option value="Super Admin">Super Admin</option>
            <option value="Administrador">Administrador</option>
            <option value="Operador">Operador</option>
          </select>
          {err('role')}
        </div>
      </div>
      <div className="modal-actions">
        <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={handleSubmit}>✅ Crear Usuario</button>
      </div>
    </Modal>
  );
}
