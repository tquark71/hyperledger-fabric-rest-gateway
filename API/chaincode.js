var router = require('./index')
var config = require('../config')
var hyUtil = require('../hyperledgerUtil')
var log4js = require('log4js');
var hfc = require('fabric-client');
var logger = log4js.getLogger('API/chaincode');
var response = require('./response')
logger.setLevel(config.logLevel);
hfc.setLogger(logger);

// router.post('/chaincode/invoke', function(req, res) {
//     var errMsg = "";
//     var body = req.body
//     var channelName = body.channelName;
//     var chaincodeName = body.chaincodeName;
//     var functionName = body.functionName;
//     var args = body.args
//     var opt = body.opt
//     var user = body.user
//     var errMsg = response.checkParams(body, ["channelName", "chaincodeName", "functionName", "args", "user"])
//     if (errMsg != "") {
//         response.returnFailed(errMsg, res)
//     } else {
//         hyUtil.user.matchUserDb(user.enrollID, user.enrollSecret).then((result) => {
//             var userObj = hyUtil.user.getUser(user.enrollID)
//             return hyUtil.chaincodeTrigger.invokeChaincode(channelName, chaincodeName, functionName, args, userObj, opt)
//         }).then((result) => {
//             response.returnSuccess(result, res)
//         }).catch((err) => {
//             response.returnFailed(err, res)
//         })
//     }

// });
// router.post('/chaincode/invokeE', function(req, res) {
//     var errMsg = "";
//     var body = req.body
//     var channelName = body.channelName;
//     var chaincodeName = body.chaincodeName;
//     var functionName = body.functionName;
//     var args = body.args
//     var opt = body.opt
//     var user = body.user
//     var errMsg = response.checkParams(body, ["channelName", "chaincodeName", "functionName", "args", "user"])
//     if (errMsg != "") {
//         response.returnFailed(errMsg, res)
//     } else {
//         hyUtil.user.matchUserDb(user.enrollID, user.enrollSecret).then((result) => {
//             var userObj = hyUtil.user.getUser(user.enrollID)
//             return hyUtil.chaincodeTrigger.invokeChaincodeByEndorsePolice(channelName, chaincodeName, functionName, args, userObj, opt)
//         }).then((result) => {
//             response.returnSuccess(result, res)
//         }).catch((err) => {
//             response.returnFailed(err, res)
//         })
//     }

// });
// router.post('/chaincode/query', function(req, res) {
//     var body = req.body
//     var channelName = body.channelName;
//     var chaincodeName = body.chaincodeName;
//     var functionName = body.functionName;
//     var args = body.args
//     var opt = body.opt
//     var user = body.user
//     var errMsg = response.checkParams(body, ["channelName", "chaincodeName", "functionName", "args", "user"])
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
//                     .chaincodeTrigger
//                     .queryChaincode(channelName, chaincodeName, functionName, args, userObj, opt)
//             }).then((result) => {
//                 response.returnSuccess(result, res)
//             }).catch((err) => {
//                 response.returnFailed(err, res)
//             })
//     }

// });

// router.post('/chaincode/queryHistory', function(req, res) {
//     var body = req.body
//     var channelName = body.channelName;
//     var chaincodeName = body.chaincodeName;
//     var functionName = body.functionName;
//     var args = body.args
//     var opt = body.opt
//     var user = body.user
//     var errMsg = response.checkParams(body, ["channelName", "chaincodeName", "functionName", "args", "user"])
//     if (errMsg != "") {
//         response.returnFailed(errMsg, res)
//     } else {
//         hyUtil
//             .user
//             .matchUserDb(user.enrollID, user.enrollSecret)
//             .then((result) => {
//                 var userObj = hyUtil.user.getUser(user.enrollID)
//                 return hyUtil.chaincodeTrigger.queryHistory(channelName, chaincodeName, functionName, args, userObj, opt)
//             }).then((result) => {
//                 response.returnSuccess(result, res)
//             }).catch((err) => {
//                 response.returnFailed(err, res)
//             })
//     }

// });

// router.post('/chaincode/instantiate', function(req, res) {

//     var body = req.body

//     var channelName = body.channelName;

//     var chaincodeName = body.chaincodeName;

//     var chaincodeVersion = body.chaincodeVersion;

//     var functionName = body.functionName;

//     var args = body.args

