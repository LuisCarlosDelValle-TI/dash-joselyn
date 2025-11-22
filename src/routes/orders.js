const express = require('express');
const router = express.Router();
const controller = require('../controllers/ordersController');

router.get('/', controller.listOrders);
router.get('/:id/items', controller.getOrderItems);
router.post('/', controller.createOrder);

module.exports = router;
