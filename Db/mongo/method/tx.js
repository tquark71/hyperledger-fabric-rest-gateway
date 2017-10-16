var mongo = require('../mongo')
var DBName = 'txDB'
var log4js = require('log4js');
var logger = log4js.getLogger('DB/mongo/tx');

var updateTxs = (peerName, txs) => {
    let txDB = mongo.getDbs(peerName, DBName)

    return txDB.update({
        blockNumber: tx.blockNumber,
        channelName: tx.channelName,
        txID: tx.txID
    }, txs, {
        upsert: true
    }).catch((e) => {
        logger.error(e)
    })
}
var removeTx = (peerName, condition) => {
    let txDB = mongo.getDbs(peerName, DBName)

    return txDB.remove(condition)
}
var findTxByTxID = (peerName, channelName, ID) => {
    let txDB = mongo.getDbs(peerName, DBName)

    return txDB.findOne({
        channelName: channelName,
        txID: ID
    })
}
var findTxsByRange = (peerName, channelName, start, end) => {
    let txDB = mongo.getDbs(peerName, DBName)
    return txDB.find({
        channelName: channelName,
        number: {
            $gt: start - 1,
            $lt: end
        }
    })
}
var findTxsByChannelName = (peerName, channelName) => {
    let txDB = mongo.getDbs(peerName, DBName)
    return txDB.find({
        channelName: channelName
    })
}
var findTxsByBlockNum = (peerName, channelName, number) => {
    let txDB = mongo.getDbs(peerName, DBName)
    return txDB.find({
        channelName: channelName,
        blockNum: number
    })
}

module.exports = {
    removeTx: removeTx,
    findTxByTxID: findTxByTxID,
    findTxsByChannelName: findTxsByChannelName,
    findTxsByBlockNum: findTxsByBlockNum,
    // updateTx: updateTx,
    findTxsByRange: findTxsByRange
}