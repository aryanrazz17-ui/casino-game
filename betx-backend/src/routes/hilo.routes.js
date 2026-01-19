const express = require('express');
const router = express.Router();
const hiloController = require('../controllers/hiloController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/game', hiloController.getGame);
router.post('/create', hiloController.create);
router.post('/bet', hiloController.bet);
router.post('/cashout', hiloController.cashout);

module.exports = router;
