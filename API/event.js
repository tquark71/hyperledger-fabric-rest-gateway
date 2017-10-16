// var router = require('./index')
// var config = require('../config')
// var hyUtil = require('../hyperledgerUtil')
// var log4js = require('log4js');
// var hfc = require('fabric-client');
// var logger = log4js.getLogger('API/event');
// var response = require('./response')
// logger.setLevel(config.logLevel);
// hfc.setLogger(logger);


// router.post('/event/unregister/ccEvent/url', function(req, res) {
//     var body = req.body;
//     var chaincodeName = body.chaincodeName;
//     var eventName = body.eventName;
//     var peerName = body.peerName;
//     var user = body.user
//     var url = body.url
//     var errMsg = response.checkParams(body, [
//         "chaincodeName",
//         "eventName",
//         "peerName",
//         "user",
//         "url"
//     ])
//     if (errMsg != "") {
//         response.returnFailed(errMsg, res)
//     } else {
//         hyUtil
//             .user
//             .matchUserDb(user.enrollID, user.enrollSecret)
//             .then((result) => {
//                 var userObj = hyUtil.user.getUser(user.enrollID)
//                 return hyUtil.eventHub.unregisterEventToUrl('ccEvent', peerName, url, {
//                     chaincodeName: chaincodeName,
//                     eventName: eventName
//                 })
//             }).then((result) => {
//                 response.returnSuccess(result, res)
//             }, (err) => {
//                 response.returnFailed(err, res)
//             })
//     }
// })


// router.post('/event/register/ccEvent/url', function(req, res) {
//     var body = req.body;
//     var chaincodeName = body.chaincodeName;
//     var eventName = body.eventName;
//     var peerName = body.peerName;
//     var user = body.user
//     var url = body.url
//     var errMsg = response.checkParams(body, [
//         "chaincodeName",
//         "eventName",
//         "peerName",
//         "user",
//         "url"
//     ])
//     if (errMsg != "") {
//         response.returnFailed(errMsg, res)
//     } else {
//         hyUtil
//             .user
//             .matchUserDb(user.enrollID, user.enrollSecret)
//             .then((result) => {
//                 var userObj = hyUtil.user.getUser(user.enrollID)
//                 return hyUtil.eventHub.registerEventToUrl('ccEvent', peerName, url, userObj, true, {
//                     chaincodeName: chaincodeName,
//                     eventName: eventName
//                 })
//             }).then((result) => {
//                 response.returnSuccess(result, res)
//             }, (err) => {
//                 response.returnFailed(err, res)
//             })
//     }
// })

// router.post('/event/register/blockEvent/url', function(req, res) {
//     var body = req.body;
//     var peerName = body.peerName;
//     var user = body.user
//     var url = body.url
//     var errMsg = response.checkParams(body, [
//         "peerName",
//         "user",
//         "url"
//     ])
//     if (errMsg != "") {
//         response.returnFailed(errMsg, res)
//     } else {
//         hyUtil
//             .user
//             .matchUserDb(user.enrollID, user.enrollSecret)
//             .then((result) => {
//                 var userObj = hyUtil.user.getUser(user.enrollID)
//                 return hyUtil.eventHub.registerEventToUrl('blockEvent', peerName, url, userObj, true)
//             }).then((result) => {
//                 response.returnSuccess(result, res)
//             }, (err) => {
//                 response.returnFailed(err, res)
//             })
//     }
// })

// router.post('/event/unregister/blockEvent/url', function(req, res) {
//     var body = req.body;
//     var peerName = body.peerName;
//     var user = body.user
//     var url = body.url
//     var errMsg = response.checkParams(body, [
//         "peerName",
//         "user",
//         "url"
//     ])
//     if (errMsg != "") {
//         response.returnFailed(errMsg, res)
//     } else {
//         hyUtil
//             .user
//             .matchUserDb(user.enrollID, user.enrollSecret)
//             .then((result) => {
//                 var userObj = hyUtil.user.getUser(user.enrollID)
//                 return hyUtil.eventHub.unregisterEventToUrl('blockEvent', peerName, url)
//             }).then((result) => {
//                 response.returnSuccess(result, res)
//             }, (err) => {
//                 response.returnFailed(err, res)
//             })
//     }
// })

// router.post('/event/history/all', function(req, res) {
//     var body = req.body;
//     var peerName = body.peerName;
//     var user = body.user
//     var errMsg = response.checkParams(body, [
//         "peerName",
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
//                 return hyUtil.eventHub.returnAllEventHistory(peerName)
//             }).then((result) => {
//                 response.returnSuccess(result, res)
//             }, (err) => {
//                 response.returnFailed(err, res)
//             })
//     }
// })

// router.post('/event/history/failed', function(req, res) {
//     var body = req.body;
//     var peerName = body.peerName;
//     var user = body.user
//     var errMsg = response.checkParams(body, [
//         "peerName",
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
//                 return hyUtil.eventHub.returnFailedEventHistory(peerName)
//             }).then((result) => {
//                 response.returnSuccess(result, res)
//             }, (err) => {
//                 response.returnFailed(err, res)
//             })
//     }
// })