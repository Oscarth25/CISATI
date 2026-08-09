import { useState, useEffect } from 'react';
import Modal from './Modal';
import { CATEGORIAS } from '../services/constants';
import { today } from '../services/supabase';

const empty = {
  nombre: '', categoria: '', marca: '', modelo: '', serie: '',
  estado: 'disponible', ubicacion: '', fecha: today(), notas: '',
};

export default function ModalAgregarEquipo({ open, onClose, onSave }) {
  const [form, setForm] = useState(empty);

  useEffect(() => {
    if (open) setForm({ ...empty, fecha: today() });
  }, [open]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = () => {
    if (!form.nombre.trim() || !form.serie.trim() || !form.categoria) {
      alert('Completa los campos obligatorios (*)');
      return;
    }
    onSave(form);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="➕ Agregar Equipo al Inventario">
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
          <label>Estado Inicial</label>
          <select value={form.estado} onChange={e => set('estado', e.target.value)}>
            <option value="disponible">Disponible</option>
            <option value="mantenimiento">Mantenimiento</option>
            <option value="dañado">Dañado</option>
          </select>
        </div>
        <div className="form-group">
          <label>Ubicación</label>
          <input value={form.ubicacion} onChange={e => set('ubicacion', e.target.value)} placeholder="Estante A-3" />
        </div>
        <div className="form-group">
          <label>Fecha de Ingreso</label>
          <input type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} />
        </div>
        <div className="form-group full">
          <label>Observaciones</label>
          <textarea value={form.notas} onChange={e => set('notas', e.target.value)} placeholder="Accesorios, observaciones..." />
        </div>
      </div>
      <div className="modal-actions">
        <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={handleSubmit}>➕ Agregar Equipo</button>
      </div>
    </Modal>
  );
}
