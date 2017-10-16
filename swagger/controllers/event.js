var hyUtil = require('../../hyperledgerUtil')
var response = require('../../API/response')

module.exports.registerEventToUrl = (req, res, next) => {
    var body = req.swagger.params.request.value;
    var peerName = body.peerName;
    var user = body.user
    var url = body.url
    var chaincodeName;
    var eventName;
    var type;
    if (req.swagger.params.request.path[1].indexOf('ccEvent') > -1) {
        type = 'ccEvent';
        chaincodeName = body.chaincodeName;
        eventName = body.eventName;
    } else {
        type = 'blockEvent';
    }

    var errMsg = response.checkParams(body, [
        "peerName",
        "user",
        "url"
    ])
    if (errMsg != "") {
        response.returnFailed(errMsg, res)
    } else {
        hyUtil
            .user
            .matchUserDb(user.enrollID, user.enrollSecret)
            .then((result) => {
                var userObj = hyUtil.user.getUser(user.enrollID)
                return hyUtil.eventHub.registerEventToUrl(type, peerName, url, userObj, true, {
                    chaincodeName: chaincodeName,
                    eventName: eventName
                })
            }).then((result) => {
                response.returnSuccess(result, res)
            }, (err) => {
                response.returnFailed(err, res)
            })
    }
}

module.exports.unregisterEventToUrl = (req, res, next) => {
    var body = req.swagger.params.request.value;;
    var peerName = body.peerName;
    var user = body.user
    var url = body.url
    var chaincodeName;
    var eventName;
    var type;
    var errMsg = ""
    if (req.swagger.params.request.path[1].indexOf('ccEvent') > -1) {
        type = 'ccEvent';
        chaincodeName = body.chaincodeName;
        eventName = body.eventName;
    } else {
        type = 'blockEvent'
    }
    if (errMsg != "") {
        response.returnFailed(errMsg, res)
    } else {
        hyUtil
            .user
            .matchUserDb(user.enrollID, user.enrollSecret)
            .then((result) => {
                var userObj = hyUtil.user.getUser(user.enrollID)
                return hyUtil.eventHub.unregisterEventToUrl(type, peerName, url, {
                    chaincodeName: chaincodeName,
                    eventName: eventName
                })
            }).then((result) => {
                response.returnSuccess(result, res)
            }, (err) => {
                response.returnFailed(err, res)
            })
    }
}

module.exports.returnAllEventHistory = (req, res, next) => {
    var body = req.swagger.params.request.value;
    var peerName = body.peerName;
    var user = body.user
    var errMsg = response.checkParams(body, [
        "peerName",
        "user"
    ])
    if (errMsg != "") {
        response.returnFailed(errMsg, res)
    } else {
        hyUtil
            .user
            .matchUserDb(user.enrollID, user.enrollSecret)
            .then((result) => {
                var userObj = hyUtil.user.getUser(user.enrollID)
                return hyUtil.eventHub.returnAllEventHistory(peerName)
            }).then((result) => {
                response.returnSuccess(result, res)
            }, (err) => {
                response.returnFailed(err, res)
            })
    }
}


module.exports.returnFailedEventHistory = (req, res, next) => {
    var body = req.swagger.params.request.value;
    var peerName = body.peerName;
    var user = body.user
    var errMsg = response.checkParams(body, [
        "peerName",
        "user"
    ])
    if (errMsg != "") {
        response.returnFailed(errMsg, res)
    } else {
        hyUtil
            .user
            .matchUserDb(user.enrollID, user.enrollSecret)
            .then((result) => {
                var userObj = hyUtil.user.getUser(user.enrollID)
                return hyUtil.eventHub.returnFailedEventHistory(peerName)
            }).then((result) => {
                response.returnSuccess(result, res)
            }, (err) => {
                response.returnFailed(err, res)
            })
    }
}