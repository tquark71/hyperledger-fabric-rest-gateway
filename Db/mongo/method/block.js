var mongo = require('../mongo')
var DBName = 'blockDB'
var log4js = require('log4js');
var logger = log4js.getLogger('DB/mongo/block');

var getBlockByNumber = (peerName, channelName, number) => {
    let blockDB = mongo.getDbs(peerName, DBName)
    return blockDB.findOne({
        number: number,
        channelName: channelName,
    })
}
var removeBlock = (peerName, condition) => {
    let blockDB = mongo.getDbs(peerName, DBName)

    return blockDB.remove(condition)
}
var updateBlock = (peerName, block) => {
    let blockDB = mongo.getDbs(peerName, DBName)
    return blockDB.update({
        channelName: block.channelName,
        number: block.number
    }, block, {
        upsert: true
    }).catch((e) => {
        logger.error(e)
    })
}
var getBlocks = (peerName, condition) => {
    let blockDB = mongo.getDbs(peerName, DBName)
    return blockDB.find(condition).sort({
        number: 1
    })
}
var getAllBlocks = (peerName, channelName) => {
    let blockDB = mongo.getDbs(peerName, DBName)

    return blockDB.find({
        channelName: channelName,
        peerName: peerName
    })
}
var getBlockHashByNum = (peerName, channelName, number) => {
    let blockDB = mongo.getDbs(peerName, DBName)
    return blockDB.findOne({
        channelName: channelName,
        number: number
    }).then((block) => {
        if (block) {
            return block.hash
        } else {
            return null
        }
    })
}

module.exports = {
    getBlockByNumber: getBlockByNumber,
    removeBlock: removeBlock,
    getAllBlocks: getAllBlocks,
    getBlockHashByNum: getBlockHashByNum,
    updateBlock: updateBlock,
    getBlocks: getBlocks
}