import { useState } from 'react';

export default function Login({ onLogin, notice }) {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const ok = onLogin(user.trim(), pass);
    if (!ok) setError(true);
  };

  return (
    <div id="login-screen">
      <div className="login-card">
        <div className="login-logo">
          <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="13" y="2" width="34" height="46" rx="6" fill="#fbe4e7" stroke="#c8102e" stroke-width="2.2"/>
            <rect x="17" y="7" width="26" height="17" rx="2.5" fill="#c8102e" opacity="0.12"/>
            <rect x="17" y="7" width="26" height="17" rx="2.5" stroke="#c8102e" stroke-width="1.4"/>
            <line x1="20" y1="11" x2="40" y2="11" stroke="#c8102e" stroke-width="1.2" stroke-linecap="round" opacity="0.7"/>
            <line x1="20" y1="15" x2="32" y2="15" stroke="#c8102e" stroke-width="1.2" stroke-linecap="round" opacity="0.5"/>
            <line x1="20" y1="19" x2="36" y2="19" stroke="#c8102e" stroke-width="1" stroke-linecap="round" opacity="0.3"/>
            <circle cx="21" cy="30" r="2.8" fill="#c8102e" opacity="0.8"/>
            <circle cx="30" cy="30" r="2.8" fill="#c8102e" opacity="0.8"/>
            <circle cx="39" cy="30" r="2.8" fill="#c8102e" opacity="0.8"/>
            <circle cx="21" cy="37" r="2.8" fill="#64748b" opacity="0.6"/>
            <circle cx="30" cy="37" r="2.8" fill="#64748b" opacity="0.6"/>
            <circle cx="39" cy="37" r="2.8" fill="#64748b" opacity="0.6"/>
            <circle cx="21" cy="43" r="2.8" fill="#64748b" opacity="0.4"/>
            <circle cx="30" cy="43" r="2.8" fill="#64748b" opacity="0.4"/>
            <circle cx="39" cy="43" r="2.8" fill="#64748b" opacity="0.4"/>
            <rect x="15" y="49" width="30" height="8" rx="4" fill="#c8102e" opacity="0.15" stroke="#c8102e" stroke-width="1.4"/>
            <line x1="19" y1="53" x2="41" y2="53" stroke="#c8102e" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <h1>Cisa TI</h1>
          <p>Sistema Control de Equipos e Inventario</p>
        </div>
        <div className="login-subtitle">Ingresa tus credenciales</div>
        {error && <div className="login-error" style={{display:'block'}}>⚠️ Usuario o contraseña incorrectos</div>}
        <form onSubmit={handleSubmit}>
          <div className="login-field">
            <label>Usuario</label>
            <input type="text" value={user} onChange={e => setUser(e.target.value)} placeholder="Tu nombre de usuario" autoComplete="off" />
          </div>
          <div className="login-field">
            <label>Contraseña</label>
            <input type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••" />
          </div>
          <button type="submit" className="btn-login">🔐 Iniciar Sesión</button>
        </form>
        {notice && <div className="supabase-notice" style={{display:'block'}}>⚠️ Modo offline: configura Supabase en el panel de Configuración para sincronización multi-equipo.</div>}
      </div>
    </div>
  );
}
