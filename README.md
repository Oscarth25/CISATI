# Hunter Tools TI · Sistema de Inventario

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

## 1. Crear proyecto Supabase

1. Ve a [supabase.com](https://supabase.com) → New Project
2. En **SQL Editor** ejecuta el contenido de `SETUP.sql`
3. En **Settings → API** copia:
   - Project URL
   - `anon` `public` key

## 2. Correr la app

```bash
npm install
npm run dev
```
## 3. Conectar Supabase
1. Entra como Super Admin → **Configuración**
2. Pega URL y anon key → **Guardar y Conectar**
3. **Probar Conexión** debe responder OK
4. El estado en el sidebar pasa a `✓ HH:MM`

A partir de ahí:
- Agregar equipo / recepción se guarda en Supabase
- Cada 8 s se sincroniza el estado
- Botón **Sincronizar ahora** fuerza un pull
- Sin credenciales funciona en **modo local** (solo memoria del navegador)

## Tablas

`equipos` · `recepciones` · `entregas` · `devoluciones` · `empleados` · `usuarios` · `activities`


## Cola de sincronización offline

Si no hay internet o falla la red:

1. La UI se actualiza al instante (optimistic).
2. La operación se guarda en `localStorage` (`cisa_sync_queue`).
3. Al reconectar (evento `online`) o al pulsar **Sincronizar ahora**, se vacía la cola hacia Supabase.
4. El sidebar muestra `N en cola` / `N pendiente(s)`.
5. Tras 5 fallos seguidos de un ítem, se descarta.

Archivo: `src/services/syncQueue.js` — `enqueue`, `flushQueue`, `syncOrQueue`.


## Conflictos de datos

Cada registro lleva `updated_at`. Al sincronizar la cola:

1. Se lee la versión actual en Supabase.
2. Si `server.updated_at > baseUpdatedAt` del cambio local → **conflicto**.
3. Estrategia (Configuración):
   - **Server wins** (default): se descarta el cambio local y se recargan datos.
   - **Client wins**: se fuerza el write local.

Log de conflictos en `localStorage` (`cisa_sync_conflicts`), visible en Configuración.

Ejecuta de nuevo el final de `SETUP.sql` (columnas `updated_at` + triggers) si el proyecto Supabase ya existía.
