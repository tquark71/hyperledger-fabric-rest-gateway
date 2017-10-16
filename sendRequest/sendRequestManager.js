var DBs = require('../Db')
var SendRequest = require('./sendRequest')
var sendHistoryMethod = DBs.sendHistoryMethod;


var getUnfinishedSendRequest = () => {
    return sendHistoryMethod.get("this.maxTryTimes>this.status.retryTimes&&this.status.success==false")
}
var sendUnfininshedRequests = () => {
    return getUnfinishedSendRequest.then((res) => {
        res.forEach((request) => {
            let sendRequest = new SendRequest(request)
            sendRequest.sendAndRetry()
        })
    })
}
var forceSendUnfinishedRequest = (id) => {

    return sendHistoryMethod.get({
        _id: id
    }).then((res) => {
        if (res.length > 0) {
            let sendRequest = new SendRequest(res[0])
            sendRequest.sendAndRetry()
        }
    })
}

module.exports = {
    getUnfinishedSendRequest: getUnfinishedSendRequest,
    sendUnfininshedRequests: sendUnfininshedRequests,
    forceSendUnfinishedRequest: forceSendUnfinishedRequest
}