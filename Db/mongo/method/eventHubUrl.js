var mongo = require('../mongo')
var DBName = 'eventHubUrlDB'
var log4js = require('log4js');
var logger = log4js.getLogger('DB/mongo/eventHubUrl');

var createEventUrl = (peerName, evetUrl) => {

    let eventHubUrlDB = mongo.getDbs(peerName, DBName)
    return eventHubUrlDB.create(evetUrl).then((res) => {
        return res
    })
}
var removeBlockEventUrl = (peerName, url) => {
    let eventHubUrlDB = mongo.getDbs(peerName, DBName)

    return eventHubUrlDB.remove({
        type: 'blockEvent',
        url: url
    }).then((res) => {
        return res
    })
}

var removeCcEventUrl = (peerName, chaincodeName, eventName, url) => {
    let eventHubUrlDB = mongo.getDbs(peerName, DBName)
    return eventHubUrlDB.remove({
        type: "ccEvent",
        url: url,
        chaincodeName: chaincodeName,
        eventName: eventName
    })
}

var getAllEvents = (peerName) => {
    let eventHubUrlDB = mongo.getDbs(peerName, DBName)
    return eventHubUrlDB.find({})
}

module.exports = {
    createEventUrl: createEventUrl,
    removeBlockEventUrl: removeBlockEventUrl,
    removeCcEventUrl: removeCcEventUrl,
    getAllEvents: getAllEvents
}