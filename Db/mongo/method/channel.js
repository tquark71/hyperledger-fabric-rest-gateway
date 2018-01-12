var mongo = require('../mongo')
var DBName = 'channelDB'


var updateChannel = (peerName, channel) => {
    let channelDB = mongo.getDbs(peerName, DBName)
    return channelDB.update({
        channelName: channel.channelName,
    }, channel, {
        upsert: true
    }).then((res)=>{
        return res
    })
}
var removeChannel = (condition) => {
    let channelDB = mongo.getDbs(peerName, DBName)

    return channelDB.remove(condition)
}
var getChannel = (peerName, channelName) => {
    let channelDB = mongo.getDbs(peerName, DBName)

    return channelDB.findOne({
        channelName: channelName
    })
}
var getChannels = (condition) => {
    let channelDB = mongo.getDbs(peerName, DBName)
    return channelDB.find(condition)
}


module.exports = {
    removeChannel: removeChannel,
    updateChannel: updateChannel,
    getChannel: getChannel,
    getChannels: getChannels
}