var client = require('./client')
var hfc = require('fabric-client');
var config = require('../config');
var fs = require("fs")
var util = require('util')
var path = require('path')
var tcpp = require('tcp-ping');
var myOrgName = config.fabric.orgName
var log4js = require('log4js');
var logger = log4js.getLogger('helper');
logger.setLevel(config.gateway.logLevel);
console.log(networkConfig)
var grpc = require('grpc');
var _policiesProto = grpc.load(__dirname + '/protos/common/policies.proto').common;
var _chaincodeProto = grpc
    .load(__dirname + '/protos/peer/chaincode.proto')
    .protos;
var _common = grpc.load(__dirname + '/protos/common/common.proto').common;
var _identityProto = grpc.load(path.join(__dirname, '/protos/msp/identities.proto')).msp;
var _chaincodeDataProto = grpc.load(__dirname + '/addedProto/chaincode_data.proto').protos;
var _transProto = grpc.load(__dirname + '/protos/peer/transaction.proto').protos;
var _commomProto = grpc.load(__dirname + '/protos/common/policies.proto').common;
var _mspPrincipalProto = grpc.load(__dirname + '/protos/msp/msp_principal.proto').common;
var _abProto = grpc.load(__dirname + '/protos/orderer/ab.proto').orderer;
var networkConfig = require('./networkConfig');
var ORGS = networkConfig.getNetworkConfig();
var channelConfig = networkConfig.getChannelConfig();
var EndPoint = require('fabric-client/lib/Remote').Endpoint
var checkSerializedIdentity = (channel, serializedIdentity) => {
    logger.debug('<=========  checkSerializedIdentity start ============>');

    let mspManager = channel.getMSPManager();
    logger.debug('mspManager');
    logger.debug(mspManager);
    logger.debug('serializedIdentity');
    logger.debug(serializedIdentity)
    var sid = _identityProto.SerializedIdentity.decode(serializedIdentity);

    logger.debug('serializedIdentity again');
    logger.debug(serializedIdentity)
    logger.debug('sid');
    logger.debug(sid)
    var mspid = sid.getMspid();
    logger.debug('getMSPbyIdentity - found mspid %s', mspid);
    var msp = mspManager.getMSP(mspid);
    if (!msp) {
        throw new Error(util.format('Failed to locate an MSP instance matching the endorser identity\'s orgainization %s', mspid));
        return false
    }
    let copySerializedIdentity = sid.toBuffer();
    logger.debug('copySerializedIdentity');
    logger.debug(copySerializedIdentity)
    var identity = msp.deserializeIdentity(serializedIdentity, false);
    if (!identity.isValid()) {
        logger.debug('checkSerializedIdentity faild Identity is not vailed');
        return false;
    } else {
        let isAdmin = false;
        // check is the admin cert ;
        logger.warn('<=======  check admin cert  ===========>');
        msp._admins.forEach((adminIdentity) => {
            logger.debug("adminIdentity")
            logger.debug(adminIdentity.toBuffer().toString());
            // adminIdentity = msp.deserializeIdentity(adminIdentity, false);
            logger.debug('identity._certificate');
            logger.debug(identity._certificate);
            if (identity._certificate == adminIdentity.toBuffer().toString()) {
                isAdmin = true;
            }
        })
        return [mspid, identity, isAdmin]
    }
}

//make a peer alive status Map and set init value false

// for (let peer in ORGS[myOrgName]) {

//     if (peer.indexOf('peer') > -1) {
//         peerAliveState[myOrgName][peer] = false
//     }
//     if(peer.indexOf('ca')>-1){
//         peerAliveState[myOrgName][peer] = false
//     }
// }
//to check the status of appointed peer by ping them



// var getOrgRequestTime = (orgName) => {
//     if (!requestTime[orgName]) {
//         requestTime[orgName] = {
//             peers: {},
//             times: 0
//         }
//     }
//     return requestTime[orgName].times
// }
// var addOrgRequsetTime = (orgName) => {
//     if (!requestTime[orgName]) {
//         requestTime[orgName] = {
//             peers: {},
//             times: 0
//         }
//     }
//     requestTime[orgName].times++

