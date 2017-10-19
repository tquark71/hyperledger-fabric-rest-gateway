var hyUtil = require('../../hyperledgerUtil')
var signRequestManger = hyUtil.singRequestManager
var constants = require('../../constants');
var path = require('path')
var configUpdateFolder = path.resolve(__dirname, '../../artifacts/channel')
var fs = require('fs')
var response = require('../../API/response')
var log4js = require('log4js');
var logger = log4js.getLogger('swagger/signRequest');

module.exports.createChannelConfigSignReqeust = (req, res, next) => {
    logger.debug('<======  createChannelConfigSignReqeust start ======> ')
    var body = req.swagger.params.request.value
    logger.debug('body');
    logger.debug(JSON.stringify(body))
    var channelName = body.channelName;
    var user = body.user
    var sourceType = body.sourceType;
    var description = body.description;
    var policy = body.policy;
    var opt = body.opt;
    var name = body.name
    if (sourceType == 'local') {
        hyUtil
            .user
            .matchUserDb(user.enrollID, user.enrollSecret).then((result) => {
            var userObj = hyUtil.user.getUser(user.enrollID)
            let content;
            let configUpdatePath = path.join(configUpdateFolder, opt.configUpdatePath)
            logger.debug('configUpdatePath');
            logger.debug(configUpdatePath)
            let configUpdate = fs.readFileSync(configUpdatePath)
            logger.warn(configUpdate)
            content = {
                configUpdate: configUpdate,
                channelName: channelName
            }
            return signRequestManger.createNewInnerSignRequest(constants.CHANNEL_CONFIG_REQUEST, name, description, policy, content, userObj, user.enrollID);
        }).then((result) => {
            response.returnSuccess(result, res)
        }).catch((err) => {
            response.returnFailed(err, res)
        })
    }
}

module.exports.sendSignRequest = (req, res, next) => {
    logger.debug('<======  sendSignRequest start ======> ')
    var body = req.swagger.params.request.value
    logger.debug('body');
    logger.debug(JSON.stringify(body))
    var user = body.user
    var uuid = body.uuid;
    hyUtil.user
        .matchUserDb(user.enrollID, user.enrollSecret).then((result) => {
        var userObj = hyUtil.user.getUser(user.enrollID)
        return signRequestManger.getInnerSignRequestObj(uuid);
    }).then((signReqesut) => {
        let creatorName = signReqesut._creatorName;
        if (creatorName != user.enrollID) {
            return Promise.reject('user enrollID is not ths same as the creator');
        } else {
            return signReqesut.sendRequest()
        }
    }).then((result) => {
        response.returnSuccess(result, res)
    }).catch((err) => {
        response.returnFailed(err, res)

    })

}

module.exports.receiveSignReqeust = (req, res, next) => {
    logger.debug('<======= receiveSignReqeust start ==========>');
    var body = req.swagger.params.request.value
    logger.debug('body');
    logger.debug(body);

    return signRequestManger.receiveOuterSignRequest(body).then((result) => {
        response.returnSuccess(result, res)
    }).catch((err) => {
        response.returnFailed(err, res)
    }
    )

}


module.exports.signAndResponse = (req, res, next) => {
    logger.debug('<======= signAndResponse start ==========>');
    var body = req.swagger.params.request.value
    var user = body.user
    var uuid = body.uuid;

    var toRole = body.toRole
    hyUtil.user
        .matchUserDb(user.enrollID, user.enrollSecret).then((result) => {
        var userObj = hyUtil.user.getUser(user.enrollID)
        return signRequestManger.getOuterSignRequestObj(uuid, toRole).then((outerSignRequest) => {
            return outerSignRequest.acceptRequest(user.enrollID, userObj)
        })
    }).then((result) => {
        response.returnSuccess(result, res)
    })
        .catch((err) => {
            response.returnFailed(err, res)
        }
    )
}
module.exports.rejectAndResponse = (req, res, next) => {
    logger.debug('<======= rejectAndResponse start ==========>');
    var body = req.swagger.params.request.value;
    var user = body.user;
    var uuid = body.uuid;
    var reason = body.reason;
    var toRole = body.toRole;
    hyUtil.user.matchUserDb(user.enrollID, user.enrollSecret).then((result) => {
        var userObj = hyUtil.user.getUser(user.enrollID)
        return signRequestManger.getOuterSignRequestObj(uuid,toRole).then((outerSignRequest) => {
            logger.debug('get outer Request obj success ');
            logger.debug(outerSignRequest)
            return outerSignRequest.rejectRequest(reason, user.enrollID, userObj)
        })
    }).then((result) => {
        response.returnSuccess(result, res)
    })
        .catch((err) => {
            response.returnFailed(err, res)
        }
    )


}
module.exports.receiveSignRequestResponse = (req, res, next) => {
    logger.debug('<======= receiveSignRequestResponse start ==========>');
    var body = req.swagger.params.request.value;
    var uuid = body.uuid;
    var status = body.status;
    var payload = body.payload;
    var responser = body.responser;

    return signRequestManger.receiveSignRequestResponse(body)
        .then((result) => {
            response.returnSuccess(result, res)
        }).catch((err) => {
        response.returnFailed(err, res)

    })
}
module.exports.queryInnerSignRequest = (req, res, next) => {
    logger.debug('<======= queryInnerSignRequest start ==========>');
    var body = req.swagger.params.request.value;
    var condition = body.condition || {};
    var sortCondition = body.sortCondition
    if (condition.from) {

        condition.createTime = {
            "$gt": new Date(condition.from).toISOString()
        }
        delete condition.from
    }
    if (condition.to) {
        condition.createTime = {
            "$lt": new Date(condition.to).toISOString()
        }
        delete condition.to
    }
    logger.debug(condition)
    var user = body.user;
    hyUtil.user
        .matchUserDb(user.enrollID, user.enrollSecret).then((result) => {
        var userObj = hyUtil.user.getUser(user.enrollID);
        if (!userObj.isOrgAdmin) {
            condition.creatorName = user.enrollID
        }
        return signRequestManger.getInnerRequests(condition, sortCondition)
    }).then((result) => {
        response.returnSuccess(result, res)
    }).catch((err) => {
        response.returnFailed(err, res)

    })
}
module.exports.queryOuterSignRequest = (req, res, next) => {
    logger.debug('<======= queryOuterSignRequest start ==========>');
    var body = req.swagger.params.request.value;
    var condition = body.condition || {};
    var sortCondition = body.sortCondition
    if (condition.from) {

        condition.receiveTime = {
            "$gt": new Date(condition.from).toISOString()
        }
        delete condition.from
    }
    if (condition.to) {
        condition.receiveTime = {
            "$lt": new Date(condition.to).toISOString()
        }
        delete condition.to
    }
    logger.debug(condition)
    var user = body.user;
    hyUtil.user
        .matchUserDb(user.enrollID, user.enrollSecret).then((result) => {
        var userObj = hyUtil.user.getUser(user.enrollID);
        if (!userObj.isOrgAdmin) {
            condition.creatorName = user.enrollID
        }
        return signRequestManger.getOuterRequests(condition, sortCondition)
    }).then((result) => {
        response.returnSuccess(result, res)
    }).catch((err) => {
        response.returnFailed(err, res)

    })
}