var mongo = require('../mongo')
var DBName = 'eventHistoryDB'
var log4js = require('log4js');
var logger = log4js.getLogger('DB/mongo/eventHistory');
var updateEventHistory = (peerName, eventHistory) => {

    let eventHistoryDB = mongo.getDbs(peerName, DBName)
    return eventHistoryDB.update({
        _id: eventHistory._id,

    }, eventHistory).then((res) => {
        return res
    })
}

var creatEventHistory = (peerName, eventHistory) => {

    let eventHistoryDB = mongo.getDbs(peerName, DBName)
    return eventHistoryDB.create(eventHistory).then((res) => {
        return res
    })
}

var getEventHistorys = (peerName, condition) => {
    let eventHistoryDB = mongo.getDbs(peerName, DBName)

    return eventHistoryDB.find(condition).then((res) => {
        return res
    })
}
var getFailedEventHistorys = (peerName, times) => {
    let eventHistoryDB = mongo.getDbs(peerName, DBName)
    times = times || 99999999;
    return eventHistoryDB.find({
        "status.success": false,
        "status.retryTimes": {
            $lt: times
        }
    }).then((res) => {
        return res
    })
}

module.exports = {
    updateEventHistory: updateEventHistory,
    creatEventHistory: creatEventHistory,
    getEventHistorys: getEventHistorys,
    getFailedEventHistorys: getFailedEventHistorys
}