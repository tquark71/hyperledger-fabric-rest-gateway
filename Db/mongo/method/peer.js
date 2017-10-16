var mongo = require('../mongo')
var DBName = 'peerDB'
var log4js = require('log4js');
var logger = log4js.getLogger('DB/mongo/peer');
var updatePeer = (peerName, peer) => {

    let peerDB = mongo.getDbs(peerName, DBName)
    return peerDB.update({
        peerName: peer.peerName
    }, peer, {
        upsert: true,
    }).catch((e) => {
        logger.error(e)
    })
}
var removePeer = (peerName, condition) => {
    let peerDB = mongo.getDbs(peerName, DBName)
    return peerDB.remove(condition)
}
var getPeer = (peerName) => {
    let peerDB = mongo.getDbs(peerName, DBName)

    return peerDB.findOne({
        peerName: peerName,
    })

}
var getPeers = (peerName, condition) => {
    let peerDB = mongo.getDbs(peerName, DBName)
    return peerDB.find(condition)
}

module.exports = {
    updatePeer: updatePeer,
    removePeer: removePeer,
    getPeer: getPeer,
    getPeers: getPeers
}