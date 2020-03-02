const express = require('express');
const router = express.Router();
const ParsePdfController = require('../controllers/parsepdf-controller');

router.get('', ParsePdfController.getWeekPlanData);

module.exports = router;
