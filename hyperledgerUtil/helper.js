var client = require('./client')
var hfc = require('fabric-client');
var EventHub = require('fabric-client/lib/EventHub.js');
var config = require('../config.json');
var fs = require("fs")
var util = require('util')
var path = require('path')
var tcpp = require('tcp-ping');
var myOrgName = config.orgName
var log4js = require('log4js');
var logger = log4js.getLogger('helper');
logger.setLevel(config.logLevel);
hfc.setLogger(logger);
var channelConfig = hfc.getConfigSetting('channelConfig')
var ORGS = hfc.getConfigSetting('network-config');
var grpc = require('grpc');
var _policiesProto = grpc.load(__dirname + '/protos/common/policies.proto').common;
var _chaincodeProto = grpc.load(__dirname + '/protos/peer/chaincode.proto').protos;
var _identityProto = grpc.load(path.join(__dirname, '/protos/msp/identities.proto')).msp;
var _chaincodeDataProto = grpc.load(__dirname + '/protos/peer/chaincode_data.proto').protos;
var _commomProto = grpc.load(__dirname + '/protos/common/policies.proto').common;
var _mspPrincipalProto = grpc.load(__dirname + '/protos/msp/msp_principal.proto').common;
var peerCach = {}
var getPeerCach = (peerName, orgName) => {
    if (peerCach[orgName]) {
        if (peerCach[orgName][peerName]) {
            return peerCach[orgName][peerName]
        }
    }
    return null
}
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
var setPeerCach = (peerName, orgName, peerObj) => {
    if (!peerCach[orgName]) {
        peerCach[orgName] = {}
    }
    peerCach[orgName][peerName] = peerObj
}
var getPeerByName = (peerName, orgName) => {
    orgName = orgName || myOrgName
    if (checkPeerNameExist(peerName, orgName)) {
        var cach = false;
        var peer = getPeerCach(peerName, orgName)
        if (peer) {
            return peer
        } else {
            let opt = getOpt(orgName, peerName)
            peer = client.newPeer(transferSSLConfig(ORGS[orgName][peerName].requests), opt);
            setPeerCach(peerName, orgName, peer)
            return peer

        }
    }

    throw new Error('can not get peer ' + peerName + ' in org ' + orgName)
}
//make a peer alive status Map and set init value false
var peerAliveState = {}
function checkAllAliveStatue() {
    for (let orgName in ORGS) {
        if (orgName.indexOf('order') > -1) {
            if (!peerAliveState['orderer']) {
                peerAliveState['orderer'] = {}
            }
            peerAliveState['orderer'][orgName] = false;
        } else {
            if (!peerAliveState[orgName]) {
                peerAliveState[orgName] = {}
            }
            for (let peerName in ORGS[orgName]) {
                if (peerName.indexOf('peer') > -1) {
                    peerAliveState[orgName][peerName] = false
                }
                if (peerName.indexOf('ca') > -1) {
                    peerAliveState[orgName][peerName] = false
                }
            }
        }
    }
    setInterval(() => {
        for (let orgName in peerAliveState) {
            for (let peerName in peerAliveState[orgName]) {
                checkPeerAlive(peerName, orgName).then((res) => {
                    peerAliveState[orgName][peerName] = res
                })
            }
        }
    }, 1000)


}
// for (let peer in ORGS[myOrgName]) {

