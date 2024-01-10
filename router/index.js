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
const jumperRequestHandler = require('../controllers/jumperRequestHandler');
const user = require('../controllers/user');

// routes for the services being called from UI
router.post('/verifyJumperSavedToken', jumperToken.verifyJumperSavedToken);
router.post('/generateToken', jumperToken.generateToken);
router.post('/user', jumperUser.newUser);

// routes for the services being called from MoEngage
router.get('/refresh_token', jumperToken.refreshAllToken);
router.get('/refresh_single_token', jumperToken.refreshToken);
router.get('/list_jumper_templates', jumperTemplate.fetchWaTemplates);
router.post('/jumper_callback', jumperRequestHandler.jumperCallback);
router.post('/send_whatsapp_task_queue', taskQueue.moEngageTaskQueue);
router.post('/jumper_send_whatsapp', jumperMessage.sendWhatsAppMessage);
router.get('/user', user.user);



module.exports = router;

