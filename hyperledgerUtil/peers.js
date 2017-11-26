
var log4js = require('log4js');
var logger = log4js.getLogger('peers');
var client = require('./client')
var hfc = require('fabric-client');
var config = require('../config');
var fs = require("fs")
var util = require('util')
var path = require('path')
var tcpp = require('tcp-ping');
var networkConfig = require('./networkConfig')
var ORGS = networkConfig.getNetworkConfig()
var channelConfig = networkConfig.getChannelConfig()
var helper = require('./helper')
var myOrgName = config.fabric.orgName
var peerAliveState = {}
var peerCach = {}
var requestTime = {}
var gatewayEventHub = require('../gatewayEventHub');

var checkPeerNameExist = (peerName, orgName) => {
    if (ORGS[orgName].hasOwnProperty(peerName)) {
        return true
    } else {
        return false
    }
}

gatewayEventHub.on('n-peer-revise', (reviseInfo) => {
    let {orgName, peerName, attribute} = reviseInfo;
    switch (attribute) {
        case 'requests': {
            let remoteObje = getPeerCach(peerName, orgName);
            if (remoteObje) {
                helper.renewRemote(remoteObje)
            }
            break;
        }
        case 'server-hostname': {
            let remoteObje = getPeerCach(peerName, orgName);
            if (remoteObje) {
                helper.renewRemote(remoteObje)
            }
            break;
        }
        case 'tls_cacerts': {
            let remoteObje = getPeerCach(peerName, orgName);
            if (remoteObje) {
                helper.renewRemote(remoteObje)
            }
            break;
        }
        default: {
            break;
        }
    }
})

var setPeerCach = (peerName, orgName, peerObj) => {
    if (!peerCach[orgName]) {
        peerCach[orgName] = {}
    }
    peerCach[orgName][peerName] = peerObj
}
var getPeerCach = (peerName, orgName) => {
    if (peerCach[orgName]) {
        if (peerCach[orgName][peerName]) {
            return peerCach[orgName][peerName]
        }
    }
    return null
}
function getPeerByName(peerName, orgName) {
    orgName = orgName || myOrgName
    if (checkPeerNameExist(peerName, orgName)) {
        var cach = false;
        var peer = getPeerCach(peerName, orgName)
        if (peer) {
            return peer
        } else {
            let opt = helper.getOpt(orgName, peerName)
            peer = client.newPeer(helper.transferSSLConfig(ORGS[orgName][peerName].requests), opt);
            peer._name = [orgName, peerName];
            setPeerCach(peerName, orgName, peer)
            return peer

        }
    }

    throw new Error('can not get peer ' + peerName + ' in org ' + orgName)
}
module.exports.getPeerByName = getPeerByName

// reture same type peer from a channel config of an org, if type wasn't assigned, default return endorsment peer,
// support peer type [all,c,e] individual means all type commit type and endorse peer
//To DO: can support load balance and endorsePolicy by opt
module.exports.getChannelTargetByPeerType = (channelName, orgName, type, role) => {
    logger.debug('get channel %s of org %s by type %s', channelName, orgName, type)
    if (!channelConfig[channelName]) {
        logger.warn(util.format('channel : %s did not exist in channel config', channelName))
        throw Error(util.format('channel : %s did not exist in channel config', channelName))
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


module.exports.getPeerNameList = (orgName) => {
    var peerNameList = []
    orgName = orgName || myOrgName;
    for (let peer in ORGS[orgName]) {
        if (peer.indexOf('peer') > -1) {
            peerNameList.push(peer)
        }
    }
    return peerNameList
}

module.exports.getOrgTargets = (channelName, orgName) => {
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
                let peer = client.newPeer(helper.transferSSLConfig(ORGS[orgName][key].requests), opt);
                targets.push(peer);
            }
        }
    } else {
        targets = null
    }

    return targets
}

module.exports.getPeerByIps = (ipArr) => {
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
                let peer = client.newPeer(helper.transferSSLConfig(ORGS[orgName][peerName].requests), opt);
                return peer
            }
        }
    }
    throw new Error('can not get peer object  from ' + ip)
}
module.exports.getPeerByIp = getPeerByIp;



//interval invoke check method to change peers status


//for other module to get newest peer state
module.exports.getPeerAliveState = (peerName, orgName) => {
    orgName = orgName || myOrgName
    if (peerAliveState[myOrgName] && peerAliveState[myOrgName][peerName]) {

        return peerAliveState[myOrgName][peerName];
    } else {
        return false
    }
}
module.exports.getAllAliveState = () => {
    return peerAliveState
}
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
function checkAllAliveStatue() {
    let newPeerAliveState = {};

    for (let orgName in ORGS) {
        if (orgName.indexOf('order') > -1) {
            if (!newPeerAliveState['orderer']) {
                newPeerAliveState['orderer'] = {}
            }
            newPeerAliveState['orderer'][orgName] = false;
        } else {
            if (!newPeerAliveState[orgName]) {
                newPeerAliveState[orgName] = {}
            }
            for (let peerName in ORGS[orgName]) {
                if (peerName.indexOf('peer') > -1) {
                    newPeerAliveState[orgName][peerName] = false
                }
                if (peerName.indexOf('ca') > -1) {
                    newPeerAliveState[orgName][peerName] = false
                }
            }
        }
    }
    let promiseArr = [];
    for (let orgName in newPeerAliveState) {
        for (let peerName in newPeerAliveState[orgName]) {
            let p = checkPeerAlive(peerName, orgName).then((res) => {
                newPeerAliveState[orgName][peerName] = res
                return Promise.resolve();
            })
            promiseArr.push(p);
        }
    }
    Promise.all(promiseArr).then(() => {
        peerAliveState = newPeerAliveState;
    })
}

setInterval(() => {
    checkAllAliveStatue();
}, 1000)
// Opt formant ex:
// {
//     "org1": ["peer1", "peer2"],
//     "org2": ["peer1"]
// }

module.exports.getTargetsByOpt = (opt) => {
    logger.debug('<==== getTargetsByOpt start ====>');
    console.log(opt)
    var peers = []
    for (var orgOpt of opt) {
        for (var orgName in orgOpt) {
            logger.debug(`org ${orgName}`)
            logger.debug('peer list')
            logger.debug(orgOpt[orgName])
            for (let peerName of orgOpt[orgName]) {
                logger.debug(`get peer ${peerName} of ${orgName}`)
                peers.push(getPeerByName(peerName, orgName))
            }
        }

    }
    return peers
}

module.exports.addPeerRequestTime = (orgName, peerName) => {
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
module.exports.getPeerRequsetTime = (orgName, peerName) => {
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


checkAllAliveStatue()