# Cisa TI · Sistema de Control de Equipos e Inventario

Vite + React + Supabase (persistencia en la nube).

## Estructura

```
src/
├── components/     Login, Sidebar, Modals, Badge, Empty
├── pages/          Dashboard, Inventario, Recepciones, Entregas, Reportes, Configuracion
├── services/
│   ├── supabase.js   ← REST API, fetchAll, upsert, patch, delete
│   └── constants.js
├── App.jsx           ← estado + sync + CRUD
└── App.css
SETUP.sql             ← schema para crear tablas en Supabase
```


## 1. Correr la app

```bash
npm install
npm run dev
```

## Tablas

`equipos` · `recepciones` · `entregas` · `devoluciones` · `empleados` · `usuarios` · `activities`


## Cola de sincronización offline

Si no hay internet o falla la red:

1. La UI se actualiza al instante (optimistic).
2. La operación se guarda en `localStorage` (`cisa_sync_queue`).
3. Al reconectar (evento `online`) o al pulsar **Sincronizar ahora**, se vacía la cola hacia Supabase.
4. El sidebar muestra `N en cola` / `N pendiente(s)`.
5. Tras 5 fallos seguidos de un ítem, se descarta.


## Conflictos de datos

Cada registro lleva `updated_at`. Al sincronizar la cola:

1. Se lee la versión actual en Supabase.
2. Si `server.updated_at > baseUpdatedAt` del cambio local → **conflicto**.
3. Estrategia (Configuración):
   - **Server wins** (default): se descarta el cambio local y se recargan datos.
   - **Client wins**: se fuerza el write local.


