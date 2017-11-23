var mongo = require('../mongo')
var DBName = 'chaincodeDB'
var log4js = require('log4js');
var logger = log4js.getLogger('DB/mongo/chaincode');
var updateChaincodeInfo = (peerName, chaincodeInfo) => {
    let chaincodeDB = mongo.getDbs(peerName, DBName)
    var chaincodeName = chaincodeInfo.chaincodeName;
    var channelName = chaincodeInfo.channelName;
    return chaincodeDB.update({
        chaincodeName: chaincodeName,
        channelName: channelName
    }, chaincodeInfo, {
        upsert: true
    }).catch((e) => {

        logger.error('chaincode err:' + e)
    })
}
var removeChaincodeInfo = (peerName, condition) => {
    let chaincodeDB = mongo.getDbs(peerName, DBName)

    return chaincodeDB.remove(condition)
}
var getChaincodeInfosByChannel = (peerName, channelName) => {
    let chaincodeDB = mongo.getDbs(peerName, DBName)
    return chaincodeDB.find({
        channelName: channelName
    }).then((res)=>{
        return res
    })
}
var getChaincodeByName = (peerName, channelName, chaincodeName) => {
    let chaincodeDB = mongo.getDbs(peerName, DBName)

    return chaincodeDB.findOne({
        channelName: channelName,
        chaincodeName: chaincodeName
    })
}
module.exports = {
    updateChaincodeInfo: updateChaincodeInfo,
    removeChaincodeInfo: removeChaincodeInfo,
    getChaincodeInfosByChannel: getChaincodeInfosByChannel,
    getChaincodeByName: getChaincodeByName
}