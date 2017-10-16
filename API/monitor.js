var router = require('./index')
var config = require('../config')
var log4js = require('log4js');
var monitor = require('../monitor')
var logger = log4js.getLogger('API/monitor');
var networkConfig = require('../network-config')
var myOrgName = config.orgName;
var response = require('./response')
var Dbs = require('../Db')
var passport = require('passport');

logger.setLevel(config.logLevel);
router.get("/monitor*",
function(req, res, next){
  console.log(req.get('Authorization'));
  next();
});
router.use('/monitor*', passport.authenticate('jwt',{ session: false }),
function(req, res, next) {
    logger.debug('monitor login check')
    if (req.isAuthenticated()) {
        return next();
    } else {
        response.returnFailed('Auth failed plz login first', res)
    }
})
// router.get('/monitor/peer/info', function(req, res) {
//     var body = req.query
//     var peerName = body.peerName;
//     monitor.getPeer(peerName).then((peer) => {
//         return peer.returnPeerInfo()
//     }).then((result) => {
//         response.returnSuccess(result, res)
//     }).catch((e) => {
//         response.returnFailed(e, res)
//     })
// })
// router.get('/monitor/channel/info', function(req, res) {
//     var errMsg = "";
//     var body = req.query
//     var peerName = body.peerName
//     var channelName = body.channelName
//     var errMsg = response.checkParams(body, ["channelName", "peerName"])
//     if (errMsg != "") {
//         response.returnFailed(errMsg, res)
//     } else {
//         monitor.getPeer(peerName).then((peer) => {
//             return peer.returnChannelObj(channelName)
//         }).then((channelObj) => {
//             return channelObj.returnChannelInfo()
//         }).then((result) => {
//             response.returnSuccess(result, res)
//         }).catch((e) => {
//             response.returnFailed(e, res)
//         })
//     }
// })
// router.get('/monitor/block/info', function(req, res) {
//     var errMsg = "";
//     var body = req.query
//     var peerName = body.peerName
//     var channelName = body.channelName
//     var blockNumber = body.blockNumber
//     var errMsg = response.checkParams(body, ["channelName", "peerName", "blockNumber"])
//     if (errMsg != "") {
//         response.returnFailed(errMsg, res)
//     } else {
//         monitor.getPeer(peerName).then((peer) => {
//             return peer.returnChannelObj(channelName)
//         }).then((channelObj) => {
//             return channelObj.returnBlockInfo(blockNumber)
//         }).then((result) => {
//             response.returnSuccess(result, res)
//         }).catch((e) => {
//             response.returnFailed(e, res)
//         })
//     }
// })

// router.get('/monitor/tx/last', function(req, res) {
//     var errMsg = "";
//     var body = req.query
//     var peerName = body.peerName
//     var channelName = body.channelName
//     var lastNumber = body.lastNumber
//     var errMsg = response.checkParams(body, ["channelName", "peerName", "lastNumber"])
//     if (errMsg != "") {
//         response.returnFailed(errMsg, res)
//     } else {
//         monitor.getPeer(peerName).then((peer) => {
//             return peer.returnChannelObj(channelName)
//         }).then((channelObj) => {
//             return channelObj.returnLastTxs(lastNumber)
//         }).then((result) => {
//             response.returnSuccess(result, res)
//         }).catch((e) => {
//             response.returnFailed(e, res)
//         })
//     }
// })

// router.get('/monitor/chaincode/info', function(req, res) {
//     var errMsg = "";
//     var body = req.query
//     var peerName = body.peerName
//     var channelName = body.channelName
//     var chaincodeName = body.chaincodeName
//     var errMsg = response.checkParams(body, ["channelName", "peerName", "chaincodeName"])
//     if (errMsg != "") {
//         response.returnFailed(errMsg, res)
//     } else {
//         monitor.getPeer(peerName).then((peer) => {
//             return peer.returnChannelObj(channelName)
//         }).then((channelObj) => {
//             return channelObj.returnChaincodeInfo(chaincodeName)
//         }).then((result) => {
//             response.returnSuccess(result, res)
//         }).catch((e) => {
//             response.returnFailed(e, res)
//         })
//     }
// })

// router.get('/monitor/network/all', function(req, res) {
//     response.returnSuccess(networkConfig, res)
// })
// router.get('/monitor/network/my', function(req, res) {
//     response.returnSuccess(networkConfig['network-config'][myOrgName], res)
// })