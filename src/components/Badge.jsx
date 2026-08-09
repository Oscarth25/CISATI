export default function Badge({ estado }) {
  const map = {
    disponible: 'badge-disponible ✅',
    entregado: 'badge-entregado 📤',
    mantenimiento: 'badge-mantenimiento 🔧',
    dañado: 'badge-dañado ⚠️',
  };
  const [cls, icon] = (map[estado] || 'badge-disponible ✅').split(' ');
  return <span className={`badge ${cls}`}>{icon} {estado}</span>;
}
