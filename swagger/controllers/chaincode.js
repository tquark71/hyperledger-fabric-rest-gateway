var hyUtil = require('../../hyperledgerUtil')
var response = require('../../API/response')

module.exports.chaincodeInstall = function(req, res, next) {
    console.log(req.swagger.params)
    var body = req.swagger.params.request.value
    var channelName = body.channelName;

    var chaincodeName = body.chaincodeName;

    var chaincodePath = body.chaincodePath;

    var chaincodeVersion = body.chaincodeVersion;
    var sourceType = body.sourceType;
    var langType = body.langType;
    var user = body.user
    var opt = body.opt
    var errMsg = response.checkParams(body, ["channelName", "chaincodeName", "chaincodePath", "chaincodeVersion", "sourceType", "user"])
    if (errMsg != "") {
        response.returnFailed(errMsg, res)
    } else {
        hyUtil
            .user
            .matchUserDb(user.enrollID, user.enrollSecret)
            .then((result) => {
                var userObj = hyUtil.user.getUser(user.enrollID)
                return hyUtil.chaincodeTrigger.installChaincode(channelName, chaincodeName, sourceType, chaincodePath, chaincodeVersion, langType, userObj, opt)
            }).then((result) => {
            response.returnSuccess(result, res)
        }, (err) => {
            response.returnFailed(err, res)
        })
    }
// res.send('ok')
// hyUtil.chaincodeTrigger.installChaincode(req.swagger.params, res, next);
};

module.exports.chaincodeInstantiate = function(req, res, next) {
    var body = req.swagger.params.request.value

    var channelName = body.channelName;

    var chaincodeName = body.chaincodeName;

    var chaincodeVersion = body.chaincodeVersion;

    var functionName = body.functionName;

    var args = body.args

    var user = body.user
    var opt = body.opt
    var errMsg = response.checkParams(body, [
        "channelName",
        "chaincodeName",
        "chaincodeVersion",
        "functionName",
        "args",
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
                return hyUtil.channels[channelName].initialize()
            }).then((result) => {
            var userObj = hyUtil.user.getUser(user.enrollID)
            return hyUtil.chaincodeTrigger.instantiateChaincode(channelName, chaincodeName, chaincodeVersion, functionName, args, userObj, opt)
        }).then((result) => {
            response.returnSuccess(result, res)
        }, (err) => {
            response.returnFailed(err, res)
        })
    }

};


module.exports.chaincodeUpgrade = function(req, res, next) {
    console.log(req.swagger.params)
    var body = req.swagger.params.request.value
    var channelName = body.channelName;

    var chaincodeName = body.chaincodeName;

    var chaincodePath = body.chaincodePath;

    var chaincodeVersion = body.chaincodeVersion;
    var sourceType = body.sourceType;
    var user = body.user
    var opt = body.opt
    var errMsg = response.checkParams(body, ["channelName", "chaincodeName", "chaincodePath", "chaincodeVersion", "sourceType", "user"])
    if (errMsg != "") {
        response.returnFailed(errMsg, res)
    } else {
        hyUtil
            .user
            .matchUserDb(user.enrollID, user.enrollSecret)
            .then((result) => {
                var userObj = hyUtil.user.getUser(user.enrollID)
                return hyUtil.chaincodeTrigger.installChaincode(channelName, chaincodeName, sourceType, chaincodePath, chaincodeVersion, userObj, opt)
            }).then((result) => {
            response.returnSuccess(result, res)
        }, (err) => {
            response.returnFailed(err, res)
        })
    }
// res.send('ok')
// hyUtil.chaincodeTrigger.installChaincode(req.swagger.params, res, next);
};

module.exports.chaincodeInvoke = function(req, res, next) {
    var errMsg = "";
    var body = req.swagger.params.request.value
    var channelName = body.channelName;
    var chaincodeName = body.chaincodeName;
    var functionName = body.functionName;
    var args = body.args
    var opt = body.opt
    var user = body.user
    var errMsg = response.checkParams(body, ["channelName", "chaincodeName", "functionName", "args", "user"])
    if (errMsg != "") {
        response.returnFailed(errMsg, res)
    } else {
        hyUtil.user.matchUserDb(user.enrollID, user.enrollSecret).then((result) => {
            var userObj = hyUtil.user.getUser(user.enrollID)
            return hyUtil.chaincodeTrigger.invokeChaincode(channelName, chaincodeName, functionName, args, userObj, opt)
        }).then((result) => {
            response.returnSuccess(result, res)
        }).catch((err) => {
            response.returnFailed(err, res)
        })
    }
};

