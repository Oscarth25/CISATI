export default function Empty({ icon = '📭', text = 'Sin datos' }) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <p>{text}</p>
    </div>
  );
}