//     var user = body.user
//     var opt = body.opt
//     var errMsg = response.checkParams(body, [
//         "channelName",
//         "chaincodeName",
//         "chaincodeVersion",
//         "functionName",
//         "args",
//         "user"
//     ])
//     if (errMsg != "") {
//         response.returnFailed(errMsg, res)
//     } else {
//         hyUtil
//             .user
//             .matchUserDb(user.enrollID, user.enrollSecret)
//             .then((result) => {

//                 var userObj = hyUtil.user.getUser(user.enrollID)

//                 return hyUtil.channels[channelName].initialize(userObj)
//             }).then((result) => {
//                 var userObj = hyUtil.user.getUser(user.enrollID)
//                 return hyUtil.chaincodeTrigger.instantiateChaincode(channelName, chaincodeName, chaincodeVersion, functionName, args, userObj, opt)
//             }).then((result) => {
//                 response.returnSuccess(result, res)
//             }, (err) => {
//                 response.returnFailed(err, res)
//             })
//     }

// });
// router.post('/chaincode/upgrade', function(req, res) {
//     var errMsg = "";
//     var body = req.body
//     var channelName = body.channelName;

//     var chaincodeName = body.chaincodeName;

//     var chaincodePath = body.chaincodePath;

//     var chaincodeVersion = body.chaincodeVersion;

//     var functionName = body.functionName;

//     var args = body.args

//     var user = body.user
//     var opt = body.opt

//     var errMsg = response.checkParams(body, [
//         "channelName",
//         "chaincodeName",
//         "chaincodeVersion",
//         "functionName",
//         "args",
//         "user"
//     ])
//     if (errMsg != "") {
//         response.returnFailed(errMsg, res)
//     } else {
//         hyUtil
//             .user
//             .matchUserDb(user.enrollID, user.enrollSecret)
//             .then((result) => {
//                 var userObj = hyUtil.user.getUser(user.enrollID)
//                 return hyUtil.channels[channelName].initialize(userObj)
//             }).then((result) => {
//                 var userObj = hyUtil.user.getUser(user.enrollID)
//                 return hyUtil.chaincodeTrigger.upgradeChaincode(channelName, chaincodeName, chaincodePath, chaincodeVersion, functionName, args, userObj, opt)
//             }).then((result) => {
//                 response.returnSuccess(result, res)
//             }).catch((err) => {
//                 response.returnFailed(err, res)
//             })
//     }

// });
// router.post('/chaincode/install', function(req, res) {
//     var errMsg = "";
//     var body = req.body
//     var channelName = body.channelName;

//     var chaincodeName = body.chaincodeName;

//     var chaincodePath = body.chaincodePath;

//     var chaincodeVersion = body.chaincodeVersion;
//     var sourceType = body.sourceType;
//     var user = body.user
//     var opt = body.opt
//     var errMsg = response.checkParams(body, ["channelName", "chaincodeName", "chaincodePath", "chaincodeVersion", "sourceType", "user"])
//     if (errMsg != "") {
//         response.returnFailed(errMsg, res)
//     } else {
//         hyUtil
//             .user
//             .matchUserDb(user.enrollID, user.enrollSecret)
//             .then((result) => {
//                 var userObj = hyUtil.user.getUser(user.enrollID)
//                 return hyUtil.chaincodeTrigger.installChaincode(channelName, chaincodeName, sourceType, chaincodePath, chaincodeVersion, userObj, opt)
//             }).then((result) => {
//                 response.returnSuccess(result, res)
//             }, (err) => {
//                 response.returnFailed(err, res)
//             })
//     }

// });



// router.post('/chaincode/installed', function(req, res) {

//     var errMsg = "";
//     var body = req.body
//     var peerName = body.peerName;
//     var user = body.user
//     var errMsg = response.checkParams(body, ["peerName", "user"])
//     if (errMsg != "") {
//         response.returnFailed(errMsg, res)
//     } else {
//         hyUtil
//             .user
//             .matchUserDb(user.enrollID, user.enrollSecret)
//             .then((result) => {
//                 var userObj = hyUtil.user.getUser(user.enrollID)
//                 return hyUtil.channelAPI.getInstalledChaincodes("", peerName, "installed", userObj)
//             }).then((result) => {
//                 response.returnSuccess(result, res)
//             }, (err) => {
//                 response.returnFailed(err, res)
//             })
//     }

// });

module.exports = router;