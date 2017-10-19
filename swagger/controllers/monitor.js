var hyUtil = require('../../hyperledgerUtil')
var response = require('../../API/response')
var monitor = require('../../monitor')
var passport = require('passport');
var networkConfig = require('../../network-config.json');
var config = require('../../config')
var UserDb = require('../../monitor/userDb.json')
var jwt = require('jsonwebtoken');
var jwtSecret = config.gateway.jwtSecret;
var myOrgName = config.fabric.orgName;
module.exports.returnPeerInfo = (req, res, next) => {
    var body = req.swagger.params;

    var peerName = body.peerName.value;
    monitor.getPeer(peerName).then((peer) => {
        return peer.returnPeerInfo()
    }).then((result) => {
        response.returnSuccess(result, res)
    }).catch((e) => {
        response.returnFailed(e, res)
    })
}
module.exports.loginMonitor = (req, res, next) => {
    var body = req.swagger.params;
    var username = body.username.value;
    var password = body.password.value;
    user = UserDb[username];
    if (user) {
        if (password == user.password) {
            console.log('login success');
            let payload = {
                username: username
            }
            let token = jwt.sign(
                payload, jwtSecret, {
                    expiresIn: 60 * 60 * 1000
                }
            )
            response.returnSuccess({
                token: token
            }, res)
        } else {
            response.returnFailed('password not match', res)
        }

    } else {
        response.returnFailed('con not found user', res)
    }
}

// passport.authenticate('local-login', {
//     successRedirect: '/sucess.html', // 成功則導入profile
//     failureRedirect: '/failed.html', // 失敗則返回登入頁
// })


module.exports.returnChannelInfo = (req, res, next) => {
    var errMsg = "";
    var body = req.swagger.params;
    var peerName = body.peerName.value;
    var channelName = body.channelName.value;
    var errMsg = response.checkParams(body, ["channelName", "peerName"])
    if (errMsg != "") {
        response.returnFailed(errMsg, res)
    } else {
        monitor.getPeer(peerName).then((peer) => {
            return peer.returnChannelObj(channelName)
        }).then((channelObj) => {
            return channelObj.returnChannelInfo()
        }).then((result) => {
            response.returnSuccess(result, res)
        }).catch((e) => {
            response.returnFailed(e, res)
        })
    }
}

module.exports.returnBlockInfo = (req, res, next) => {
    var errMsg = "";
    var body = req.swagger.params;
    console.log(body)

    var peerName = body.peerName.value;
    var channelName = body.channelName.value;
    var blockNumber = body.blockNumber.value;
    var errMsg = response.checkParams(body, ["channelName", "peerName", "blockNumber"])
    if (errMsg != "") {
        response.returnFailed(errMsg, res)
    } else {
        monitor.getPeer(peerName).then((peer) => {
            return peer.returnChannelObj(channelName)
        }).then((channelObj) => {
            return channelObj.returnBlockInfo(blockNumber)
        }).then((result) => {
            response.returnSuccess(result, res)
        }).catch((e) => {
            response.returnFailed(e, res)
        })
    }
}
module.exports.returnBlocksTrend = (req, res, next) => {
    var errMsg = "";
    var body = req.swagger.params;
    console.log(body)

    var peerName = body.peerName.value;
    var channelName = body.channelName.value;
    var lastNumber = body.lastNumber.value;
    if (errMsg != "") {
        response.returnFailed(errMsg, res)
    } else {
        monitor.getPeer(peerName).then((peer) => {
            return peer.returnChannelObj(channelName)
        }).then((channelObj) => {
            return channelObj.returnBlockTxsNum(lastNumber)
        }).then((result) => {
            response.returnSuccess(result, res)
        }).catch((e) => {
            response.returnFailed(e, res)
        })
    }
}

module.exports.returnLastTxs = (req, res, next) => {
    var errMsg = "";
    var body = req.swagger.params;
    var peerName = body.peerName.value;
    var channelName = body.channelName.value;
    var lastNumber = body.lastNumber.value;
    var errMsg = response.checkParams(body, ["channelName", "peerName", "lastNumber"])
    if (errMsg != "") {
        response.returnFailed(errMsg, res)
    } else {
        monitor.getPeer(peerName).then((peer) => {
            return peer.returnChannelObj(channelName)
        }).then((channelObj) => {
            return channelObj.returnLastTxs(lastNumber)
        }).then((result) => {
            response.returnSuccess(result, res)
        }).catch((e) => {
            response.returnFailed(e, res)
        })
    }
}

module.exports.returnChaincodeInfo = (req, res, next) => {
    var errMsg = "";
    var body = req.swagger.params;
    var peerName = body.peerName.value;
    var channelName = body.channelName.value;
    var chaincodeName = body.chaincodeName.value;
    var errMsg = response.checkParams(body, ["channelName", "peerName", "chaincodeName"])
    if (errMsg != "") {
        response.returnFailed(errMsg, res)
    } else {
        monitor.getPeer(peerName).then((peer) => {
            return peer.returnChannelObj(channelName)
        }).then((channelObj) => {
            return channelObj.returnChaincodeInfo(chaincodeName)
        }).then((result) => {
            response.returnSuccess(result, res)
        }).catch((e) => {
            response.returnFailed(e, res)
        })
    }
}

module.exports.returnNetworkConfig = (req, res, next) => {
    let thisNetworkConfig = hyUtil.helper.cloneJSON(networkConfig);
    response.returnSuccess(thisNetworkConfig, res)

}
module.exports.returnAliveState = (req, res, next) => {

    response.returnSuccess(hyUtil.helper.getAllAliveState(), res)

}
module.exports.returnSelfNetworkConfig = (req, res, next) => {
    var myNetworkConfig = hyUtil.helper.cloneJSON(networkConfig['network-config'][myOrgName])
    for (let peerName in myNetworkConfig) {
        if (peerName.indexOf('peer') > -1) {
            myNetworkConfig[peerName].status = hyUtil.helper.getPeerAliveState(peerName);
        }
    }
    response.returnSuccess(networkConfig['network-config'][myOrgName], res)

}