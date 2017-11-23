var fs = require('fs')
var util = require('util');
var path = require('path');
var user = require('../user')
var config = require('../../config');
var myOrgName = config.fabric.orgName
var log4js = require('log4js');
var InnerSignRequest = require('./innerSignRequest');
var OuterSignRequest = require('./outerSignRequest');
var logger = log4js.getLogger('signRequest/signRequestManger');
var grpc = require('grpc');
var _commomProto = grpc.load(path.join(__dirname, '../protos/common/policies.proto')).common;
var _identityProto = grpc.load(path.join(__dirname, '../protos/msp/identities.proto')).msp;
var _configtxProto = grpc.load(path.join(__dirname, '../protos/common/configtx.proto')).common;
var _signReqestProto = grpc.load(path.join(__dirname, '../addedProto/signRequest.proto')).common
logger.setLevel(config.gateway.logLevel);
var helper = require('../helper')
var DB = require('../../Db')
var uuid = require('uuid/v4');
var constants = require('../../constants')
var innerSignRequestMethod = DB.innerSignRequestMethod;
var outerSignRequestMethod = DB.outerSignRequestMethod;
var innerSignRequestCollection = {};
var outerSignRequestCollection = {};
function signOuterSignRequestAndResponse(uuid, userContext, signerName) {
    return getOuterSignRequestObj(uuid).then((outerSignRequest) => {
        return outerSignRequest.acceptRequest(signerName, userContext);
    })
}
function receiveSignRequestResponse(response) {
    let uuid = response.uuid;
    return getInnerSignRequestObj(uuid).then((innerSignRequestObj) => {

        return innerSignRequestObj.receiveResponse(response).then(() => {
            return 'received'
        })
    })
}
function receiveOuterSignRequest(request) {
    logger.debug('<========== receiveOuterSignRequest start ==========>');
    return outerSignRequestMethod.get({
        uuid: request.uuid,
        request: request.toRole
    }).then((res) => {
        if (res.length > 0) {
            logger.error('Duplicate outer sign request');
            return Promise.reject('Duplicate outer sign request uuid');
        } else {
            logger.debug('new a OuterSignRequest')
            let outerSignRequestObj = new OuterSignRequest(request);
            logger.debug('outerSignRequestObj');
            logger.debug(outerSignRequestObj)
            logger.debug('set to cach');
            outerSignRequestCollection[request.uuid] = {}
            outerSignRequestCollection[request.uuid][request.toRole] = outerSignRequestObj;
            return Promise.resolve(request.uuid)
        }
    })

}
function getOuterSignRequestObj(uuid, toRole) {
    logger.debug('<======== getOuterSignRequestObj start ==========>')
    if (outerSignRequestCollection[uuid] && outerSignRequestCollection[uuid][toRole]) {
        logger.debug('find outer request in cach, return');
        return Promise.resolve(outerSignRequestCollection[uuid][toRole])
    } else {
        logger.debug('cant not find outer request in cach, try find it from db');

        return outerSignRequestMethod.get({
            uuid: uuid,
            toRole: toRole
        }).then((res) => {
            if (res.length > 0) {
                logger.debug('find outer request in db, turn it in outer request instance');
                let outerSignRequestObj = new OuterSignRequest(res[0]);
                outerSignRequestCollection[uuid] = {};
                outerSignRequestCollection[uuid][toRole] = outerSignRequestObj;
                return Promise.resolve(outerSignRequestObj);
            } else {
                Promise.reject('can not find outer sign Request');
            }
        })
    }
}
// get innerRequest record from db
function getInnerRequests(condition, sortCondition) {
    logger.debug('<======= getInnerSignRequestObj start=======>');
    logger.debug('sortCondition');
    logger.debug(sortCondition)
    return innerSignRequestMethod.get(condition, sortCondition)

}
function getOuterRequests(condition, sortCondition) {
    logger.debug('<======= getOuterRequests start=======>');
    return outerSignRequestMethod.get(condition, sortCondition)

}
function getInnerSignRequestObj(requestUuid) {
    logger.debug('<======= getInnerSignRequestObj start=======>');
    logger.debug(`get uuid ${requestUuid}`)
    if (innerSignRequestCollection[requestUuid]) {
        logger.debug('get by cach');
        logger.debug(innerSignRequestCollection[requestUuid])
        return Promise.resolve(innerSignRequestCollection[requestUuid])
    } else {
        return innerSignRequestMethod.get({
            uuid: requestUuid
        }).then((res) => {
            if (res.length > 0) {
                logger.debug('get from db');
                let innerSignRequest = new InnerSignRequest(res[0]);
                logger.debug(innerSignRequest);
                logger.debug('assign back to cach');
                innerSignRequestCollection[requestUuid] = innerSignRequest
                return Promise.resolve(innerSignRequest);
            } else {
                Promise.reject('can not find innerRequset')
            }
        })
    }
}
function createNewInnerSignRequest(type, name, description, policy, content, userContext, creatorName) {

    logger.debug('<===== createNewInnerSignRequest start ==========>')
    let signIdentity = userContext.getSigningIdentity();
    let identity = userContext.getIdentity();

    ///
    let requestUuid = uuid();
    logger.debug('uuid');
    logger.debug(requestUuid)
    let signRequestHeader = new _signReqestProto.SignRequestHeader();
    signRequestHeader.setCreator(userContext.getIdentity().serialize());
    signRequestHeader.setUuid(requestUuid);
    logger.debug('signRequestHeader');
    logger.debug(signRequestHeader);
    var signRequestHeaderBytes = signRequestHeader.toBuffer();
    var contentBytes;
    // get all the bytes to be signed together, then sign
    if (type == constants.CHANNEL_CONFIG_REQUEST) {
        logger.debug('Request type ' + constants.CHANNEL_CONFIG_REQUEST);
        let channelConfigRequestContent = new _signReqestProto.ChannelConfigRequestContent();
        channelConfigRequestContent.setChannelName(content.channelName);
        channelConfigRequestContent.setConfigUpdate(content.configUpdate);
        logger.debug('channelConfigRequestContent');
        logger.debug(channelConfigRequestContent)
        contentBytes = channelConfigRequestContent.toBuffer();
    }
    let signing_bytes = Buffer.concat([signRequestHeaderBytes, contentBytes]);
    logger.debug('signing_bytes')
    logger.debug(signing_bytes)
    let sig = userContext.getSigningIdentity().sign(signing_bytes);
    let signature_bytes = Buffer.from(sig);
    logger.debug('signature_bytes');
    logger.debug(signature_bytes)

    // build the return object
    let signRequestSignature = new _signReqestProto.SignRequestSignature();
    signRequestSignature.setSignRequestHeader(signRequestHeaderBytes);
    signRequestSignature.setSignature(signature_bytes);
    logger.debug('signRequestSignature');
    logger.debug(signRequestSignature)
    let signRequestSignatureBytes = signRequestSignature.toBuffer();
    ///
    logger.debug('creatorName');
    logger.debug(creatorName)
    let innerRequset = new InnerSignRequest({
        name,
        uuid: requestUuid,
        type,
        description,
        policy,
        contentBytes,
        creatorName,
        signRequestSignatureBytes
    })
    logger.debug('set into collection')
    return innerRequset.formateRootPolicy().then(() => {
        innerSignRequestCollection[requestUuid] = innerRequset;
        return Promise.resolve(requestUuid);
    })
}
module.exports = {
    getInnerSignRequestObj: getInnerSignRequestObj,
    getOuterSignRequestObj: getOuterSignRequestObj,
    createNewInnerSignRequest: createNewInnerSignRequest,
    receiveSignRequestResponse: receiveSignRequestResponse,
    receiveOuterSignRequest: receiveOuterSignRequest,
    getInnerRequests: getInnerRequests,
    getOuterRequests: getOuterRequests
}