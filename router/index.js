// eslint-disable-next-line new-cap
const router = require('express').Router();
const moEngageRequestsHandler = require('../controllers/moEngageRequestsHandler');
const jumperToken = require('../controllers/jumperToken');
const jumperTemplate = require('../controllers/jumperTemplate');
const jumperMessage = require('../controllers/jumperMessage');
const jumperUser = require('../controllers/user');
const taskQueue = require('../controllers/taskQueue');
const social = require('../controllers/social');
// const auth = require('../controllers/auth');
const jumperRequestHandler = require('../controllers/jumperRequestHandler');
const user = require('../controllers/user');
const auth = require("../middleware/auth"); 
const jumperAuth = require("../middleware/jumperAuth"); 

// routes for the services being called from UI
router.post('/verifyToken', jumperToken.verifyToken);
router.post('/verifyJumperSavedToken', jumperAuth, jumperToken.verifyJumperSavedToken);
router.post('/generateToken', jumperAuth, jumperToken.generateToken);
router.post('/user', jumperAuth, jumperUser.newUser);
router.get('/user', jumperAuth, user.user);

// routes for the services being called from MoEngage
router.get('/refresh_token', jumperToken.refreshAllToken);
router.get('/refresh_single_token', jumperToken.refreshToken);
router.get('/list_jumper_templates', auth, jumperTemplate.fetchWaTemplates);
router.get('/get_jumper_templates', auth, jumperTemplate.fetchWaTemplate);
router.post('/jumper_callback', jumperRequestHandler.jumperCallback);
router.post('/send_whatsapp_task_queue', auth, taskQueue.moEngageTaskQueue);
router.post('/jumper_send_whatsapp', auth, jumperMessage.sendWhatsAppMessage);
router.get('/getSocialChannels', auth, social.getSocialChannels);



module.exports = router;