module.exports.chaincodeInvokeE = function(req, res, next) {
    var errMsg = "";
    var body = req.swagger.params.request.value
    var channelName = body.channelName;
    var chaincodeName = body.chaincodeName;
    var functionName = body.functionName;
    var args = body.args
    var opt = body.opt
    var user = body.user
    var errMsg = response.checkParams(body, ["channelName", "chaincodeName", "functionName", "args", "user"])
    if (errMsg != "") {
        response.returnFailed(errMsg, res)
    } else {
        hyUtil.user.matchUserDb(user.enrollID, user.enrollSecret).then((result) => {
            var userObj = hyUtil.user.getUser(user.enrollID)
            return hyUtil.chaincodeTrigger.invokeChaincodeByEndorsePolice(channelName, chaincodeName, functionName, args, userObj, opt)
        }).then((result) => {
            response.returnSuccess(result, res)
        }).catch((err) => {
            response.returnFailed(err, res)
        })
    }
};


module.exports.chaincodeQuery = function(req, res, next) {
    var errMsg = "";
    var body = req.swagger.params.request.value
    var channelName = body.channelName;
    var chaincodeName = body.chaincodeName;
    var functionName = body.functionName;
    var args = body.args
    var opt = body.opt
    var user = body.user
    var errMsg = response.checkParams(body, ["channelName", "chaincodeName", "functionName", "args", "user"])
    if (errMsg != "") {
        response.returnFailed(errMsg, res)
    } else {
        hyUtil
            .user
            .matchUserDb(user.enrollID, user.enrollSecret)
            .then((result) => {
                var userObj = hyUtil
                    .user
                    .getUser(user.enrollID)
                return hyUtil
                    .chaincodeTrigger
                    .queryChaincode(channelName, chaincodeName, functionName, args, userObj, opt)
            }).then((result) => {
            response.returnSuccess(result, res)
        }).catch((err) => {
            response.returnFailed(err, res)
        })
    }
};


module.exports.chaincodeQueryHistory = function(req, res, next) {
    var errMsg = "";
    var body = req.swagger.params.request.value
    var channelName = body.channelName;
    var chaincodeName = body.chaincodeName;
    var functionName = body.functionName;
    var args = body.args
    var opt = body.opt
    var user = body.user
    var errMsg = response.checkParams(body, ["channelName", "chaincodeName", "functionName", "args", "user"])
    if (errMsg != "") {
        response.returnFailed(errMsg, res)
    } else {
        hyUtil
            .user
            .matchUserDb(user.enrollID, user.enrollSecret)
            .then((result) => {
                var userObj = hyUtil.user.getUser(user.enrollID)
                return hyUtil.chaincodeTrigger.queryHistory(channelName, chaincodeName, functionName, args, userObj, opt)
            }).then((result) => {
            response.returnSuccess(result, res)
        }).catch((err) => {
            response.returnFailed(err, res)
        })
    }
}



module.exports.getInstalledChaincodes = function(req, res, next) {
    var errMsg = "";
    var body = req.swagger.params.request.value
    var peerName = body.peerName;
    var user = body.user
    var errMsg = response.checkParams(body, ["peerName", "user"])
    if (errMsg != "") {
        response.returnFailed(errMsg, res)
    } else {
        hyUtil
            .user
            .matchUserDb(user.enrollID, user.enrollSecret)
            .then((result) => {
                var userObj = hyUtil.user.getUser(user.enrollID)
                return hyUtil.channelAPI.getInstalledChaincodes("", peerName, "installed", userObj)
            }).then((result) => {
            response.returnSuccess(result, res)
        }, (err) => {
            response.returnFailed(err, res)
        })
    }
}