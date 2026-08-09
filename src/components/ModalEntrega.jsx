import { useState, useEffect } from 'react';
import Modal from './Modal';
import { today } from '../services/supabase';

const empty = {
  equipoId: '',
  codEmp: '',
  destinatario: '',
  depto: '',
  responsable: '',
  fecha: today(),
  devolucion: '',
  notas: '',
};

export default function ModalEntrega({ open, onClose, onSave, equipos = [], empleados = [], preselectId = null }) {
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});
  const [empHint, setEmpHint] = useState('Ingresa el código del empleado');
  const [empOk, setEmpOk] = useState(false);

  const disponibles = equipos.filter(e => e.estado === 'disponible');

  useEffect(() => {
    if (open) {
      const base = { ...empty, fecha: today() };
      if (preselectId && disponibles.some(e => e.id === preselectId)) {
        base.equipoId = preselectId;
      }
      setForm(base);
      setErrors({});
      setEmpHint('Ingresa el código del empleado');
      setEmpOk(false);
    }
  }, [open, preselectId]);

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    // clear error on change
    if (errors[k]) setErrors(e => ({ ...e, [k]: undefined }));
  };

  const buscarEmp = (cod) => {
    set('codEmp', cod);
    const emp = empleados.find(e => e.codigo && e.codigo.toLowerCase() === cod.toLowerCase());
    if (emp) {
      setEmpHint(`✓ ${emp.nombre}${emp.departamento ? ' · ' + emp.departamento : ''}`);
      setEmpOk(true);
      setForm(f => ({
        ...f,
        codEmp: cod,
        destinatario: emp.nombre,
        depto: emp.departamento || f.depto,
      }));
      setErrors(e => ({ ...e, codEmp: undefined, destinatario: undefined }));
    } else {
      setEmpHint(cod ? 'Código no encontrado — puedes escribir el nombre manualmente' : 'Ingresa el código del empleado');
      setEmpOk(false);
      setForm(f => ({ ...f, codEmp: cod, destinatario: cod ? f.destinatario : '' }));
    }
  };

  const validate = () => {
    const err = {};
    if (!form.equipoId) err.equipoId = 'Selecciona un equipo disponible';
    if (!form.codEmp.trim()) err.codEmp = 'El código de empleado es obligatorio';
    if (!form.destinatario.trim()) err.destinatario = 'Indica a quién se entrega';
    if (!form.responsable.trim()) err.responsable = 'Indica quién entrega el equipo';
    if (!form.fecha) err.fecha = 'La fecha de entrega es obligatoria';
    if (form.devolucion && form.fecha && form.devolucion < form.fecha) {
      err.devolucion = 'La devolución no puede ser anterior a la entrega';
    }
    // Serie duplicada no aplica aquí; equipo ya existe
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const equipo = equipos.find(e => e.id === form.equipoId);
    if (!equipo) {
      setErrors({ equipoId: 'Equipo no encontrado. Recarga la página.' });
      return;
    }
    onSave({
      equipoId: form.equipoId,
      equipo,
      codEmp: form.codEmp.trim(),
      destinatario: form.destinatario.trim(),
      depto: form.depto.trim(),
      responsable: form.responsable.trim(),
      fecha: form.fecha,
      devolucion: form.devolucion || null,
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
    <Modal open={open} onClose={onClose} title="📤 Registrar Entrega de Equipo" wide>
      <div className="form-grid">
        <div className="form-group full">
          <label>Equipo a Entregar *</label>
          <select
            value={form.equipoId}
            onChange={e => set('equipoId', e.target.value)}
            style={inputStyle('equipoId')}
          >
            <option value="">Seleccionar equipo disponible...</option>
            {disponibles.map(e => (
              <option key={e.id} value={e.id}>
                {e.nombre} · {e.categoria} · S/N: {e.serie}
              </option>
            ))}
          </select>
          {fieldError('equipoId')}
          {disponibles.length === 0 && (
            <span style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
              No hay equipos disponibles. Agrega o recibe equipos primero.
            </span>
          )}
        </div>

        <div className="form-group">
          <label>Código de Empleado (quien recibe) *</label>
          <input
            value={form.codEmp}
            onChange={e => buscarEmp(e.target.value)}
            placeholder="Ej. EMP-001"
            style={inputStyle('codEmp')}
          />
          <span className={empOk ? 'employee-found' : 'employee-notfound'}>{empHint}</span>
          {fieldError('codEmp')}
        </div>

        <div className="form-group">
          <label>Entregado A *</label>
          <input
            value={form.destinatario}
            onChange={e => set('destinatario', e.target.value)}
            placeholder="Se autocompleta con el código →"
            style={{
              background: empOk ? '#f8fafc' : undefined,
              ...inputStyle('destinatario'),
            }}
            readOnly={empOk}
          />
          {fieldError('destinatario')}
        </div>

        <div className="form-group">
          <label>Departamento</label>
          <input
            value={form.depto}
            onChange={e => set('depto', e.target.value)}
            placeholder="IT, Finanzas, RRHH..."
          />
        </div>

        <div className="form-group">
          <label>Entregado Por *</label>
          <input
            value={form.responsable}
            onChange={e => set('responsable', e.target.value)}
            placeholder="Nombre del responsable que entrega"
            style={inputStyle('responsable')}
          />
          {fieldError('responsable')}
        </div>

        <div className="form-group">
          <label>Fecha de Entrega *</label>
          <input
            type="date"
            value={form.fecha}
            onChange={e => set('fecha', e.target.value)}
            style={inputStyle('fecha')}
          />
          {fieldError('fecha')}
        </div>

        <div className="form-group">
          <label>Fecha Devolución Esperada</label>
          <input
            type="date"
            value={form.devolucion}
            onChange={e => set('devolucion', e.target.value)}
            style={inputStyle('devolucion')}
          />
          {fieldError('devolucion')}
        </div>

        <div className="form-group full">
          <label>Observaciones</label>
          <textarea
            value={form.notas}
            onChange={e => set('notas', e.target.value)}
            placeholder="Propósito, accesorios incluidos..."
          />
        </div>
      </div>

      <div className="modal-actions">
        <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={disponibles.length === 0}>
          ✅ Registrar Entrega
        </button>
      </div>
    </Modal>
  );
}
