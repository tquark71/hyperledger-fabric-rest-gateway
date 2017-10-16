var hyUtil = require('../../hyperledgerUtil')
var response = require('../../API/response')

module.exports.getBlockByNumber = (req, res, next) => {
    var errMsg = "";
    var body = req.swagger.params.request.value
    var channelName = body.channelName;
    if (!channelName) {
        errMsg += " Missing channelName "
    }
    if (!hyUtil.channels[channelName]) {
        errMsg += " Can't find " + channelName + "channel"
    }
    var blockNum = body.blockNum
    if (!blockNum && blockNum != 0) {
        errMsg += "Missing block Number"
    }
    var user = body.user
    if (!user) {
        errMsg += "Missing user obj"
    }
    if (errMsg != "") {
        response.returnFailed(errMsg, res)
    } else {
        var peerName = body.peerName
        hyUtil.user.matchUserDb(user.enrollID, user.enrollSecret).then((result) => {
            var userObj = hyUtil.user.getUser(user.enrollID)
            return hyUtil.channelAPI.getBlockByNumber(channelName, peerName, blockNum, userObj)
        }).then((result) => {
            response.returnSuccess(result, res)
        }).catch((err) => {
            response.returnFailed(err, res)
        })
    }
}

module.exports.getBlockActionByNumber = (req, res, next) => {
    var errMsg = "";
    var body = req.swagger.params.request.value
    var channelName = body.channelName;
    if (!channelName) {
        errMsg += " Missing channelName "
    }
    if (!hyUtil.channels[channelName]) {
        errMsg += " Can't find " + channelName + "channel"
    }
    var blockNum = body.blockNum
    if (!blockNum && blockNum != 0) {
        errMsg += "Missing block Number"
    }
    var user = body.user
    if (!user) {
        errMsg += "Missing user obj"
    }
    if (errMsg != "") {
        response.returnFailed(errMsg, res)
    } else {
        var peerName = body.peerName
        hyUtil.user.matchUserDb(user.enrollID, user.enrollSecret).then((result) => {
            var userObj = hyUtil.user.getUser(user.enrollID)
            return hyUtil.channelAPI.getBlockActionsByNumber(channelName, peerName, blockNum, userObj)
        }).then((result) => {
            response.returnSuccess(result, res)
        }, (err) => {
            response.returnFailed(err, res)
        })
    }


}