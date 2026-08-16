/**
 * Phazon Backend — Search Routes
 */

'use strict';

const express = require('express');
const { searchGlobalEntities } = require('../controllers/searchController');
const { requireAuth } = require('../middleware/auth');
const { scopeGuard } = require('../middleware/scopeGuard');

const router = express.Router();

router.get('/', requireAuth, scopeGuard, searchGlobalEntities);

module.exports = router;
