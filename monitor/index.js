console.log('monitor required')
var hyperUtil = require('../hyperledgerUtil')

var hfc = require('fabric-client')
var config = require('../config')
var channelAPI = hyperUtil.channelAPI
var DBMethods = require('../Db')
var blockMethod = DBMethods.blockMethod;
var log4js = require('log4js');
var logger = log4js.getLogger('monitor');
logger.setLevel(config.logLevel);
hfc.setLogger(logger);
var myOrgName = config.orgName;
var ORGS = hfc.getConfigSetting('network-config');
var Peer = require('./peer')
// var monitorIoAPIs = require('./ioAPI')
peers = {}
var io = require('../io').getIo();
// internal method to init monitor/peer object
var initDB = () => {
    logger.info('start to monitor')
    for (let peer in ORGS[myOrgName]) {
        if (peer.indexOf('peer') > -1) {
            logger.info('new monitor peer obj for peer %s', peer)
            peers[peer] = new Peer(peer, ORGS[myOrgName][peer].requests,io)
            peers[peer].start()
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
let allPeerAliveStatus={};
setInterval(()=>{
    let currentAliveStatus = hyperUtil.helper.getAllAliveState()

    if(JSON.stringify(currentAliveStatus)!==JSON.stringify(allPeerAliveStatus)){
        logger.debug('emit aliveStatusChange')

        allPeerAliveStatus = hyperUtil.helper.cloneJSON(currentAliveStatus)
        io.emit('aliveStatusChange',allPeerAliveStatus)
    }
},2000)

module.exports = {
    initDB: initDB,
    getPeer: getPeer
}
