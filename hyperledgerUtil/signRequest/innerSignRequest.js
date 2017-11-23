var client = require('../client');

var channels = require('../channels')
var fs = require('fs')
var util = require('util');
var path = require('path')
var user = require('../user')
var EventHub = require('fabric-client/lib/EventHub.js');
var config = require('../../config');

var myOrgName = config.fabric.orgName
var log4js = require('log4js');
var logger = log4js.getLogger('util/innerSignRequest');

var helper = require('../helper');
logger.setLevel(config.gateway.logLevel);
var grpc = require('grpc');
var _signReqestProto = grpc.load(path.join(__dirname, '../addedProto/signRequest.proto')).common
var _identityProto = grpc.load(path.join(__dirname, '../protos/msp/identities.proto')).msp;
var _commonProto = grpc.load(path.join(__dirname, '../protos/common/common.proto')).common;
var _configtxProto = grpc.load(path.join(__dirname, '../protos/common/configtx.proto')).common;
var uuid = require('uuid/v4');
var DB = require('../../Db');
var request = require('request')
var innerSignRequestMethod = DB.innerSignRequestMethod;
var constants = require('../../constants')
var helper = require('../helper');
/*
 * @ configupdatePb => buffer
 * @ userContext => userObj
 */
/*
sendRequest status life cycel NOT_SEND => SENDING => REACH => ACCEPT/REJECT
*/

