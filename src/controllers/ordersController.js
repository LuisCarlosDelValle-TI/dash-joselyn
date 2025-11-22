const db = require('../db');

// Listar pedidos
async function listOrders(req, res) {
  try {
    const result = await db.query('SELECT id, customer_id, total_amount, payment_status, order_status FROM orders ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener pedidos' });
  }
}

// Obtener items de un pedido
async function getOrderItems(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID inválido' });
  try {
    const result = await db.query(
      `SELECT oi.id, oi.order_id, oi.product_id, p.name AS product_name, oi.quantity, oi.unit_price
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = $1`,
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener items del pedido' });
  }
}

// Crear pedido con items y decrementar stock en transacción
// body: { customer_id, payment_status, order_status, items: [{ product_id, quantity, unit_price }, ...] }
async function createOrder(req, res) {
  const { customer_id, payment_status, order_status, items } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Items requeridos' });

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // calcular total
    let total = 0;
    for (const it of items) {
      if (!it.product_id || !it.quantity || !it.unit_price) {
        throw { status: 400, message: 'Cada item requiere product_id, quantity y unit_price' };
      }
      total += Number(it.quantity) * Number(it.unit_price);
    }

    const insertOrder = await client.query(
      'INSERT INTO orders (customer_id, total_amount, payment_status, order_status) VALUES ($1, $2, $3, $4) RETURNING id',
      [customer_id || null, total, payment_status || 'pending', order_status || 'new']
    );
    const orderId = insertOrder.rows[0].id;

    // insertar items y ajustar stock
    for (const it of items) {
      // verificar stock disponible
      const p = await client.query('SELECT stock FROM products WHERE id = $1 FOR UPDATE', [it.product_id]);
      if (p.rows.length === 0) throw { status: 400, message: `Producto ${it.product_id} no existe` };
      const available = Number(p.rows[0].stock);
      if (available < it.quantity) throw { status: 400, message: `Stock insuficiente para producto ${it.product_id}` };

      await client.query(
        'INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES ($1, $2, $3, $4)',
        [orderId, it.product_id, it.quantity, it.unit_price]
      );

      await client.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [it.quantity, it.product_id]);
    }

    await client.query('COMMIT');
    res.status(201).json({ id: orderId, total });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(err);
    if (err && err.status) return res.status(err.status).json({ error: err.message });
    res.status(500).json({ error: 'Error al crear pedido' });
  } finally {
    client.release();
  }
}

module.exports = {
  listOrders,
  getOrderItems,
  createOrder
};
