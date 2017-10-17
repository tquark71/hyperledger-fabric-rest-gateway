var hyUtil = require('../../hyperledgerUtil')
var response = require('../../API/response')
var fs = require('fs')
var path = require('path')
var log4js = require('log4js');
var logger = log4js.getLogger('swagger/contoller/channel')
module.exports.getChannels = (req, res, next) => {
    var body = req.swagger.params.request.value
    var user = body.user
    var peerName = body.peerName
    var userObj
    var errMsg = response.checkParams(body, ["peerName", "user"])
    if (errMsg != "") {
        response.returnFailed(errMsg, res)
    } else {
        return hyUtil.user.matchUserDb(user.enrollID, user.enrollSecret).then((result) => {
            userObj = hyUtil.user.getUser(user.enrollID)
            return hyUtil.channelAPI.getChannels(peerName, userObj)
        }).then((result) => {
            response.returnSuccess(result, res)
        }, (err) => {
            response.returnFailed(err, res)
        })
    }
}
module.exports.getChaincodeData = function(req, res, next) {
    var body = req.swagger.params.request.value;
    var peerName = body.peerName;
    var chaincodeName = body.chaincodeName;
    var channelName = body.channelName;
    var user = body.user
    hyUtil.user.matchUserDb(user.enrollID, user.enrollSecret).then((result) => {
        let userObj = hyUtil.user.getUser(user.enrollID)
        return hyUtil.channelAPI.getChaincodeData(peerName, channelName, chaincodeName, userObj)
    }).then((result) => {
        response.returnSuccess(result, res)

    }, (err) => {
        response.returnFailed(err, res)
    })

}
module.exports.getChainInfo = (req, res, next) => {
    var errMsg = "";
    var body = req.swagger.params.request.value

    var channelName = body.channelName;
    var user = body.user;
    var peerName = body.peerName;
    var userObj
    var errMsg = response.checkParams(body, ["peerName", "user", "channelName"])
    if (errMsg != "") {
        response.returnFailed(errMsg, res)
    } else {
        hyUtil.user.matchUserDb(user.enrollID, user.enrollSecret).then((result) => {
            userObj = hyUtil.user.getUser(user.enrollID)
            return hyUtil.channelAPI.getChainInfo(channelName, peerName, userObj)
        }).then((result) => {
            response.returnSuccess(result, res)
        }, (err) => {
            response.returnFailed(err, res)
        })
    }
}


module.exports.addOrg = (req, res, next) => {
    var errMsg = "";
    var body = req.swagger.params.request.value

    var user = body.user
    var opt = body.opt
    var sourceType = body.sourceType
    var channelName = body.channelName
    var mspID = body.mspID;
    var type = body.type;
    var userObj
    if (errMsg != "") {
        response.returnFailed(errMsg, res)
    } else {
        hyUtil.user.matchUserDb(user.enrollID, user.enrollSecret).then((result) => {
            userObj = hyUtil.user.getUser(user.enrollID)
            return hyUtil.configgen.addOrgAndGetConfigUpdatePb(channelName, userObj, mspID, type, sourceType, opt)
        }).then((configUpdatePb) => {
            logger.debug(configUpdatePb)
            if (opt.writePath) {
                fs.writeFileSync(path.resolve(__dirname, '../../artifacts/channel', opt.writePath), configUpdatePb)
            }
            if (!opt.notSend) {
                return hyUtil.channelAPI.updateChannel(channelName, configUpdatePb, userObj)
            } else {
                return 'make configUpdate success'
            }
        }).then((result) => {
            response.returnSuccess(result, res)
        }, (err) => {
            response.returnFailed(err, res)
        })
    }

}
module.exports.createChannel = (req, res, next) => {
    var errMsg = "";
    var body = req.swagger.params.request.value
    var channelName = body.channelName;
    var sourceType = body.sourceType;
    var source = body.source;
    var user = body.user
    if (!user) {
        errMsg += "Missing user obj"
    }
    if (errMsg != "") {
        response.returnFailed(errMsg, res)
    } else {
        hyUtil.user.matchUserDb(user.enrollID, user.enrollSecret).then((result) => {
            var userObj = hyUtil.user.getUser(user.enrollID)

            return hyUtil.channelAPI.createChannel(channelName, sourceType, source, userObj)
        }).then((result) => {
            response.returnSuccess(result, res)
        }, (err) => {
            response.returnFailed(err, res)
        })
    }

}