// }








var getOrgNameByMspID = (mspID) => {
    for (let orgName in ORGS) {
        if (ORGS[orgName].mspid == mspID) {
            return orgName
        }
    }
    return null;
}
var transferSSLConfig = (url) => {

    if (config.fabric.mode == "dev") {
        url = url.replace(/https\:/g, 'http:')
        url = url.replace(/grpcs\:/g, 'grpc:')
    }
    // else {
    //     url = url.replace(/http\:/g, 'https:')
    //     url = url.replace(/grpc\:/g, 'grpcs:')
    // }

    return url

}
var processBlockToReadAbleJson = function(response_payloads) {
    var deSerializeArgs = (argsByteBuffer) => {
        let result = [];
        argsByteBuffer.forEach((byteBuffer) => {
            result.push(byteBuffer.toBuffer().toString())
        })
        return result
    }
    var result = []
    var txStatusCodes = response_payloads.metadata.metadata[_common.BlockMetadataIndex.TRANSACTIONS_FILTER];

    for (let dataIndex in response_payloads.data.data) {
        var validCode = convertValidationCode(txStatusCodes[dataIndex]);
        logger.debug(`######## start to parse tx ${dataIndex} ##########`)
        logger.debug(`######## vaild code ${validCode} ##########`)
        let txPayload = {}
        txPayload.validCode = validCode
        let channelHeader = response_payloads.data.data[dataIndex].payload.header.channel_header

        if (response_payloads.data.data[dataIndex].payload.data.config) {
            txPayload.txID = "configTx";
            txPayload.channelName = channelHeader.channel_id;
            txPayload.type = "config"
            txPayload.timestamp = channelHeader.timestamp;
        } else {
            let actions = response_payloads.data.data[dataIndex].payload.data.actions
            // logger.warn(actions)
            let actionsPayload = []
            actions.forEach((action) => {
                let txInput = {}
                let actionInput = action.payload.chaincode_proposal_payload.input
                let chaincode_spec = _chaincodeProto.ChaincodeInvocationSpec.decode(actionInput).chaincode_spec;
                txInput.chaincodeName = chaincode_spec.chaincode_id.name + ":" + chaincode_spec.chaincode_id.version;
                let argsByteBuffer = chaincode_spec.input.args
                txInput.input = deSerializeArgs(argsByteBuffer)
                if (txInput.input[0] == 'deploy' || txInput.input[0] == 'upgrade') {
                    innerSpec = _chaincodeProto.ChaincodeInvocationSpec.decode(new Buffer.from(txInput.input[2])).chaincode_spec
                    innerTxInput = {}
                    innerTxInput.chaincodeName = innerSpec.chaincode_id.name + ':' + innerSpec.chaincode_id.version
                    innerTxInput.input = deSerializeArgs(innerSpec.input.args)
                    txInput.input[2] = innerTxInput
                    logger.debug(txInput.input)
                    if (txInput.input[3]) {
                        console.log('start to parse signPolicy')
                        let signaturePolicyEnvelope = _policiesProto.SignaturePolicyEnvelope.decode(new Buffer.from(txInput.input[3]))
                        let policy = signaturePolicyEnvelope.policy
                        let n_out_of = policy.n_out_of
                        let identities = signaturePolicyEnvelope.identities
                        let c = 0;
                        identities.forEach((identity, index) => {

                            identities[index].principal = _mspPrincipalProto.MSPRole.decode(identity.principal.toBuffer())

                        })
                        txInput.input[3] = signaturePolicyEnvelope
                    }
                    logger.debug(txInput.input)


                }
                actionsPayload.push(txInput)
                txPayload.endorsementsInput = actionsPayload;
                txPayload.txID = channelHeader.tx_id;
                txPayload.timestamp = channelHeader.timestamp
                txPayload.channelName = channelHeader.channel_id;
                txPayload.type = "tx"
            })

        }
        result.push(txPayload)

    }
    return result
}
var _validation_codes = {};
var keys = Object.keys(_transProto.TxValidationCode);
for (var i = 0; i < keys.length; i++) {
    let new_key = _transProto.TxValidationCode[keys[i]];
    _validation_codes[new_key] = keys[i];
}

