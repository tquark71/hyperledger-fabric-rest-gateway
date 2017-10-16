var request = require('request')
var DBs = require('../Db')
var log4js = require('log4js');
var logger = log4js.getLogger('sendRequest/SendRequest');
var sendHistoryMethod = DBs.sendHistoryMethod;
var contants = require('../constants');
var signRequestManger = require('../hyperledgerUtil/signRequest/signRequestManager');
logger.warn(signRequestManger)
var sendRequest = class {

    constructor({url, body, type, status, uuid, maxTryTimes, timeout}) {
        logger.debug('<========== sendRequest constructor ==========> ')
        this.url = url;
        this.body = body;
        this.type = type;
        this.status = status || {
            retryTimes: 0,
            success: false,
            resaon: ''
        }
        this.maxTryTimes = maxTryTimes || 5;
        this.timeout = timeout || 60000;
        this.uuid = uuid;
        if (!uuid) {
            let uuid = require('uuid/v4')()
            logger.debug('save send History')
            logger.debug(uuid)

            sendHistoryMethod.create({
                url,
                type,
                body,
                uuid,
                status: this.status,
                maxTryTimes: this.maxTryTimes,
                timeout: this.timeout
            }).then((sendHistoryInfo) => {
                logger.debug('save history finish')
                logger.debug(sendHistoryInfo)
                this.uuid = sendHistoryInfo.uuid;
            }).catch((err) => {
                logger.error(err)
            })
        }
    }
    sendAndRetry() {
        let self = this
        request.post({
            url: self.url,
            body: self.body,
            json: true
        }, (err, resp, body) => {
            if (err) {

                logger.error(err)
                self.status.retryTimes++;
                self.status.reason = err.toString()
                sendHistoryMethod.update({
                    uuid: self.uuid
                }, {
                    status: self.status
                });
                if (self.status.retryTimes < self.maxTryTimes) {
                    setTimeout(() => {
                        self.sendAndRetry()
                    }, self.timeout)
                }
            } else {
                self.status.retryTimes++;
                self.status.success = true
                sendHistoryMethod.update({
                    uuid: self.uuid
                }, {
                    status: self.status
                });

                logger.debug(`send Request to ${self.url} send success`);
                logger.debug(self.body);
                self.sendCallback()
            }
        })
    }
    sendCallback() {
        if (this.type == contants.CHANNEL_CONFIG_REQUEST) {
            signRequestManger.getInnerSignRequestObj(this.body.uuid).then((signRequest) => {
                return signRequest.changeIdentitesState(this.body.toMspID, this.body.toRole, 'REACH');
            })
        }
        if (this.type == contants.CHANNEL_CONFIG_RESPONSE) {
            signRequestManger.getOuterSignRequestObj(this.body.uuid).then((signRequest) => {
                return signRequest.changeRequestStatus('REACH');
            })
        }
    }
}

module.exports = sendRequest