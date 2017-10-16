var router = require('./index')
var config = require('../config')
var hyUtil = require('../hyperledgerUtil')
var log4js = require('log4js');
var hfc = require('fabric-client');
var path = require('path')
var logger = log4js.getLogger('API/channel');
var response = require('./response')
logger.setLevel(config.logLevel);
hfc.setLogger(logger);

// function returnFailed(failReason) {

//     return JSON.stringify({
//         sdkState: 0,
//         sdkResult: failReason
//     })
// }

// function returnSuccess(successReason) {
//     return JSON.stringify({
//         sdkState: 1,
//         sdkResult: successReason
//     })
// }
// router.post('/channels', function(req, res) {
//     var errMsg = "";
//     var body = req.body
//     var user = body.user
//     var peerName = body.peerName
//     var userObj
//     var errMsg = response.checkParams(body, ["peerName", "user"])
//     if (errMsg != "") {
//         response.returnFailed(errMsg, res)
//     } else {
//         hyUtil.user.matchUserDb(user.enrollID, user.enrollSecret).then((result) => {
//             userObj = hyUtil.user.getUser(user.enrollID)
//             return hyUtil.channelAPI.getChannels(peerName, userObj)
//         }).then((result) => {
//             response.returnSuccess(result, res)
//         }, (err) => {
//             response.returnFailed(err, res)
//         })
//     }

// });

// router.post('/channel/info', function(req, res) {
//     var errMsg = "";
//     var body = req.body;
//     var channelName = body.channelName;
//     var user = body.user;
//     var peerName = body.peerName;
//     var userObj
//     var errMsg = response.checkParams(body, ["peerName", "user", "channelName"])
//     if (errMsg != "") {
//         response.returnFailed(errMsg, res)
//     } else {
//         hyUtil.user.matchUserDb(user.enrollID, user.enrollSecret).then((result) => {
//             userObj = hyUtil.user.getUser(user.enrollID)
//             return hyUtil.channelAPI.getChainInfo(channelName, peerName, userObj)
//         }).then((result) => {
//             response.returnSuccess(result, res)
//         }, (err) => {
//             response.returnFailed(err, res)
//         })
//     }

// });

// router.post('/channel/addOrg', function(req, res) {
//     var errMsg = "";
//     var body = req.body
//     var user = body.user
//     var opt = body.opt
//     var sourceType = body.sourceType
//     var channelName = body.channelName
//     var userObj
//     var errMsg = response.checkParams(body, ["channelName", "opt", "sourceType", "user"])
//     if (errMsg != "") {
//         response.returnFailed(errMsg, res)
//     } else {
//         hyUtil.user.matchUserDb(user.enrollID, user.enrollSecret).then((result) => {
//             userObj = hyUtil.user.getUser(user.enrollID)
//             return hyUtil.configgen.addOrgAndGetConfigUpdatePb(channelName, userObj, sourceType, opt)
//         }).then((configUpdatePb) => {
//             return hyUtil.channelAPI.updateChannel(channelName, configUpdatePb, userObj)
//         }).then((result) => {
//             response.returnSuccess(result, res)
//         }, (err) => {
//             response.returnFailed(err, res)
//         })
//     }

// });
// router
//     .post('/channel/create', function(req, res) {
//         var errMsg = "";
//         var body = req.body
//         var channelName = body.channelName;
//         if (!channelName) {
//             errMsg += " Missing channelName "
//         }
//         var channelConfigSource = body.channelConfigSource;
//         if (!channelConfigSource) {
//             errMsg += " Missing channelConfigSource "
//         }
//         var user = body.user
//         if (!user) {
//             errMsg += "Missing user obj"
//         }
//         if (errMsg != "") {
//             response.returnFailed(errMsg, res)
//         } else {
//             hyUtil.user.matchUserDb(user.enrollID, user.enrollSecret).then((result) => {
//                 var userObj = hyUtil.user.getUser(user.enrollID)

//                 return hyUtil.channelAPI.createChannel(channelName, channelConfigSource, userObj)
//             }).then((result) => {
//                 response.returnSuccess(result, res)
//             }, (err) => {
//                 response.returnFailed(err, res)
//             })
//         }

//     });

// router.post('/channel/instantiated', function(req, res) {

//     var errMsg = "";
//     var body = req.body
//     var channelName = body.channelName;
//     var peerName = body.peerName;
//     var user = body.user
//     var errMsg = response.checkParams(body, ["channelName", "peerName", "user"])
//     if (errMsg != "") {
//         response.returnFailed(errMsg, res)
//     } else {
//         hyUtil
//             .user
//             .matchUserDb(user.enrollID, user.enrollSecret)
//             .then((result) => {
//                 var userObj = hyUtil.user.getUser(user.enrollID)
//                 return hyUtil.channelAPI.getInstalledChaincodes(channelName, peerName, "instantiated", userObj)
//             }).then((result) => {
//                 response.returnSuccess(result, res)
//             }, (err) => {
//                 response.returnFailed(err, res)
//             })
//     }

// });



// router.post('/channel/join', function(req, res) {

//     var errMsg = "";
//     var body = req.body
//     var channelName = body.channelName;
//     if (!channelName) {
//         errMsg += " Missing channelName "
//     }
//     var user = body.user
//     if (!user) {
//         errMsg += "Missing user obj"
//     }
//     if (errMsg != "") {
//         response.returnFailed(errMsg, res)
//     } else {
//         hyUtil
//             .user
//             .matchUserDb(user.enrollID, user.enrollSecret)
//             .then((result) => {
//                 var userObj = hyUtil.user.getUser(user.enrollID)
//                 return hyUtil.channelAPI.joinChannel(channelName, userObj)
//             }).then((result) => {
//                 response.returnSuccess(result, res)
//             }, (err) => {
//                 response.returnFailed(err, res)
//             })
//     }