function convertValidationCode(code) {
    return _validation_codes[code];
}
var cloneJSON = (json) => {
    return JSON.parse(JSON.stringify(json))
}
var getGatewayAddressByMspID = (mspID) => {
    logger.debug('<========== start getGatewayAddressByMspID ======>')

    for (let org in ORGS) {
        if (ORGS[org].mspid && ORGS[org].mspid == mspID) {
            logger.debug('get address')
            logger.debug(ORGS[org].gatewayAddress)
            return ORGS[org].gatewayAddress
        }
    }
    throw new Error('can not get adress for ' + mspID);

}
var deleteArrayElement = (eIndex, arr) => {
    bArr = arr.splice(0, eIndex);
    // console.log(bArr)
    aArr = arr.splice(-(eIndex + 1));
    // console.log(aArr)
    fArr = bArr.concat(aArr);
    return fArr;
}
var turnBase64PemToBuffer = (base64pem) => {
    if (base64pem.indexOf('LS') == 0) {
        let base64Buffer = new Buffer.from(base64pem, 'base64');
        let pemString = base64Buffer.toString()
        console.log(pemString)
        if (pemString.indexOf('BEGIN') > -1 && pemString.indexOf('END') > -1) {
            return base64Buffer;
        } else {
            return null
        }
    }
}
function getOpt(orgName, peerName) {
    let opt = {}

    if (orgName == 'orderOrg') {
        try {
            let data = turnBase64PemToBuffer(ORGS[peerName]['tls_cacerts']);
            if (data) {
                logger.debug('tls_cacert is base64 encoded pem');
            } else {
                logger.debug('tls_cacert is not base64 encoded pem, may a path');
                data = fs.readFileSync(path.join(__dirname, ORGS[peerName]['tls_cacerts']));
            }
            opt = {
                pem: Buffer
                    .from(data)
                    .toString(),
                'ssl-target-name-override': ORGS[peerName]['server-hostname']
            }
            return opt

        } catch (e) {
            return null

        }
    }
    try {
        if (config.fabric.mode == "prod") {
            let data = fs.readFileSync(path.join(__dirname, ORGS[orgName][peerName]['tls_cacerts']));
            opt = {
                pem: Buffer
                    .from(data)
                    .toString(),
                'ssl-target-name-override': ORGS[orgName][peerName]['server-hostname']
            }
        }
        return opt
    } catch (e) {
        return null
    }

}
var renewRemote = (remoteObj) => {
    var remoteName = remoteObj._name;
    let opt = getOpt(remoteName[0], remoteName[1]);
    let pem = null;
    let url = transferSSLConfig(ORGS[remoteName[0]][remoteName[1]].requests);


    if (remoteName[0] != 'orderOrg') {
        let tempPeer = client.newPeer(url, opt)
        logger.debug('renew peer')
        remoteObj._endorserClient = tempPeer._endorserClient;
    } else {
        let tempOrderer = client.newOrderer(url, opt);
        remoteObj._ordererClient = tempOrderer._ordererClient;
    }
}

module.exports = {
    deleteArrayElement: deleteArrayElement,
    getOpt: getOpt,
    transferSSLConfig: transferSSLConfig,
    getOrgNameByMspID: getOrgNameByMspID,
    processBlockToReadAbleJson: processBlockToReadAbleJson,
    cloneJSON: cloneJSON,
    checkSerializedIdentity: checkSerializedIdentity,
    getGatewayAddressByMspID: getGatewayAddressByMspID,
    renewRemote: renewRemote
}