var innerSignRequest = class {

    constructor({uuid, type, description, name, policy, fullfilled = false, contentBytes, responses=[], creatorName, signRequestSignatureBytes}) {
        logger.debug('<====== inner signRequest constructor start ========>');
        this._uuid = uuid;
        this._type = type;
        this._name = name;
        this._description = description;
        this._policy = policy;
        this._contentBytes = contentBytes;
        this._responses = responses;
        this._fullfilled = fullfilled;
        this._creatorName = creatorName;
        this._signRequestSignatureBytes = signRequestSignatureBytes;
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
        // see if the uuid has been recorded in the db, if not, create new innerRequest

    }

    // internal method, save request into DB
    sendRequest() {
        var SendRequest = require('../../sendRequest/sendRequest');
        logger.debug('<===== start sendRequest ======>')
        this._policy.identities.forEach((identity) => {
            logger.debug('parse Identity');
            logger.debug(identity);
            let gatewayAddress = helper.getGatewayAddressByMspID(identity.role.mspId);

            let body = {
                toMspID: identity.role.mspId,
                toRole: identity.role.name,
                type: this._type,
                uuid: this._uuid,
                creatorName: this._creatorName,
                description: this._description,
                contentBytes: this._contentBytes,
                signRequestSignatureBytes: this._signRequestSignatureBytes
            }
            logger.debug('body');
            logger.debug(body)
            logger.debug('content');
            logger.debug('update status')
            identity.status = 'SENDING';
            logger.debug('new a send request')
            let sendRequest = new SendRequest({
                url: gatewayAddress + '/signRequest/request',
                body: body,
                type: constants.CHANNEL_CONFIG_REQUEST
            })
            logger.debug('send')
            sendRequest.sendAndRetry();

        })
        return this._updateRequest().then((res) => {
            logger.debug('update finish');
            logger.debug(res);
            return `sign Request ${this._uuid} send finish`
        });
    }
    isFullFilled() {
        return this._fullfilled
    }
    changeIdentitesState(mspID, role, state) {
        logger.debug('<=====  changeIdentitesState start =======>')
        let useAmdinChange = false;
        //search for match identity, if role is admin, use useAdminChange to check again;
        this._policy.identities.forEach((identity) => {

            if (identity.role.mspId == mspID && identity.role.name == role) {
                if (role == 'admin') {
                    useAmdinChange = true;
                }
                identity.status = state
                logger.debug('changed identity')
                logger.debug(identity);
            }
        })
        if (useAmdinChange == false && role == 'admin') {
            role = 'member'
            this._policy.identities.forEach((identity) => {

                if (identity.role.mspId == mspID && identity.role.name == role) {
                    identity.status = state
                    logger.debug('changed identity')
                    logger.debug(identity);
                }
            })
        }
        return this._updateRequest().then((res) => {
            logger.debug('chaingeIdentityState update then');
            logger.debug(res)
            return res;
        }).catch((e) => {
            logger.debug('chaingeIdentityState err')
            logger.debug(e)
        })
    }
    _saveRequest() {
        logger.debug('_saveRequest start')
        let requestObj = {
            uuid: this._uuid,
            name: this._name,
            type: this._type,
            description: this._description,
            policy: this._policy,
            contentBytes: this._contentBytes,
            responses: this._responses,
            fullfilled: this._fullfilled,
            signRequestSignatureBytes: this._signRequestSignatureBytes,
            creatorName: this._creatorName
        }
        logger.debug('request obj');
        logger.debug(requestObj)
        return innerSignRequestMethod.create(requestObj)
    }
    _updateRequest() {
        logger.debug('_updateRequest start')

        return innerSignRequestMethod.update({
            uuid: this._uuid,
            name: this._name,
            type: this._type,
            description: this._description,
            policy: this._policy,
            contentBytes: this._contentBytes,
            responses: this._responses,
            fullfilled: this._fullfilled,
            creatorName: this._creatorName,
            signRequestSignatureBytes: this._signRequestSignatureBytes
        })
    }
    //call by signRequest manager, to put new reponse into this._responses
    /* response{
        status: 'ACCEPT'/'REJECT',
        payload:'$configUpdateProto'/'$reason',
        uuid: 'xxxxxxxx',
        responser: '$serializedIdentity'
    }*/
    receiveResponse(response) {
        logger.debug('<========= receiveResponse start ========>')
        if (response.status == 'ACCEPT') {
            let checkResult = this._checkResponseConfigUpdata(response);
            logger.debug('checkResult')
            logger.debug(checkResult)
            if (!checkResult) {
                return Promise.reject('Response check failed')
            } else {
                let signByNumber;
                let pSignByNumber;
                let haveCheckAdmin = {
                    result: false
                }
                let pApplyArr = [];
                this._policy.identities.forEach((mspIdentity, index) => {
                    // if respones was sign by admin
                    if (checkResult[2]) {
                        //check if critria is amdin so it absolute sign for admin, if there is not admin critira, this admin may sign for the member request
                        if (mspIdentity.role.name == 'admin' && mspIdentity.role.mspId == checkResult[1] && !mspIdentity.status == 'RECEIVED') {
                            signByNumber = index;
                            mspIdentity.status = 'RECEIVED';
                        } else if (mspIdentity.role.mspId == checkResult[1]) {
                            pSignByNumber = index;
                        }
                    } else {
                        if (mspIdentity.role.name == 'member' && mspIdentity.role.mspId == checkResult[1]) {
                            signByNumber = index;
                        }
                    }

                })
                if (!signByNumber && pSignByNumber) {
                    signByNumber = pSignByNumber;
                    pSignByNumber = null;
                }
                this._checkPolicy(this._policy.policy, [signByNumber, pSignByNumber], haveCheckAdmin, pApplyArr);
                // if go throught all policy with the admin cert but did not use it to change any admin critira, we will use it to change member's critiria;
                if (!haveCheckAdmin.result && pApplyArr) {
                    logger.debug('did not change admin policy state, so use pApplyArr to change policy state');
                    pApplyArr.forEach((changeIndexArr) => {
                        logger.debug('pApply index')
                        logger.debug(changeIndexArr)
                        let policy = this._getPolicyByIndexArr(changeIndexArr);
                        logger.debug(policy)
                        logger.debug('_changePolicyState')
                        this._changePolicyState(policy);
                    })
                }
                logger.debug('push payload')
                logger.debug(response.payload)
                this._responses.push(response.payload)
                logger.debug('all responses')
                logger.debug(this._responses)
                this.changeIdentitesState(checkResult[0], checkResult[2] ? 'admin' : 'member', 'ACCPET')

            }
        } else if (response.status == 'REJECT') {
            let checkResult = helper.checkSerializedIdentity(channels.getChannel(this.content.channelName), response.responser)
            if (checkResult) {
                logger.debug(`REJECT response is vaild and is sent by ${checkResult[0]} ${checkResult[2]}`);
                logger.debug('change identities state');
                this.changeIdentitesState(checkResult[0], checkResult[2] ? 'admin' : 'member', 'REJECT')
                this._policy.identities.reason = response.payloadl
            }
        }
        return this._updateRequest()



    }
    _checkPolicy(policy, signArr, haveCheckAdmin, pApplyArr) {
        logger.debug('_checkPolicy');
        logger.debug(policy);
        logger.debug('signArr');
        logger.debug(signArr);
        //if policy if n-of, use callback to break down stair
        if (Object.keys(policy)[0].indexOf('of') > -1) {
            logger.debug('policy is n-of type')
            policy[Object.keys(policy)[0]].forEach((subPolicy) => {
                this._checkPolicy(subPolicy, signArr, haveCheckAdmin, pApplyArr);
            })
        } else {
            logger.debug('policy is sign-by type')

            let wantNumber = policy[Object.keys(policy)[0]];
            logger.debug('want sign by ' + wantNumber);
            if (signArr[0] == wantNumber) {
                logger.debug('match with signer number');
                this._changePolicyState(policy);
                haveCheckAdmin.result = true;
            } else if (signArr[1] == wantNumber) {
                logger.debug('match with sub signer number');

                pApplyArr.push(policy['indexArr']);
                logger.debug('push pApplyArr');
                logger.debug(pApplyArr)

            }
        }

    }
    _getPolicyByIndexArr(indexArr) {
        logger.debug('_getPolicyByIndexArr')
        let tmpPolicy = this._policy.policy;
        logger.debug('init policy');
        logger.debug(tmpPolicy)
        indexArr.forEach((index, layer) => {
            logger.debug('get index ' + index);
            logger.debug('get level ' + layer);
            if (layer != 0 && layer) {
                logger.debug('nKey')
                let nKey = Object.keys(tmpPolicy)[0];
                logger.debug(nKey)

                tmpPolicy = tmpPolicy[nKey][index];
            }
        })
        return tmpPolicy;
    }
    _changePrePolicyState(policy) {
        logger.debug('_changePrePolicyState');
        let tmpPolicy = this._policy.policy;
        logger.debug('break down to pre policy');
        logger.debug('this policy index arr is ');
        logger.debug(policy.indexArr);
        policy.indexArr.forEach((index, layer) => {
            logger.debug('index');
            logger.debug(index);
            logger.debug('layer');
            logger.debug(layer)
            if (layer != 0 && layer != policy.indexArr.length - 1) {
                logger.debug('match critiria')
                let nKey = Object.keys(tmpPolicy)[0];
                tmpPolicy = tmpPolicy[nKey][index];
            }
        })
        this._changePolicyState(tmpPolicy);
    }
    _changePolicyState(policy) {

        logger.debug('change policy state');
        logger.debug(policy)
        if (policy.type == 'n-of') {
            logger.debug('type is n-of')
            policy.n--;
            if (policy.n == 0) {
                logger.debug('fullfill this policy');
                if (policy.indexArr.length == 1) {
                    logger.debug('fullfill this request policy');

                    this._fullfilled = true;
                } else {
                    logger.debug('used to change upper level policy')
                    this._changePrePolicyState(policy)
                }
            }
        } else {
            logger.debug('type is sign-by')

            this._changePrePolicyState(policy)
        }
    }
    // internal method, before change this _responses state, we have to check the signer by
    // SDK msp
    _checkResponseConfigUpdata(response) {
        logger.debug('<===== _checkResponseConfigUpdata  start ===========>');
        logger.debug(response);
        let proto_config_signature = _configtxProto.ConfigSignature.decode(response.payload)
        logger.debug('proto_config_signature');
        logger.debug(proto_config_signature)
        let signature = proto_config_signature.getSignature().toBuffer();
        logger.debug('signature');
        logger.debug(signature)
        let signeHeaderBytes = proto_config_signature.getSignatureHeader().toBuffer();
        logger.debug('signeHeaderBytes')
        logger.debug(signeHeaderBytes)
        let signeHeader = _commonProto.SignatureHeader.decode(signeHeaderBytes);
        logger.debug('signeHeader')
        logger.debug(signeHeader)
        let signer = signeHeader.getCreator().toBuffer();
        logger.debug('signer');
        logger.debug(signer)
        let channel = channels.getChannel(this.content.channelName);
        let checkResult = helper.checkSerializedIdentity(channel, signer);
        if (checkResult) {
            let identity = checkResult[1];
            let mspid = checkResult[0];
            let isAdmin = checkResult[2];
            var digest = Buffer.concat([signeHeaderBytes, this.content.configUpdate]);
            if (!identity.verify(digest, signature)) {
                logger.error('signature is not valid');
                return false;
            } else {
                logger.debug('_checkResponse - This signature has both a valid identity');
                return [true, mspid, isAdmin];
            }
        } else {
            return false
        }




    }
    // internal method, change policy into countable formatted to calculate _fullfiled state
    /* {
        *   identities: [
        *     { role: { name: "member", mspId: "peerOrg1" }},
        *     { role: { name: "member", mspId: "peerOrg2" }},
        *     { role: { name: "admin", mspId: "ordererOrg" }}
        *   ],
        *   policy: {
        *     "2-of": [
        *       { "signed-by": 2},
        *       { "1-of": [{ "signed-by": 0 }, { "signed-by": 1 }]}
        *     ]
        *   }
        * }
        }
        */
    //TODO: check policy is vaild or not
    formateRootPolicy() {
        logger.debug('_formateRootPolicy start')
        let policy = this._policy.policy;
        let identities = this._policy.identities;
        identities.forEach((identity) => {
            identity.status = "NOT_SEND";
            identity.reason = "NONE";
        })
        this._addCountIndexForNof(policy);
        this._formatPolicy(policy, [0])
        return this._saveRequest();
    }
    _formatPolicy(policy, indexArr) {
        var findType = false;
        for (let key in policy) {
            if (key.indexOf('-of') > -1) {
                findType = true;
                policy.type = 'n-of';
                this._addCountIndexForNof(policy[key]);
                policy[key].forEach((subPolicy, index) => {
                    let subIndexArr = JSON.parse(JSON.stringify(indexArr))
                    subIndexArr.push(index)
                    this._formatPolicy(subPolicy, subIndexArr);
                })
            } else if (key.indexOf('signed-by') > -1) {
                findType = true;

                policy.type = 'sign-by';
            }
        }
        if (!findType) {
            throw new Error()
        }
        policy.indexArr = indexArr;

    }
    _addCountIndexForNof(nofObj) {
        let nof = Object.keys(nofObj)[0]
        let n = parseInt(nof.replace('-of', ''), 10);
        nofObj.n = n;
    }

}


module.exports = innerSignRequest;