module.exports.getInstantiatedChaincodes = (req, res, next) => {
    var errMsg = "";
    var body = req.swagger.params.request.value
    var channelName = body.channelName;
    var peerName = body.peerName;
    var user = body.user
    var errMsg = response.checkParams(body, ["channelName", "peerName", "user"])
    if (errMsg != "") {
        response.returnFailed(errMsg, res)
    } else {
        hyUtil
            .user
            .matchUserDb(user.enrollID, user.enrollSecret)
            .then((result) => {
                var userObj = hyUtil.user.getUser(user.enrollID)
                return hyUtil.channelAPI.getInstalledChaincodes(channelName, peerName, "instantiated", userObj)
            }).then((result) => {
            response.returnSuccess(result, res)
        }, (err) => {
            response.returnFailed(err, res)
        })
    }


}


module.exports.joinChannel = (req, res, next) => {
    var errMsg = "";
    var body = req.swagger.params.request.value
    var channelName = body.channelName;
    if (!channelName) {
        errMsg += " Missing channelName "
    }
    var user = body.user
    if (!user) {
        errMsg += "Missing user obj"
    }
    if (errMsg != "") {
        response.returnFailed(errMsg, res)
    } else {
        hyUtil
            .user
            .matchUserDb(user.enrollID, user.enrollSecret)
            .then((result) => {
                var userObj = hyUtil.user.getUser(user.enrollID)
                return hyUtil.channelAPI.joinChannel(channelName, userObj)
            }).then((result) => {
            response.returnSuccess(result, res)
        }, (err) => {
            response.returnFailed(err, res)
        })
    }


}


module.exports.getChannelConfig = (req, res, next) => {
    var errMsg = "";
    var body = req.swagger.params.request.value
    var channelName = body.channelName;
    var writePath = body.writePath
    if (!channelName) {
        errMsg += " Missing channelName "
    }
    if (!hyUtil.channels[channelName]) {
        errMsg += " Can't find " + channelName + "channel"
    }
    var user = body.user
    if (!user) {
        errMsg += "Missing user obj"
    }
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
                    .channelAPI
                    .getChannelConfig(channelName, userObj, writePath)
            }).then((result) => {
            response.returnSuccess(result, res)
        }, (err) => {
            response.returnFailed(err, res)
        })
    }

}

module.exports.updateChannel = (req, res, next) => {
    var errMsg = "";
    var body = req.swagger.params.request.value
    var channelName = body.channelName;
    var sourceType = body.sourceType;
    var source = body.source;
    var user = body.user;
    if (errMsg != "") {
        response.returnFailed(errMsg, res)
    } else {
        let configUpdate
        let signatureArr = null
        hyUtil
            .user
            .matchUserDb(user.enrollID, user.enrollSecret)
            .then((result) => {
                var userObj = hyUtil
                    .user
                    .getUser(user.enrollID)
                return hyUtil
                    .channelAPI
                    .updateChannel(channelName, sourceType, source, userObj)
            }).then((result) => {
            response.returnSuccess(result, res)
        }, (err) => {
            response.returnFailed(err, res)
        })
    }


}

module.exports.initChannel = (req, res, next) => {
    var errMsg = "";
    var body = req.swagger.params.request.value
    var channelName = body.channelName;
    if (!channelName) {
        errMsg += " Missing channelName "
    }
    var user = body.user
    if (!user) {
        errMsg += "Missing user obj"
    }
    if (errMsg != "") {
        response.returnFailed(errMsg, res)
    } else {
        hyUtil
            .user
            .matchUserDb(user.enrollID, user.enrollSecret)
            .then((result) => {
                var userObj = hyUtil.user.getUser(user.enrollID)
                return hyUtil.channelAPI.initChannel(channelName, userObj)
            }).then((result) => {
            response.returnSuccess(result, res)
        }, (err) => {
            response.returnFailed(err, res)
        })
    }
}