var mongo = require('../mongo')
var DBName = 'innerSignRequestDB'
var log4js = require('log4js');
var logger = log4js.getLogger('DB/mongo/innerSignRequest');


module.exports.create = (requestObj) => {
    logger.debug('create start')
    let innerRequestDB = mongo.getDbs('gateway', DBName)
    return innerRequestDB.create(requestObj).then((res) => {
        logger.debug('create finish')
        return res
    }).catch((err) => {
        logger.error(err)
    })

}
module.exports.update = (requestObj) => {
    let innerRequestDB = mongo.getDbs('gateway', DBName)
    return innerRequestDB.update({
        uuid: requestObj.uuid
    }, requestObj).then((res) => {
        return res
    })
}
module.exports.remove = (uuid) => {
    let innerRequestDB = mongo.getDbs('gateway', DBName)
    return innerRequestDB.remove({
        uuid: uuid
    }).then((res) => {
        return res
    })
}
module.exports.get = (condition, sortCondition) => {
    let innerRequestDB = mongo.getDbs('gateway', DBName)
    return innerRequestDB.find(condition, null, sortCondition).then((res) => {
        return res
    })
}
module.exports.getFullfilledInnerRequest = () => {

    let innerRequestDB = mongo.getDbs('gateway', DBName)
    return innerRequestDB.find({
        fullfilled: true
    }).then((res) => {
        return res
    })
}