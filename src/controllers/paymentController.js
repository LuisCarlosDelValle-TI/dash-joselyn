// src/controllers/paymentController.js

const db = require('../db');
// Asegúrate de que dotenv esté cargado en server.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// --- Función Principal: processPayment ---
async function processPayment(req, res) {
    // 1. Desestructuración de datos (vienen de la App Móvil)
    // El frontend nos envía el orderId y el token (usaremos tok_visa)
    const { orderId, token, totalAmount, currency = 'usd' } = req.body;

    if (!orderId || !token) {
        return res.status(400).json({ error: 'Faltan orderId o el token de pago.' });
    }

    let orderStatus = 'failed';
    let transactionId = null;

    try {
        // 2. OBTENER MONTO TOTAL SEGURO de la Base de Datos
        // NOTA: NUNCA confiamos en el monto que viene del móvil (totalAmount),
        // siempre lo obtenemos de la DB para evitar fraudes.
        const orderResult = await db.query('SELECT total_amount FROM orders WHERE id = $1', [orderId]);

        if (orderResult.rows.length === 0) {
            orderStatus = 'failed';
            throw new Error('Orden no encontrada en la base de datos. No se puede cobrar.');
        }

        // El monto que usaremos para el cobro es el de la DB
        const totalAmountDB = parseFloat(orderResult.rows[0].total_amount);

        // Stripe usa centavos/unidad mínima de moneda (multiplicamos por 100 y redondeamos)
        const amountInCents = Math.round(totalAmountDB * 100);

        // 3. PROCESAR EL CARGO CON STRIPE
        const charge = await stripe.charges.create({
            amount: amountInCents,
            currency: currency,
            source: token, // El token de tarjeta fijo (tok_visa) o real
            description: `Cargo para la Orden #${orderId}`,
        });

        transactionId = charge.id;
        orderStatus = 'paid'; // Éxito, ya que tok_visa siempre pasa

        // 4. RESPUESTA AL MÓVIL (para que el frontend actualice)
        res.status(200).json({
            success: true,
            message: 'Pago procesado exitosamente.',
            folio: transactionId,
            status: orderStatus
        });

    } catch (error) {
        // 5. MANEJO DE ERRORES DE PAGO (Tarjeta rechazada, etc.)
        console.error("Error de Pago de Stripe:", error.message);
        transactionId = transactionId || 'N/A';
        orderStatus = 'failed';

        const userMessage = error.type === 'StripeCardError' ? error.message : 'Error al procesar el pago. Revise la clave o los detalles.';

        if (!res.headersSent) {
            res.status(402).json({
                success: false,
                status: 'failed',
                error: userMessage
            });
        }
    } finally {
        // 6. ACTUALIZACIÓN DE ESTADO EN LA DB (se ejecuta siempre)
        // Usamos [orderStatus, transactionId, orderId]
        await db.query(
            `UPDATE orders 
             SET payment_status = $1, transaction_id = $2, payment_date = NOW() 
             WHERE id = $3`,
            [orderStatus, transactionId, orderId]
        ).catch(dbErr => console.error("Error al actualizar la BD después del pago:", dbErr));
    }
}

module.exports = {
    processPayment
};