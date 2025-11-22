# Dashboard API (Node + Express)

Pequeña API para exponer las tablas `products`, `orders` y `order_items` de tu base de datos PostgreSQL.

**Archivos añadidos**
- `package.json` — dependencias y scripts
- `src/server.js` — servidor Express con endpoints básicos
- `src/db.js` — conexión a Postgres mediante `pg`
- `.env.example` — variables de entorno de ejemplo
- `index.html` — actualizado con ejemplos `fetch` para listar y crear productos

**Instalación y ejecución (PowerShell / Windows)**

1. Instala las dependencias:

```powershell
cd "c:\Users\luisc\OneDrive\Desktop\Dashboards-v3\Dashboard"
npm install
```

2. Crea un `.env` a partir del ejemplo y rellena tus credenciales de Postgres:

```powershell
copy .env.example .env
# editar .env con tu editor favorito y poner PG_USER, PG_PASSWORD, PG_DATABASE, etc.
```

3. Ejecuta en modo desarrollo:

```powershell
npm run dev
```

La API quedará escuchando en `http://localhost:3000` (o el puerto que indiques en `.env`).

**Endpoints disponibles (inicio rápido)**

- `GET /api/products` — lista productos
- `GET /api/products/:id` — obtiene un producto por id
- `POST /api/products` — crea un producto (body JSON: `name`, `description`, `price`, `stock`)
- `GET /api/orders` — lista pedidos
- `GET /api/orders/:id/items` — items de un pedido

Seguridad y siguientes pasos recomendados:
- Usa un usuario de base de datos con permisos mínimos (lectura/escritura solo a las tablas necesarias).
- Agrega autenticación (JWT / API keys) si la API va a ser pública.
- Restringe CORS al dominio de tu `index.html` para producción.
