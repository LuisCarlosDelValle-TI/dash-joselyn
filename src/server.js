const express = require('express');
const cors = require('cors');
const db = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// NOTA: no servimos archivos estáticos aquí por petición del usuario;
// este servidor expone únicamente la API. El frontend puede abrirse
// desde file:// o desde otro servidor y usar apiBase = 'http://localhost:3000'.
app.use(cors({ origin: true }));
app.use(express.json());

const productsRouter = require('./routes/products');
const ordersRouter = require('./routes/orders');
const paymentRoutes = require('./routes/payment');

// Rutas modularizadas
app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/payment', paymentRoutes);

// Ruta raíz informativa y health
app.get('/', (req, res) => res.json({ status: 'ok', message: 'API activa. Usa /api/products, /api/orders, etc.' }));

// Logging simple de peticiones
app.use((req, res, next) => {
  console.log(new Date().toISOString(), req.method, req.originalUrl);
  next();
});

// Al arrancar, comprobamos si la BD responde (no bloqueante) y arrancamos el servidor
(async () => {
  try {
    await db.query('SELECT 1');
    console.log('Conexión a la base de datos: OK');
  } catch (err) {
    console.error('Conexión a la base de datos: FALLÓ —', err.message || err);
  }

  app.listen(PORT, '0.0.0.0', () =>
    console.log(`API escuchando en 0.0.0.0${PORT}`));
})();
