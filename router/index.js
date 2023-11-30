// eslint-disable-next-line new-cap
const router = require('express').Router();
const sfmcRequestsHandler = require('../controllers/sfmcRequestsHandler');
const jumperToken = require('../controllers/jumperToken');
const jumperTemplate = require('../controllers/jumperTemplate');
const jumperMessage = require('../controllers/jumperMessage');
const jumperUser = require('../controllers/user');
const taskQueue = require('../controllers/taskQueue');
const social = require('../controllers/social');
const auth = require('../controllers/auth');

// routes for the services being called from MoEngage

// routes for the services being called from UI
router.post('/generateToken', jumperToken.generateToken);

module.exports = router;

