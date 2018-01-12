
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
var myOrgIndex = config.fabric.orgIndex
var peerAliveState = {}
var peerCach = {}
var requestTime = {}
var gatewayEventHub = require('../gatewayEventHub');

var checkPeerNameExist = (peerName, orgIndex) => {
    if (ORGS[orgIndex].hasOwnProperty(peerName)) {
        return true
    } else {
        return false
    }
}

gatewayEventHub.on('n-peer-revise', (reviseInfo) => {
    let {orgIndex, peerName, attribute} = reviseInfo;
    switch (attribute) {
        case 'requests': {
            let remoteObje = getPeerCach(peerName, orgIndex);
            if (remoteObje) {
                helper.renewRemote(remoteObje)
            }
            break;
        }
        case 'server-hostname': {
            let remoteObje = getPeerCach(peerName, orgIndex);
            if (remoteObje) {
                helper.renewRemote(remoteObje)
            }
            break;
        }
        case 'tls_cacerts': {
            let remoteObje = getPeerCach(peerName, orgIndex);
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

var setPeerCach = (peerName, orgIndex, peerObj) => {
    if (!peerCach[orgIndex]) {
        peerCach[orgIndex] = {}
    }
    peerCach[orgIndex][peerName] = peerObj
}
var getPeerCach = (peerName, orgIndex) => {
    if (peerCach[orgIndex]) {
        if (peerCach[orgIndex][peerName]) {
            return peerCach[orgIndex][peerName]
        }
    }
    return null
}
function getPeerByName(peerName, orgIndex) {
    orgIndex = orgIndex || myOrgIndex
    if (checkPeerNameExist(peerName, orgIndex)) {
        var cach = false;
        var peer = getPeerCach(peerName, orgIndex)
        if (peer) {
            return peer
        } else {
            let opt = helper.getOpt(orgIndex, peerName)
            peer = client.newPeer(helper.transferSSLConfig(ORGS[orgIndex][peerName].requests), opt);
            peer._name = [orgIndex, peerName];
            setPeerCach(peerName, orgIndex, peer)
            return peer

        }
    }

    throw new Error('can not get peer ' + peerName + ' in org ' + orgIndex)
}
module.exports.getPeerByName = getPeerByName

// reture same type peer from a channel config of an org, if type wasn't assigned, default return endorsment peer,
// support peer type [all,c,e] individual means all type commit type and endorse peer
//To DO: can support load balance and endorsePolicy by opt
module.exports.getChannelTargetByPeerType = (channelName, orgIndex, type, role) => {
    logger.debug('get channel %s of org %s by type %s', channelName, orgIndex, type)
    if (!channelConfig[channelName]) {
        logger.warn(util.format('channel : %s did not exist in channel config', channelName))
        throw Error(util.format('channel : %s did not exist in channel config', channelName))
    }
    if (orgIndex != 'all' && !channelConfig[channelName].peers[orgIndex]) {
        logger.warn(util.format('org: %s did not participate in channel : %s', orgIndex, channelName))
    }
    var getPeers = (channelName, orgIndex, type, role) => {

        for (let peerIndex in channelConfig[channelName].peers[orgIndex]) {
            let peerType = channelConfig[channelName].peers[orgIndex][peerIndex].type
            let peerRole = channelConfig[channelName].peers[orgIndex][peerIndex].role
            if (type != "all") {
                if (peerType == type) {
                    peerName = channelConfig[channelName].peers[orgIndex][peerIndex].name
                    let peer = getPeerByName(peerName, orgIndex)
                    if (role && role != 'any') {
                        if (peerRole == role) {
                            peers.push(peer)
                        }
                    } else {
                        peers.push(peer)
                    }

                }
            } else {
                peerName = channelConfig[channelName].peers[orgIndex][peerIndex].name
                let peer = getPeerByName(peerName, orgIndex)
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
    orgIndex = orgIndex || myOrgIndex
    type = type || "e"
    role = role || 'any'
    var peers = []
    if (orgIndex == 'all') {
        for (let org in channelConfig[channelName].peers) {
            getPeers(channelName, org, type, role)
        }
    } else {
        getPeers(channelName, orgIndex, type, role)
    }
    logger.debug("get target : " + peers)
    return peers
}


module.exports.getPeerNameList = (orgIndex) => {
    var peerNameList = []
    orgIndex = orgIndex || myOrgIndex;
    for (let peer in ORGS[orgIndex]) {
        if (peer.indexOf('peer') > -1) {
            peerNameList.push(peer)
        }
    }
    return peerNameList
}

module.exports.getOrgTargets = (channelName, orgIndex) => {
    var orgCheck = true
    orgIndex = orgIndex || myOrgIndex
    if (channelName) {
        orgCheck = false
        channelConfig[channelName].orgs.forEach((org) => {
            if (org == orgIndex) {
                orgCheck = true
            }
        })
    }
    var targets = []
    if (orgCheck) {
        for (let key in ORGS[orgIndex]) {
            if (key.indexOf('peer') === 0) {
                let opt = getOpt(orgIndex, key)
                let peer = client.newPeer(helper.transferSSLConfig(ORGS[orgIndex][key].requests), opt);
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

function getPeerByIp(ip, orgIndex) {
    orgIndex = orgIndex || myOrgIndex
    logger.debug('start to get %s peer', ip)
    for (let peer in ORGS[orgIndex]) {
        if (peer.indexOf('peer') > -1) {
            if (ORGS[orgIndex][peer].requests.indexOf(ip) > -1) {
                let opt = getOpt(orgIndex, peer)
                let peer = client.newPeer(helper.transferSSLConfig(ORGS[orgIndex][peerName].requests), opt);
                return peer
            }
        }
    }
    throw new Error('can not get peer object  from ' + ip)
}
module.exports.getPeerByIp = getPeerByIp;



//interval invoke check method to change peers status


//for other module to get newest peer state
module.exports.getPeerAliveState = (peerName, orgIndex) => {
    orgIndex = orgIndex || myOrgIndex
    if (peerAliveState[myOrgIndex] && peerAliveState[myOrgIndex][peerName]) {

        return peerAliveState[myOrgIndex][peerName];
    } else {
        return false
    }
}
module.exports.getAllAliveState = () => {
    return peerAliveState
}
var checkPeerAlive = (peerName, orgIndex) => {
    orgIndex = orgIndex || myOrgIndex
    let url
    if (peerName.indexOf('order') > -1) {
        url = ORGS[peerName].url
        if (url.indexOf('grpcs') > -1) {
            url = url.replace(/grpcs?\:\/\//, '').split(':')
        } else {
            url = url.replace(/grpc?\:\/\//, '').split(':')
        }
    } else if (peerName == 'ca') {
        url = ORGS[orgIndex][peerName].url
        if (url.indexOf('https') > -1) {
            url = url.replace(/https?\:\/\//, '').split(':')
        } else {
            url = url.replace(/http?\:\/\//, '').split(':')
        }

    } else {
        url = ORGS[orgIndex][peerName].requests
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

    for (let orgIndex in ORGS) {
        if (orgIndex.indexOf('order') > -1) {
            if (!newPeerAliveState['orderer']) {
                newPeerAliveState['orderer'] = {}
            }
            newPeerAliveState['orderer'][orgIndex] = false;
        } else {
            if (!newPeerAliveState[orgIndex]) {
                newPeerAliveState[orgIndex] = {}
            }
            for (let peerName in ORGS[orgIndex]) {
                if (peerName.indexOf('peer') > -1) {
                    newPeerAliveState[orgIndex][peerName] = false
                }
                if (peerName.indexOf('ca') > -1) {
                    newPeerAliveState[orgIndex][peerName] = false
                }
            }
        }
    }
    let promiseArr = [];
    for (let orgIndex in newPeerAliveState) {
        for (let peerName in newPeerAliveState[orgIndex]) {
            let p = checkPeerAlive(peerName, orgIndex).then((res) => {
                newPeerAliveState[orgIndex][peerName] = res
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
        for (var orgIndex in orgOpt) {
            logger.debug(`org ${orgIndex}`)
            logger.debug('peer list')
            logger.debug(orgOpt[orgIndex])
            for (let peerName of orgOpt[orgIndex]) {
                logger.debug(`get peer ${peerName} of ${orgIndex}`)
                peers.push(getPeerByName(peerName, orgIndex))
            }
        }

    }
    return peers
}

module.exports.addPeerRequestTime = (orgIndex, peerName) => {
    if (!requestTime[orgIndex]) {
        requestTime[orgIndex] = {
            peers: {},
            times: 0
        }
        requestTime[orgIndex].peers[peerName] = {
            times: 0
        }
    } else if (!requestTime[orgIndex][peerName]) {
        requestTime[orgIndex].peers[peerName] = {
            times: 0
        }
    }
    requestTime[orgIndex].times++;
    requestTime[orgIndex].peers[peerName].times++
}
module.exports.getPeerRequsetTime = (orgIndex, peerName) => {
    if (!requestTime[orgIndex]) {
        requestTime[orgIndex] = {
            peers: {},
            times: 0
        }
        requestTime[orgIndex].peers[peerName] = {
            times: 0
        }
    } else if (!requestTime[orgIndex][peerName]) {
        requestTime[orgIndex].peers[peerName] = {
            times: 0
        }
    }
    return requestTime[orgIndex].peers[peerName].times
}


checkAllAliveStatue()