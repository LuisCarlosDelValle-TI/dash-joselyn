const db = require('../db');

// ¡IMPORTANTE! Reemplaza 'mi_cloud_name' con el nombre real de tu Cloudinary
const CLOUDINARY_BASE_URL = 'https://res.cloudinary.com/dro3tllwz/image/upload/';

// --- FUNCIÓN MODIFICADA: listProducts (GET /api/products) ---
async function listProducts(req, res) {
  try {
    // 1. Incluimos 'cloudinary_public_id' en la selección de la base de datos
    const result = await db.query('SELECT id, name, description, price, stock, image_id FROM products ORDER BY id');

    // 2. Mapeamos para construir la URL completa de la imagen
    const productsWithUrl = result.rows.map(p => {
      let imageUrl = null;

      // Si el producto tiene un ID público, construimos la URL que el frontend necesita
      if (p.image_id) {
        imageUrl = CLOUDINARY_BASE_URL + p.image_id;
      }

      return {
        ...p,
        // Añadimos el campo 'image_url' que el dashboard/app usará
        image_url: imageUrl
      };
    });

    res.json(productsWithUrl);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
}

async function deleteProduct(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID de producto inválido.' });

  try {
    // Ejecutamos la eliminación en la tabla products
    const result = await db.query('DELETE FROM products WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Producto no encontrado.' });
    }

    // Si la eliminación fue exitosa, respondemos con 204 No Content
    res.status(204).send();

  } catch (err) {
    console.error("Error al eliminar producto:", err);
    // Manejo específico del error de clave foránea (si el producto tiene pedidos)
    if (err.code === '23503') { // Código de error PostgreSQL para violación de foreign key
      return res.status(409).json({ error: 'No se puede eliminar el producto, tiene pedidos asociados o está referenciado en otra tabla.' });
    }
    res.status(500).json({ error: 'Error al eliminar producto.' });
  }
}

async function updateProduct(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID de producto inválido.' });

  // Desestructuramos los campos que vienen del formulario de edición del Dashboard
  const { name, description, price, stock, image_id } = req.body;

  // Validación de campos obligatorios
  if (!name || price == null || stock == null || !image_id) {
    return res.status(400).json({ error: 'Faltan campos obligatorios para la actualización: nombre, precio, stock o ID de imagen.' });
  }

  try {
    // Ejecutamos la actualización de todos los campos
    const result = await db.query(
      `UPDATE products 
             SET name = $2, description = $3, price = $4, stock = $5, image_id = $6
             WHERE id = $1
             RETURNING id, name, description, price, stock, image_id`,
      [id, name, description || null, price, stock, image_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Producto no encontrado para actualizar.' });
    }

    const updatedProduct = result.rows[0];
    let imageUrl = null;

    if (updatedProduct.image_id) {
      imageUrl = CLOUDINARY_BASE_URL + updatedProduct.image_id;
    }

    // Devolvemos el producto actualizado con la URL completa
    res.json({ ...updatedProduct, image_url: imageUrl });

  } catch (err) {
    console.error("Error al actualizar producto:", err);
    res.status(500).json({ error: 'Error al actualizar producto.' });
  }
}

async function getProduct(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID inválido' });
  try {
    // 1. Incluimos 'cloudinary_public_id' en la selección de la base de datos
    const result = await db.query('SELECT id, name, description, price, stock, image_id FROM products WHERE id = $1', [id]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });

    // 2. Construimos la URL para el producto individual también
    const product = result.rows[0];
    let imageUrl = null;

    if (product.image_id) {
      imageUrl = CLOUDINARY_BASE_URL + product.image_id;
    }

    res.json({ ...product, image_url: imageUrl });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener producto' });
  }
}

// --- FUNCIÓN MODIFICADA: createProduct (POST /api/products) ---
async function createProduct(req, res) {
  // 1. Desestructuramos el nuevo campo del cuerpo JSON (viene del Dashboard)
  const { name, description, price, stock, image_id } = req.body;

  if (!name || price == null || stock == null || !image_id) {
    // 2. Incluimos el ID de la imagen como obligatorio
    return res.status(400).json({ error: 'Faltan campos obligatorios, incluyendo el ID de la imagen.' });
  }

  try {
    // 3. Incluimos 'cloudinary_public_id' en la consulta INSERT
    const result = await db.query(
      'INSERT INTO products (name, description, price, stock, image_id) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, description, price, stock, image_id',
      [name, description || null, price, stock, image_id] // <-- Pasamos el ID público como $5
    );

    const newProduct = result.rows[0];
    let imageUrl = null;

    if (newProduct.image_id) {
      imageUrl = CLOUDINARY_BASE_URL + newProduct.image_id;
    }

    // Devolvemos el producto creado con la URL completa
    res.status(201).json({ ...newProduct, image_url: imageUrl });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear producto' });
  }
}

module.exports = {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct
};