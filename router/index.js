// eslint-disable-next-line new-cap
const router = require('express').Router();
const moEngageRequestsHandler = require('../controllers/moEngageRequestsHandler');
const jumperToken = require('../controllers/jumperToken');
const jumperTemplate = require('../controllers/jumperTemplate');
const jumperMessage = require('../controllers/jumperMessage');
const jumperUser = require('../controllers/user');
const taskQueue = require('../controllers/taskQueue');
const social = require('../controllers/social');
const auth = require('../controllers/auth');

// routes for the services being called from UI
router.post('/verifyJumperSavedToken', jumperToken.verifyJumperSavedToken);
router.post('/generateToken', jumperToken.generateToken);
router.post('/newUser', jumperUser.newUser);

// routes for the services being called from MoEngage
router.get('/refresh_token', jumperToken.refreshToken);

module.exports = router;

