var mongo = require('../mongo')
var DBName = 'sendHistoryDB'
var log4js = require('log4js');
var logger = log4js.getLogger('DB/mongo/sendHistory');

module.exports.update = (condition, obj) => {
    let sendHistoryDB = mongo.getDbs('gateway', DBName);
    return sendHistoryDB.update(condition, obj).then((res) => {
        return res
    })

}

module.exports.create = (sendRequest) => {
    let sendHistoryDB = mongo.getDbs('gateway', DBName);
    return sendHistoryDB.create(sendRequest).then((res) => {
        return res
    })

}

module.exports.remove = (condition) => {
    let sendHistoryDB = mongo.getDbs('gateway', DBName);
    return sendHistoryDB.remove(condition).then((res) => {
        return res
    })
}

module.exports.get = (condition) => {
    let sendHistoryDB = mongo.getDbs('gateway', DBName);
    return sendHistoryDB.find(condition).then((res) => {
        return res
    })
}