var mongo = require('../mongo')
var DBName = 'outerSignRequestDB'
var log4js = require('log4js');
var logger = log4js.getLogger('DB/mongo/outerSignRequest');

module.exports.create = (requestObj) => {
    let outerSignRequestDB = mongo.getDbs('gateway', DBName)
    return outerSignRequestDB.create(requestObj).then((res) => {
        return res
    })

}

module.exports.update = (requestObj) => {
    let outerSignRequestDB = mongo.getDbs('gateway', DBName)
    return outerSignRequestDB.update({
        uuid: requestObj.uuid,
        type: requestObj.type
    }, requestObj).then((res) => {
        return res
    })

}

module.exports.get = (condition, sortCondition) => {

    let outerSignRequestDB = mongo.getDbs('gateway', DBName)
    return outerSignRequestDB.find(condition, null, sortCondition).then((res) => {
        return res
    })
}