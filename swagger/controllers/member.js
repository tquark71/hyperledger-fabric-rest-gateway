var hyUtil = require('../../hyperledgerUtil')
var response = require('../../API/response')

module.exports.getUserNameList = (req, res, next) => {
    var errMsg = "";
    var body = req.swagger.params.request.value
    var user = body.user
    if (!user) {
        errMsg += "Missing user obj"
    }
    if (errMsg != "") {
        response.returnFailed(errMsg, res)
    } else {
        hyUtil.user.matchUserDb(user.enrollID, user.enrollSecret).then((result) => {
            if (user.enrollID == hyUtil.user.orgAdminEnrollID || user.enrollID == hyUtil.user.caAdminEnrollID) {
                response.returnSuccess(hyUtil.user.getUserNameList(), res)
            } else {
                response.returnFailed("Auth Failed", res)
            }
        }, (err) => {
            response.returnFailed("Auth Failed", res)
        })
    }
}


module.exports.getCertification = (req, res, next) => {

    var errMsg = "";
    var body = req.swagger.params.request.value
    var user = body.user
    if (!user) {
        errMsg += "Missing user obj"
    }
    if (errMsg != "") {
        response.returnFailed(errMsg, res)
    } else {
        hyUtil.user.matchUserDb(user.enrollID, user.enrollSecret).then((result) => {
            var userObj = hyUtil.user.getUser(user.enrollID);
            var identity = userObj.getIdentity();
            var noneShifCert = identity._certificate.replace(/\n/g, '')
            response.returnSuccess(noneShifCert, res)
        }, (err) => {
            response.returnFailed("Auth Failed", res)
        })
    }
}

module.exports.registerAndEnrollUser = (req, res, next) => {
    var errMsg = "";
    var body = req.swagger.params.request.value
    var username = body.username
    var password = body.password
    var user = body.user
    var errMsg = response.checkParams(body, ["username", "password", "user"])
    if (errMsg != "") {
        response.returnFailed(errMsg, res)
    } else {
        hyUtil.user.matchUserDb(user.enrollID, user.enrollSecret).then((result) => {
            var userObj = hyUtil.user.getUser(user.enrollID)
            return hyUtil.user.registerAndEnrollUser(username, password, userObj)
        }).then((result) => {
            response.returnSuccess(result, res)
        }).catch((err) => {
            response.returnFailed(err, res)
        })
    }
}