//     if (peer.indexOf('peer') > -1) {
//         peerAliveState[myOrgName][peer] = false
//     }
//     if(peer.indexOf('ca')>-1){
//         peerAliveState[myOrgName][peer] = false
//     }
// }
//to check the status of appointed peer by ping them
var checkPeerAlive = (peerName, orgName) => {
    orgName = orgName || myOrgName
    let url
    if (peerName.indexOf('order') > -1) {
        url = ORGS[peerName].url
        if (url.indexOf('grpcs') > -1) {
            url = url.replace(/grpcs?\:\/\//, '').split(':')
        } else {
            url = url.replace(/grpc?\:\/\//, '').split(':')
        }
    } else if (peerName == 'ca') {
        url = ORGS[orgName][peerName]
        if (url.indexOf('https') > -1) {
            url = url.replace(/https?\:\/\//, '').split(':')
        } else {
            url = url.replace(/http?\:\/\//, '').split(':')
        }

    } else {
        url = ORGS[orgName][peerName].requests
        if (url.indexOf('grpcs') > -1) {
            url = url.replace(/grpcs?\:\/\//, '').split(':')
        } else {
            url = url.replace(/grpc?\:\/\//, '').split(':')
        }
    }
    return new Promise((rs, rj) => {
        tcpp.probe(url[0], url[1], function(err, res) {
            if (err) {
                rj(err)
            } else {
                rs(res)
            }
        })
    })

}

//interval invoke check method to change peers status
setInterval(() => {
    for (let peerName in peerAliveState[myOrgName]) {
        checkPeerAlive(peerName).then((res) => {
            peerAliveState[myOrgName][peerName] = res
        })
    }
}, 1000)

//for other module to get newest peer state
var getPeerAliveState = (peerName, orgName) => {
    orgName = orgName || myOrgName
    return peerAliveState[myOrgName][peerName]
}
var getAllAliveState = () => {
    return peerAliveState
}
var requestTime = {}
var getOrgRequestTime = (orgName) => {
    if (!requestTime[orgName]) {
        requestTime[orgName] = {
            peers: {},
            times: 0
        }
    }
    return requestTime[orgName].times
}
var addOrgRequsetTime = (orgName) => {
    if (!requestTime[orgName]) {
        requestTime[orgName] = {
            peers: {},
            times: 0
        }
    }
    requestTime[orgName].times++

}
var getPeerRequsetTime = (orgName, peerName) => {
    if (!requestTime[orgName]) {
        requestTime[orgName] = {
            peers: {},
            times: 0
        }
        requestTime[orgName].peers[peerName] = {
            times: 0
        }
    } else if (!requestTime[orgName][peerName]) {
        requestTime[orgName].peers[peerName] = {
            times: 0
        }
    }
    return requestTime[orgName].peers[peerName].times
}
var addPeerRequestTime = (orgName, peerName) => {
    if (!requestTime[orgName]) {
        requestTime[orgName] = {
            peers: {},
            times: 0
        }
        requestTime[orgName].peers[peerName] = {
            times: 0
        }
    } else if (!requestTime[orgName][peerName]) {
        requestTime[orgName].peers[peerName] = {
            times: 0
        }
    }
    requestTime[orgName].times++;
    requestTime[orgName].peers[peerName].times++
}

// Opt formant ex:
// {
//     "org1": ["peer1", "peer2"],
//     "org2": ["peer1"]
// }

var getTargetsByOpt = (opt) => {
    var peers = []
    for (var org in opt) {
        for (let peerNameIndex in opt[org]) {
            peers.push(getPeerByName(org, opt[org][peerNameIndex]))
        }
    }
    return peers
}


// reture same type peer from a channel config of an org, if type wasn't assigned, default return endorsment peer,
// support peer type [all,c,e] individual means all type commit type and endorse peer
//To DO: can support load balance and endorsePolicy by opt
var getChannelTargetByPeerType = (channelName, orgName, type, role) => {
    logger.debug('get channel %s of org %s by type %s', channelName, orgName, type)
    if (!channelConfig[channelName]) {
        logger.warn(util.format('channel : %s did not exist in channel config', channelName))
    }
    if (orgName != 'all' && !channelConfig[channelName].peers[orgName]) {
        logger.warn(util.format('org: %s did not participate in channel : %s', orgName, channelName))
    }
    var getPeers = (channelName, orgName, type, role) => {

        for (let peerIndex in channelConfig[channelName].peers[orgName]) {
            let peerType = channelConfig[channelName].peers[orgName][peerIndex].type
            let peerRole = channelConfig[channelName].peers[orgName][peerIndex].role
            if (type != "all") {
                if (peerType == type) {
                    peerName = channelConfig[channelName].peers[orgName][peerIndex].name
                    let peer = getPeerByName(peerName, orgName)
                    if (role && role != 'any') {
                        if (peerRole == role) {
                            peers.push(peer)
                        }
                    } else {
                        peers.push(peer)
                    }

                }
            } else {
                peerName = channelConfig[channelName].peers[orgName][peerIndex].name
                let peer = getPeerByName(peerName, orgName)
                if (role && role != 'any') {
                    if (peerRole == role) {
                        peers.push(peer)
                    }
                } else {
                    peers.push(peer)
                }
            }

        }
    }
    orgName = orgName || myOrgName
    type = type || "e"
    role = role || 'any'
    var peers = []
    if (orgName == 'all') {
        for (let org in channelConfig[channelName].peers) {
            getPeers(channelName, org, type, role)
        }
    } else {
        getPeers(channelName, orgName, type, role)
    }
    logger.debug("get target : " + peers)
    return peers
}


function getPeerNameList(orgName) {
    var peerNameList = []
    orgName = orgName || myOrgName;
    for (let peer in ORGS[orgName]) {
        if (peer.indexOf('peer') > -1) {
            peerNameList.push(peer)
        }
    }
    return peerNameList
}

function getOrgTargets(channelName, orgName) {
    var orgCheck = true
    orgName = orgName || myOrgName
    if (channelName) {
        orgCheck = false
        channelConfig[channelName].orgs.forEach((org) => {
            if (org == orgName) {
                orgCheck = true
            }
        })
    }
    var targets = []
    if (orgCheck) {
        for (let key in ORGS[orgName]) {
            if (key.indexOf('peer') === 0) {
                let opt = getOpt(orgName, key)
                let peer = client.newPeer(transferSSLConfig(ORGS[orgName][key].requests), opt);
                targets.push(peer);
            }
        }
    } else {
        targets = null
    }

    return targets
}

function getEventHubByChannel(channelName, userContext) {
    logger.debug('start to get event hub by channel');
    var ehs = [];
    for (let peerIndex in channelConfig[channelName].peers[myOrgName]) {
        let peerName = channelConfig[channelName].peers[myOrgName][peerIndex].name

        ehs.push(getEventHubByName(peerName, userContext))
    }
    return ehs
}

function getOrgEventHubs(userContext, channelName, orgName) {
    orgName = orgName || myOrgName
    logger.debug('start to get event hubs')
    var ehs = []
    var orgPeerInChannel = true
    if (channelName) {
        orgPeerInChannel = false
        if (channelConfig[channelName].peers.hasOwnProperty(orgName)) {
            orgPeerInChannel = true
        }
    }
    if (orgPeerInChannel) {
        for (let peer in ORGS[orgName]) {
            if (peer.indexOf('peer') > -1) {
                client._userContext = userContext;

                eh = client.newEventHub();
                let opt = getOpt(orgName, peer)
                eh.setPeerAddr(transferSSLConfig(ORGS[orgName][peer]['events']), opt);
                eh.connect();
                ehs.push(eh)
            }
        }
    }
    return ehs
}


function getEventHubByName(peerName, userContext) {
    if (checkPeerNameExist(peerName, myOrgName)) {
        logger.debug('start to get %s evenhub', peerName)
        client.setUserContext(userContext);
        let eh = client.newEventHub();
        let opt = getOpt(myOrgName, peerName)
        logger.debug('event hub url is ' + ORGS[myOrgName][peerName]['events'])
        eh.setPeerAddr(transferSSLConfig(ORGS[myOrgName][peerName]['events']), opt)
        eh.connect();
        logger.debug('finish get eventhub')
        return eh
    }
    throw new Error('can not get event hub from ' + peerName)
}

function getEventHubByIp(ip, userContext) {
    logger.debug('start to get %s evenhub', ip)
    for (let peer in ORGS[myOrgName]) {
        if (peer.indexOf('peer') > -1) {
            if (ORGS[myOrgName][peer].events.indexOf(ip) > -1) {
                client.setUserContext(userContext);
                let eh = client.newEventHub();
                let opt = getOpt(myOrgName, peer)
                eh.setPeerAddr(transferSSLConfig(ORGS[myOrgName][peer]['events']), opt)
                eh.connect();
                return eh
            }
        }
    }
    throw new Error('can not get event hub from ' + ip)
}

function getPeerByIps(ipArr) {
    peers = []

    ipArr.forEach((ip) => {
        let peer = getPeerByIp(ip)
        peers.push(peer)
    })
    return peers
}

function getPeerByIp(ip, orgName) {
    orgName = orgName || myOrgName
    logger.debug('start to get %s peer', ip)
    for (let peer in ORGS[orgName]) {
        if (peer.indexOf('peer') > -1) {
            if (ORGS[orgName][peer].requests.indexOf(ip) > -1) {
                let opt = getOpt(orgName, peer)
                let peer = client.newPeer(transferSSLConfig(ORGS[orgName][peerName].requests), opt);
                return peer
            }
        }
    }
    throw new Error('can not get peer object  from ' + ip)
}
var closeEhs = function(ehs) {

    logger.debug('start to close event hubs');
    for (var key in ehs) {
        var eventhub = ehs[key];
        if (eventhub && eventhub.isconnected()) {
            eventhub.disconnect();
        }
    }
};

function getOpt(orgName, peerName) {
    let opt = {}
    try {
        if (config.mode == "prod") {
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
var checkPeerNameExist = (peerName, orgName) => {
    if (ORGS[orgName].hasOwnProperty(peerName)) {
        return true
    } else {
        return false
    }
}


var getOrgNameByMspID = (mspID) => {
    for (let orgName in ORGS) {
        if (ORGS[orgName].mspid == mspID) {
            return orgName
        }
    }
    return null;
}
var transferSSLConfig = (url) => {

    if (config.mode == "dev") {
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
    for (let dataIndex in response_payloads.data.data) {
        let txPayload = {}
        let channelHeader = response_payloads.data.data[dataIndex].payload.header.channel_header

        if (response_payloads.data.data[dataIndex].payload.data.config) {
            txPayload.txID = "configTx";
            txPayload.channelName = channelHeader.channel_id;
            txPayload.type = "config"
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
var cloneJSON = (json) => {
    return JSON.parse(JSON.stringify(json))
}
checkAllAliveStatue()
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
module.exports = {
    getAllAliveState: getAllAliveState,
    getPeerByName: getPeerByName,
    getOrgTargets: getOrgTargets,
    getOrgEventHubs: getOrgEventHubs,
    closeEhs: closeEhs,
    getOpt: getOpt,
    transferSSLConfig: transferSSLConfig,
    getEventHubByName: getEventHubByName,
    getPeerByIps: getPeerByIps,
    getTargetsByOpt: getTargetsByOpt,
    getChannelTargetByPeerType: getChannelTargetByPeerType,
    getEventHubByChannel: getEventHubByChannel,
    getOrgNameByMspID: getOrgNameByMspID,
    processBlockToReadAbleJson: processBlockToReadAbleJson,
    getPeerAliveState: getPeerAliveState,
    cloneJSON: cloneJSON,
    getPeerRequsetTime: getPeerRequsetTime,
    addPeerRequestTime: addPeerRequestTime,
    getPeerNameList: getPeerNameList,
    checkSerializedIdentity: checkSerializedIdentity,
    getGatewayAddressByMspID: getGatewayAddressByMspID
}