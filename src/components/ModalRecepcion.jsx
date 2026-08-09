import { useState, useEffect } from 'react';
import Modal from './Modal';
import { CATEGORIAS, CONDICIONES } from '../services/constants';
import { today } from '../services/supabase';

const empty = {
  nombre: '', categoria: '', marca: '', modelo: '', serie: '',
  condicion: 'Nuevo', codEmp: '', entregador: '', recibidor: '',
  ubicacion: '', fecha: today(), condicion2: '', notas: '',
};

export default function ModalRecepcion({ open, onClose, onSave, empleados = [] }) {
  const [form, setForm] = useState(empty);
  const [empFound, setEmpFound] = useState('');

  useEffect(() => {
    if (open) {
      setForm({ ...empty, fecha: today() });
      setEmpFound('Ingresa el código del empleado');
    }
  }, [open]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const buscarEmp = (cod) => {
    set('codEmp', cod);
    const emp = empleados.find(e => e.codigo && e.codigo.toLowerCase() === cod.toLowerCase());
    if (emp) {
      setEmpFound(`✓ ${emp.nombre}${emp.departamento ? ' · ' + emp.departamento : ''}`);
      set('entregador', emp.nombre);
    } else {
      setEmpFound(cod ? 'Código no encontrado' : 'Ingresa el código del empleado');
      set('entregador', '');
    }
  };

  const handleSubmit = () => {
    if (!form.nombre.trim() || !form.serie.trim() || !form.recibidor.trim() || !form.categoria) {
      alert('Completa los campos obligatorios (*)');
      return;
    }
    onSave(form);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="📥 Registrar Recepción de Equipo" wide>
      <div className="form-grid">
        <div className="form-group">
          <label>Nombre del Equipo *</label>
          <input value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Laptop HP ProBook" />
        </div>
        <div className="form-group">
          <label>Categoría *</label>
          <select value={form.categoria} onChange={e => set('categoria', e.target.value)}>
            <option value="">Seleccionar...</option>
            {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Marca</label>
          <input value={form.marca} onChange={e => set('marca', e.target.value)} placeholder="HP, Dell, Zebra..." />
        </div>
        <div className="form-group">
          <label>Modelo</label>
          <input value={form.modelo} onChange={e => set('modelo', e.target.value)} placeholder="ProBook 450 G8" />
        </div>
        <div className="form-group">
          <label>Número de Serie *</label>
          <input value={form.serie} onChange={e => set('serie', e.target.value)} placeholder="SN-2024-00123" />
        </div>
        <div className="form-group">
          <label>Condición de Llegada</label>
          <select value={form.condicion} onChange={e => set('condicion', e.target.value)}>
            {CONDICIONES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Código de Empleado (quien entrega)</label>
          <input value={form.codEmp} onChange={e => buscarEmp(e.target.value)} placeholder="Ej. EMP-001" />
          <span className={empFound.startsWith('✓') ? 'employee-found' : 'employee-notfound'}>{empFound}</span>
        </div>
        <div className="form-group">
          <label>Usuario que Entrega *</label>
          <input value={form.entregador} readOnly style={{ background: '#f8fafc' }} placeholder="Se autocompleta con el código →" />
        </div>
        <div className="form-group">
          <label>Recibido Por *</label>
          <input value={form.recibidor} onChange={e => set('recibidor', e.target.value)} placeholder="Nombre del responsable" />
        </div>
        <div className="form-group">
          <label>Ubicación en Almacén</label>
          <input value={form.ubicacion} onChange={e => set('ubicacion', e.target.value)} placeholder="Estante A-3" />
        </div>
        <div className="form-group">
          <label>Fecha de Recepción</label>
          <input type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Condición al Recibir</label>
          <input value={form.condicion2} onChange={e => set('condicion2', e.target.value)} placeholder="Buen estado, cargador incluido..." />
        </div>
        <div className="form-group full">
          <label>Observaciones</label>
          <textarea value={form.notas} onChange={e => set('notas', e.target.value)} placeholder="Observaciones adicionales..." />
        </div>
      </div>
      <div className="modal-actions">
        <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={handleSubmit}>✅ Registrar Recepción</button>
      </div>
    </Modal>
  );
}
