var router = require('./index')
var config = require('../config')
var hyUtil = require('../hyperledgerUtil')
var log4js = require('log4js');
var hfc = require('fabric-client');
var logger = log4js.getLogger('API/client');
var response = require('./response')
logger.setLevel(config.logLevel);
hfc.setLogger(logger);

// router.post('/client/member/list', function(req, res) {
//     var errMsg = "";
//     var body = req.body
//     var user = body.user
//     if (!user) {
//         errMsg += "Missing user obj"
//     }
//     if (errMsg != "") {
//         response.returnFailed(errMsg, res)
//     } else {
//         hyUtil.user.matchUserDb(user.enrollID, user.enrollSecret).then((result) => {
//             if (user.enrollID == hyUtil.user.orgAdminEnrollID || user.enrollID == hyUtil.user.caAdminEnrollID) {
//                 response.returnSuccess(hyUtil.user.getUserNameList(), res)
//             } else {
//                 response.returnFailed("Auth Failed", res)
//             }
//         }, (err) => {
//             response.returnFailed("Auth Failed", res)
//         })
//     }


// })

// router.post('/client/member/cert', function(req, res) {
//     var errMsg = "";
//     var body = req.body
//     var user = body.user
//     if (!user) {
//         errMsg += "Missing user obj"
//     }
//     if (errMsg != "") {
//         response.returnFailed(errMsg, res)
//     } else {
//         hyUtil.user.matchUserDb(user.enrollID, user.enrollSecret).then((result) => {
//             var userObj = hyUtil.user.getUser(user.enrollID);
//             var identity = userObj.getIdentity();
//             var noneShifCert = identity._certificate.replace(/\n/g, '')
//             response.returnSuccess(noneShifCert, res)
//         }, (err) => {
//             response.returnFailed("Auth Failed", res)
//         })
//     }


// })



// router.post('/client/member/complete', function(req, res) {
//     var errMsg = "";
//     var body = req.body
//     var userName = body.userName
//     var password = body.password
//     var user = body.user
//     var errMsg = response.checkParams(body, ["userName", "password", "user"])
//     if (errMsg != "") {
//         response.returnFailed(errMsg, res)
//     } else {
//         hyUtil.user.matchUserDb(user.enrollID, user.enrollSecret).then((result) => {
//             var userObj = hyUtil.user.getUser(user.enrollID)
//             return hyUtil.user.registerAndEnrollUser(userName, password, userObj)
//         }).then((result) => {
//             response.returnSuccess(result, res)
//         }).catch((err) => {
//             response.returnFailed(err, res)
//         })
//     }
// });