var client = require('../client')
var channels = require('../channels')
var fs = require('fs')
var util = require('util');
var path = require('path')
var user = require('../user')
var config = require('../../config.json');

var myOrgName = config.fabric.orgName
var log4js = require('log4js');
var logger = log4js.getLogger('util/innerSignRequest');
var helper = require('../helper');
logger.setLevel(config.gateway.logLevel);
var grpc = require('grpc');
var _identityProto = grpc.load(path.join(__dirname, '../protos/msp/identities.proto')).msp;
var _commomProto = grpc.load(path.join(__dirname, '../protos/common/policies.proto')).common;
var _configtxProto = grpc.load(path.join(__dirname, '../protos/common/configtx.proto')).common;
var _signReqestProto = grpc.load(path.join(__dirname, '../protos/signRequest/signRequest.proto')).common
var uuid = require('uuid/v4');
var DB = require('../../Db');
var request = require('request')
var outerSignRequestMethod = DB.outerSignRequestMethod;
var constants = require('../../constants')
var helper = require('../helper');


var outerSignRequest = class {
    constructor({signRequestSignatureBytes, toRole, type, uuid, fromMspID, description, contentBytes, status, signerName, replyStatus}) {
        this.signRequestSignatureBytes = signRequestSignatureBytes;
        this.toRole = toRole;
        this.type = type;
        this.uuid = uuid;
        this.fromMspID = fromMspID;
        this.description = description;
        this.replyStatus = replyStatus || 'none';
        this.contentBytes = contentBytes;
        if (type == constants.CHANNEL_CONFIG_REQUEST) {
            let contentObj = _signReqestProto.ChannelConfigRequestContent.decode(contentBytes)
            this.content = {
                channelName: contentObj.channel_name,
                configUpdate: contentObj.config_update.toBuffer()
            };
            logger.debug('get CHANNEL_CONFIG_REQUEST');
            logger.debug('content');
            logger.debug(this.content);
        }
        this.signerName = signerName || 'none';
        if (!status) {

            this.verifySignature();
            this.status = 'PENDING';
            this._saveRequest();
        } else {
            this.status = status;
        }

    }
    _saveRequest() {
        return outerSignRequestMethod.create({
            uuid: this.uuid,
            signRequestSignatureBytes: this.signRequestSignatureBytes,
            toRole: this.toRole,
            type: this.type,
            description: this.description,
            status: this.status,
            contentBytes: this.contentBytes,
            fromMspID: this.fromMspID,
            signerName: this.signerName,
            replyStatus: this.replyStatus,
        })
    }
    _updateRequest() {
        return outerSignRequestMethod.update({
            uuid: this.uuid,
            signRequestSignatureBytes: this.signRequestSignatureBytes,
            toRole: this.toRole,
            type: this.type,
            description: this.description,
            status: this.status,
            contentBytes: this.contentBytes,
            fromMspID: this.fromMspID,
            signerName: this.signerName,
            replyStatus: this.replyStatus,



        })
    }
    changeRequestStatus(status) {
        this.status = status;
        this._updateRequest();
    }
    verifySignature() {
        logger.debug('<========  verfify signature start =======>');
        logger.debug('signRequestSignature');
        logger.debug(this.signRequestSignatureBytes)
        let signRequestSignature = _signReqestProto.SignRequestSignature.decode(this.signRequestSignatureBytes);
        logger.debug('signRequestSignature')
        logger.debug(signRequestSignature);
        logger.debug('get signature');
        let signature = signRequestSignature.getSignature().toBuffer();
        logger.debug(signature);
        let signRequestHeaderBytes = signRequestSignature.sign_request_header;
        logger.debug('signRequestHeaderBytes');
        logger.debug(signRequestHeaderBytes);
        let signRequestHeader = _signReqestProto.SignRequestHeader.decode(signRequestHeaderBytes);
        logger.debug('signRequestHeader');
        logger.debug(signRequestHeader);
        let creatorSerilizedIdentity = signRequestHeader.getCreator().toBuffer();
        logger.debug('creatorSerilizedIdentity');
        logger.debug(creatorSerilizedIdentity)
        let uuid = signRequestHeader.getUuid();
        logger.debug('uuid');
        logger.debug(uuid)
        let contentBytes
        let checkResult = helper.checkSerializedIdentity(channels.getChannel(this.content.channelName), creatorSerilizedIdentity);
        if (checkResult) {
            logger.debug('serialized Identify check finish');
            logger.debug(checkResult);
            if (this.type == constants.CHANNEL_CONFIG_REQUEST) {
                let channelConfigRequestContent = new _signReqestProto.ChannelConfigRequestContent();
                channelConfigRequestContent.setChannelName(this.content.channelName);
                channelConfigRequestContent.setConfigUpdate(this.content.configUpdate);
                contentBytes = channelConfigRequestContent.toBuffer();
                logger.debug('contentBytes');
                logger.debug(contentBytes)
            }
            let signing_bytes = Buffer.concat([signRequestHeader.toBuffer(), contentBytes]);
            if (checkResult[1].verify(signing_bytes, signature)) {
                logger.debug('outer sign request signature verify success')
                logger.debug('get fromMspID')
                logger.debug(checkResult[0]);
                this.fromMspID = checkResult[0];
            } else {
                throw new Error('verify signature faild')
            }
        } else {
            throw new Error('verify signature faild')
        }
    }
    checkUserHavePriviliageToResponse(userContext) {
        let toRoleCheckPassed = false;
        let checkResult
        if (this.toRole == 'admin') {
            if (this.type == constants.CHANNEL_CONFIG_REQUEST) {
                checkResult = helper.checkSerializedIdentity(channels.getChannel(this.content.channelName), userContext.getIdentity().serialize());
            }
            logger.debug('check signer is match toRole attribute');
            if (checkResult[2]) {
                logger.debug('signer pass toRole attribute check');
                toRoleCheckPassed = true;
            } else {
                toRoleCheckPassed = false;
            }
        } else {
            toRoleCheckPassed = true;
        }
        return toRoleCheckPassed
    }
    rejectRequest(signerName, userContext, reason) {
        var SendRequest = require('../../sendRequest/sendRequest');

        let body = {
            status: 'REJECT',
            payload: reason,
            uuid: this.uuid,
            responser: userContext.getIdentity().serialize()
        }
        let toRoleCheckPassed = this.checkUserHavePriviliageToResponse(userContext);
        if (toRoleCheckPassed) {
            let sendRequest = new SendRequest({
                url: helper.getGatewayAddressByMspID(this.fromMspID) + '/signRequest/response',
                body: body,
                type: constants.CHANNEL_CONFIG_RESPONSE
            })
            sendRequest.sendAndRetry();
            this.status = 'SENDING';
            this.replyStatus = 'REJECT';
            this.signerName = signerName;
            return this._updateRequest().then(() => {
                return `response ${this.uuid} signRequest success`;
            });
        } else {
            return Promise.reject(`signer ${signName} have no privilige to sign the reqeust`);

        }


    }
    acceptRequest(signerName, userContext) {
        logger.debug('<===== acceptRequest start ======>')
        var SendRequest = require('../../sendRequest/sendRequest');
        let body = {
            status: 'ACCEPT',
            uuid: this.uuid,
            responser: userContext.getIdentity().serialize()
        }
        let toRoleCheckPassed = this.checkUserHavePriviliageToResponse(userContext);

        if (toRoleCheckPassed) {
            let sendRequest
            if (this.type = constants.CHANNEL_CONFIG_REQUEST) {
                client.setUserContext(userContext,true);
                let proto_config_signature = client.signChannelConfig(this.content.configUpdate);
                body.payload = proto_config_signature.toBuffer();
                sendRequest = new SendRequest({
                    url: helper.getGatewayAddressByMspID(this.fromMspID) + '/signRequest/response',
                    type: constants.CHANNEL_CONFIG_RESPONSE,
                    body: body,
                    meta: {
                        toRole: this.toRole
                    }
                })
            }

            sendRequest.sendAndRetry();
            this.status = 'SENDING';
            this.replyStatus = 'REJECT';
            this.signerName = signerName;

            return this._updateRequest().then(() => {
                return `response ${this.uuid} signRequest success`;
            });
        } else {
            return Promise.reject(`signer ${signName} have no privilige to sign the reqeust`);
        }


    }
}

module.exports = outerSignRequest