// });
// ///can't convert config to JSON /////
// router.post('/channel/config', function(req, res) {
//     var errMsg = "";
//     var body = req.body
//     var channelName = body.channelName;
//     var writePath = body.writePath
//     if (!channelName) {
//         errMsg += " Missing channelName "
//     }
//     if (!hyUtil.channels[channelName]) {
//         errMsg += " Can't find " + channelName + "channel"
//     }
//     var user = body.user
//     if (!user) {
//         errMsg += "Missing user obj"
//     }
//     if (errMsg != "") {
//         response.returnFailed(errMsg, res)
//     } else {

//         hyUtil
//             .user
//             .matchUserDb(user.enrollID, user.enrollSecret)
//             .then((result) => {
//                 var userObj = hyUtil
//                     .user
//                     .getUser(user.enrollID)
//                 return hyUtil
//                     .channelAPI
//                     .getChannelConfig(channelName, userObj, writePath)
//             }).then((result) => {
//                 response.returnSuccess(result, res)
//             }, (err) => {
//                 response.returnFailed(err, res)
//             })
//     }

// });

// router.post('/channel/update', function(req, res) {
//     var errMsg = "";
//     var body = req.body
//     var channelName = body.channelName;
//     var configUpdatePath = body.configUpdatePath;
//     if (!channelName) {
//         errMsg += " Missing channelName "
//     }
//     if (!hyUtil.channels[channelName]) {
//         errMsg += " Can't find " + channelName + "channel"
//     }
//     var user = body.user
//     if (!user) {
//         errMsg += "Missing user obj"
//     }
//     if (!configUpdatePath) {
//         errMsg += "Missing configUpdatePath"
//     }
//     if (errMsg != "") {
//         response.returnFailed(errMsg, res)
//     } else {

//         hyUtil
//             .user
//             .matchUserDb(user.enrollID, user.enrollSecret)
//             .then((result) => {
//                 var userObj = hyUtil
//                     .user
//                     .getUser(user.enrollID)
//                 return hyUtil
//                     .channelAPI
//                     .updateChannel(channelName, configUpdatePath, userObj)
//             }).then((result) => {
//                 response.returnSuccess(result, res)
//             }, (err) => {
//                 response.returnFailed(err, res)
//             })
//     }

// });

// router.post('/channel/block/action', function(req, res) {
//     var errMsg = "";
//     var body = req.body
//     var channelName = body.channelName;
//     if (!channelName) {
//         errMsg += " Missing channelName "
//     }
//     if (!hyUtil.channels[channelName]) {
//         errMsg += " Can't find " + channelName + "channel"
//     }
//     var blockNum = body.blockNum
//     if (!blockNum && blockNum != 0) {
//         errMsg += "Missing block Number"
//     }
//     var user = body.user
//     if (!user) {
//         errMsg += "Missing user obj"
//     }
//     if (errMsg != "") {
//         response.returnFailed(errMsg, res)
//     } else {
//         var peerName = body.peerName
//         hyUtil.user.matchUserDb(user.enrollID, user.enrollSecret).then((result) => {
//             var userObj = hyUtil.user.getUser(user.enrollID)
//             return hyUtil.channelAPI.getBlockActionsByNumber(channelName, peerName, blockNum, userObj)
//         }).then((result) => {
//             response.returnSuccess(result, res)
//         }, (err) => {
//             response.returnFailed(err, res)
//         })
//     }

// });

// router.post('/channel/block/info', function(req, res) {
//     var errMsg = "";
//     var body = req.body
//     var channelName = body.channelName;
//     if (!channelName) {
//         errMsg += " Missing channelName "
//     }
//     if (!hyUtil.channels[channelName]) {
//         errMsg += " Can't find " + channelName + "channel"
//     }
//     var blockNum = body.blockNum
//     if (!blockNum && blockNum != 0) {
//         errMsg += "Missing block Number"
//     }
//     var user = body.user
//     if (!user) {
//         errMsg += "Missing user obj"
//     }
//     if (errMsg != "") {
//         response.returnFailed(errMsg, res)
//     } else {
//         var peerName = body.peerName
//         hyUtil.user.matchUserDb(user.enrollID, user.enrollSecret).then((result) => {
//             var userObj = hyUtil.user.getUser(user.enrollID)
//             return hyUtil.channelAPI.getBlockByNumber(channelName, peerName, blockNum, userObj)
//         }).then((result) => {
//             response.returnSuccess(result, res)
//         }).catch((err) => {
//             response.returnFailed(err, res)
//         })
//     }

// });

// router.post('/channel/init', function(req, res) {

//     var errMsg = "";
//     var body = req.body
//     var channelName = body.channelName;
//     if (!channelName) {
//         errMsg += " Missing channelName "
//     }
//     var user = body.user
//     if (!user) {
//         errMsg += "Missing user obj"
//     }
//     if (errMsg != "") {
//         response.returnFailed(errMsg, res)
//     } else {
//         hyUtil
//             .user
//             .matchUserDb(user.enrollID, user.enrollSecret)
//             .then((result) => {
//                 var userObj = hyUtil.user.getUser(user.enrollID)
//                 return hyUtil.channelAPI.initChannel(channelName, userObj)
//             }).then((result) => {
//                 response.returnSuccess(result, res)
//             }, (err) => {
//                 response.returnFailed(err, res)
//             })
//     }

// });

module.exports = router