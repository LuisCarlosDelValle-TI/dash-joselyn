// src/routes/payment.js

const express = require('express');
const router = express.Router();
const controller = require('../controllers/paymentController');

// Ruta que recibe el token de la tarjeta y el ID de la orden
router.post('/process', controller.processPayment);

module.exports = router;