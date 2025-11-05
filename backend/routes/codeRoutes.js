// backend/routes/codeRoutes.js
const express = require('express');
const router = express.Router();
const codeController = require('../controllers/codeController');
const auth = require('../middlewares/authMiddleware');

router.get('/', auth, codeController.listSnippets);
router.post('/', auth, codeController.createSnippet);
router.get('/:id', auth, codeController.getSnippet);
router.put('/:id', auth, codeController.updateSnippet);
router.delete('/:id', auth, codeController.deleteSnippet);

// New endpoints: favorites, pinned, and tags summary
router.post('/:id/favorite', auth, codeController.toggleFavorite);
router.post('/:id/pin', auth, codeController.togglePinned);
router.get('/tags/summary', auth, codeController.tagsSummary);

module.exports = router;