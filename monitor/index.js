console.log('monitor required')
var hyperUtil = require('../hyperledgerUtil')

var hfc = require('fabric-client')
var config = require('../config')
var channelAPI = hyperUtil.channelAPI
var DBMethods = require('../Db')
var blockMethod = DBMethods.blockMethod;
var log4js = require('log4js');
var logger = log4js.getLogger('monitor');
logger.setLevel(config.gateway.logLevel);
var myOrgIndex = config.fabric.orgIndex;
var networkConfig = hyperUtil.networkConfig;
var ORGS = networkConfig.getNetworkConfig();
var Peer = require('./peer')
var gatewayEventHub = require('../gatewayEventHub');
// var monitorIoAPIs = require('./ioAPI')
peers = {}
var io = require('../io').getIo();
gatewayEventHub.on('n-peer-add', (orgIndex, peerName) => {
    logger.debug('receive event');
    logger.debug('<======= n-peer-remove ========>');
    logger.debug('orgIndex');
    logger.debug(orgIndex);
    logger.debug('peerName');
    logger.debug(peerName);
    if (orgIndex == myOrgIndex) {
        initPeer(peerName);
    }
})
gatewayEventHub.on('n-peer-remove', (orgIndex, peerName) => {
    logger.debug('receive event');
    logger.debug('<======= n-peer-remove ========>');
    logger.debug('orgIndex');
    logger.debug(orgIndex);
    logger.debug('peerName');
    logger.debug(peerName);
    if (orgIndex == myOrgIndex) {
        getPeer(peerName).then((peer) => {
            peer.delete();
            delete peers[peerName];
        })
    }

})
// internal method to init monitor/peer object
var initPeer = (peerName) => {
    logger.info('new monitor peer obj for peer %s', peerName)
    peers[peerName] = new Peer(peerName, ORGS[myOrgIndex][peerName].requests, io)
    peers[peerName].start()
}
var initDB = () => {
    logger.info('start to monitor')
    for (let peer in ORGS[myOrgIndex]) {
        if (peer.indexOf('peer') > -1) {
            initPeer(peer)
        }
    }
}

// get monitor/peer object
var getPeer = (peerName) => {
    logger.debug('fetch peer object %s', peerName)
    if (peers[peerName]) {
        return Promise.resolve(peers[peerName])
    } else {
        return Promise.reject('can not find the peer')
    }
}
let allPeerAliveStatus = {};
setInterval(() => {
    let currentAliveStatus = hyperUtil.peers.getAllAliveState()

    if (JSON.stringify(currentAliveStatus) !== JSON.stringify(allPeerAliveStatus)) {
        logger.debug('emit aliveStatusChange')

        allPeerAliveStatus = hyperUtil.helper.cloneJSON(currentAliveStatus)
        io.emit('aliveStatusChange', allPeerAliveStatus)
    }
}, 2000)

module.exports = {
    initDB: initDB,
    getPeer: getPeer
}
