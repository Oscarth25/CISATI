export const DEFAULT_USUARIOS = [
  { id: '1', usuario: 'admin', password: 'admin123', role: 'Super Admin' },
  { id: '2', usuario: 'operador', password: 'op123', role: 'Operador' },
  { id: '3', usuario: 'Elias', password: 'elias123', role: 'Super Admin' },
  { id: '4', usuario: 'Oscar', password: 'oscar123', role: 'Administrador' },
  { id: '5', usuario: 'Victor', password: 'victor123', role: 'Administrador' },
];

export const CATEGORIAS = [
  'Laptop', 'Desktop', 'Monitor', 'Impresora', 'Tablet',
  'Teléfono', 'Servidor', 'Switch/Router', 'Proyector', 'Hand Held', 'Otro'
];

export const ESTADOS = ['disponible', 'entregado', 'mantenimiento', 'dañado'];

export const CONDICIONES = ['Nuevo', 'Bueno', 'Regular', 'Dañado'];

export const PAGE_TITLES = {
  dashboard: 'Dashboard',
  inventario: 'Inventario',
  recepciones: 'Recepciones',
  entregas: 'Entregas',
  reportes: 'Reportes',
  configuracion: 'Configuración',
};
