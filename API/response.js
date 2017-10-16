var config = require('../config')
var log4js = require('log4js');
var logger = log4js.getLogger('respones');
logger.setLevel(config.logLevel);



function returnFailed(failReason, res) {
    if (failReason instanceof Error) {
        failReason = failReason.toString()
    }
    var reason = ""
    try {
        reason = failReason.toString()
    } catch (e) {

    }
    logger.error(JSON.stringify({
        sdkResult: failReason
    }))
    if (reason.indexOf('Auth') > -1) {
        res.status(401)

    } else if (reason.indexOf('Missing') > -1) {
        res.status(400)
    } else {
        res.status(500)
    }

    res.send(MakeSdkResult(failReason))


}

function returnSuccess(successReason, res) {
    logger.debug(JSON.stringify({
        sdkResult: successReason
    }))
    res.status(200)
    res.send(MakeSdkResult(successReason))
}

function MakeSdkResult(msg) {
    return JSON.stringify({
        sdkResult: msg
    })
}

function checkParams(body, paramList) {
    errMsg = ""
    paramList.forEach(function(param) {
        if (!body[param]) {
            errMsg += " Missing param " + param
        }
    });
    return errMsg
}

module.exports = {
    returnFailed: returnFailed,
    returnSuccess: returnSuccess,
    checkParams: checkParams
}