var client = require('./client')
var channels = require('./channels')
var util = require('util')
var helper = require('./helper')
var peers = require('./peers')
var user = require('./user')
var hfc = require('fabric-client');
var EventHub = require('fabric-client/lib/EventHub.js');
var config = require('../config');
var myOrgIndex = config.fabric.orgIndex
var log4js = require('log4js');
var tcpp = require('tcp-ping')
var logger = log4js.getLogger('util/eventHub');
logger.setLevel(config.gateway.logLevel);
var fs = require('fs')
var path = require('path')
var networkConfig = require('./networkConfig')
var ORGS = networkConfig.getNetworkConfig();
var channelConfig = networkConfig.getChannelConfig();
var request = require('request')
var gatewayEventHub = require('../gatewayEventHub');

var eventHubUrlDbMethod = require('../Db').eventHubUrlMethod;
var peersEventHub = {}
var eventHistoryMethod = require('../Db').eventHubHistoryMethod;
var eventReturnMap = {}
gatewayEventHub.on('admin-changed', () => {
    for (let peerName in peersEventHub) {
        copyCallBackSet(peerName);
        peersEventHub[peerName].eh.disconnect();
        resetCallbackSet(peerName);
        client.setUserContext(user.getOrgAdmin());
        peersEventHub[peerName].eh.connect()
    }
})
gatewayEventHub.on('n-peer-revise', (reviseInfo) => {
    let {orgIndex, peerName, attribute} = reviseInfo;
    if (orgIndex == myOrgIndex && attribute == 'events') {
        logger.debug('try recnnect to events hub cause events attribute has been changed')
        if (peersEventHub[peerName]) {
            copyCallBackSet(peerName);
            peersEventHub[peerName].eh.disconnect();
            resetCallbackSet(peerName);
            client.setUserContext(user.getOrgAdmin());
            let opt = helper.getOpt(myOrgIndex, peerName)
            peersEventHub[peerName].eh.setPeerAddr(helper.transferSSLConfig(ORGS[myOrgIndex][peerName]['events']), opt)
            peersEventHub[peerName].eh.connect()
        }
    }
})
gatewayEventHub.on('n-remove-peer', (orgIndex, peerName) => {
    logger.debug('receive n-remove-peer to delete event hub connect')
    if (orgIndex == myOrgIndex) {
        if (peersEventHub[peerName]) {
            let eh = peersEventHub[peerName].eh;
            eh.disconnect();
            delete peersEventHub[peerName];
        }
    }
})
var checkPeerNameExist = (peerName, orgIndex) => {
    if (ORGS[orgIndex].hasOwnProperty(peerName)) {
        return true
    } else {
        return false
    }
}
function getOrgEventHubs(userContext, channelName, orgIndex) {
    orgIndex = orgIndex || myOrgIndex
    logger.debug('start to get event hubs getOrgEventHubs')
    var ehs = []
    var orgPeerInChannel = true
    if (channelName) {
        orgPeerInChannel = false
        if (channelConfig[channelName].peers.hasOwnProperty(orgIndex)) {
            orgPeerInChannel = true
        }
    }
    if (orgPeerInChannel) {
        for (let peer in ORGS[orgIndex]) {
            if (peer.indexOf('peer') > -1) {
                logger.debug(`join ${peer} eh in to event hub`)
                client._userContext = userContext;
                ehs.push(getOrNewEventHubObjFromMap(peer, userContext))
            }
        }
    }
    logger.debug('getOrgEventHubs finish')
    logger.debug(ehs)
    return ehs
}
function getEventHubByIp(ip, userContext) {
    logger.debug('start to get %s evenhub', ip)
    for (let peer in ORGS[myOrgIndex]) {
        if (peer.indexOf('peer') > -1) {
            if (ORGS[myOrgIndex][peer].events.indexOf(ip) > -1) {
                client.setUserContext(userContext, true);
                let eh = client.newEventHub();
                let opt = helper.getOpt(myOrgIndex, peer)
                eh.setPeerAddr(helper.transferSSLConfig(ORGS[myOrgIndex][peer]['events']), opt)
                eh.connect();
                return eh
            }
        }
    }
    throw new Error('can not get event hub from ' + ip)
}
var closeEhs = function(ehs) {

    logger.debug('start to close event hubs');
    for (var key in ehs) {
        var eventhub = ehs[key];
        if (eventhub && eventhub.isconnected()) {
            eventhub.disconnect();
        }
    }
};
function getEventHubByChannel(channelName, userContext) {
    logger.debug('start to get event hub by channel');
    var ehs = [];
    for (let peerIndex in channelConfig[channelName].peers[myOrgIndex]) {
        let peerName = channelConfig[channelName].peers[myOrgIndex][peerIndex].name

        ehs.push(getEventHubByName(peerName, userContext))
    }
    return ehs
}
function getEventHubByName(peerName, userContext) {
    if (checkPeerNameExist(peerName, myOrgIndex)) {
        logger.debug('start to get %s evenhub', peerName)
        client.setUserContext(userContext, true);
        let eh = client.newEventHub();
        let opt = helper.getOpt(myOrgIndex, peerName)
        logger.debug('event hub url is ' + ORGS[myOrgIndex][peerName]['events'])
        eh.setPeerAddr(helper.transferSSLConfig(ORGS[myOrgIndex][peerName]['events']), opt)
        eh.connect();
        logger.debug('finish get eventhub')
        return eh
    }
    throw new Error('can not get event hub from ' + peerName)
}
var unregisterEventToUrl = (type, peerName, url, opt) => {
    var response
    var eh = getOrNewEventHubObjFromMap(peerName)
    var labelArr = [peerName, type]
    if (!peersEventHub[peerName]) {
        throw new Error('can find peer ' + peerName + '\'s event hub')
    }
    if (!eventReturnMap[peerName]) {
        throw new Error('can find peer ' + peerName + '\'s event hub')
    }
    if (!eventReturnMap[peerName][type]) {
        throw new Error('can find peer ' + type + '\'s event ')
    }
    if (type == 'blockEvent') {
        if (!eventReturnMap[peerName][type][url]) {
            throw new Error('can find peer ' + type + ' ' + ' ' + url + ' \'s event ')
        }
        response = util.format('unregisterCcEvent successfully peerName: %s, type: %s to url:%s', peerName, type, url)
        eh.unregisterBlockEvent(eventReturnMap[peerName][type][url])
        delete eventReturnMap[peerName][type][url]
    } else if (type == 'ccEvent') {
        labelArr.push(opt.chaincodeName)
        labelArr.push(opt.eventName)
        if (!eventReturnMap[peerName][type][opt.chaincodeName][opt.eventName][url]) {
            throw new Error(util.format('can not find peerName %s, type %s, chaincodeName %s, eventName %s to url %s event', peerName, type, opt.chaincodeName, opt.eventName, url))
        }
        eh.unregisterChaincodeEvent(eventReturnMap[peerName][type][opt.chaincodeName][opt.eventName][url])
        response = util.format('unregisterCcEvent successfully peerName: %s, type: %s chaincodeName: %s, eventName: %s to url:%s', peerName, type, opt.chaincodeName, opt.eventName, url)
        delete eventReturnMap[peerName][type][opt.chaincodeName][opt.eventName][url]
    }
    deleteEventUrlDb(labelArr, url);

    logger.debug(response);
    return response;
}
let thresholdCallbackCollection = {};
/*{
    uuid
    cb
    threshold
    triggerList
}
*/
var thresholdCallbackWrapper = (type, uuid) => {

    return (eventResult) => {
        let triggerIndex
        if (type == 'ccEvent') {
            triggerIndex = eventResult.tx_id;
        } else if (type == 'blockEvent') {
            triggerIndex = eventResult.header.number;
        }
        let thresholdSet = thresholdCallbackCollection[uuid];

        let triggerList = thresholdSet.triggerList;
        if (!triggerList[triggerIndex]) {
            triggerList[triggerIndex] = {
                threshold: thresholdSet.threshold - 1
            }
        } else {
            triggerList[triggerIndex].threshold--;
        }
        if (triggerList[triggerIndex].threshold == 0) {
            thresholdSet.cb(eventResult);
        }

    }
}

var registerEventWithThreshold = (type, threshold, peerNameArr, userContext, cb, opt) => {
    let uuid = require('uuid/v4')();
    thresholdCallbackCollection[uuid] = {
        type: type,
        cb,
        triggerList: {},
        threshold: threshold,
        cbSlot: []

    }
    let thresholdCb = thresholdCallbackWrapper(type, uuid)
    peerNameArr.forEach((peerName) => {
        let returnObj = registerEvent(type, peerName, userContext, thresholdCb, opt);
        thresholdCallbackCollection[uuid].cbSlot.push({
            name: peerName,
            returnObj: returnObj
        })
    })
    return uuid;

}
var unRegisterEventWithThreshold = (uuid) => {
    collection = thresholdCallbackCollection[uuid];
    if (!collection) {
        throw new Error(`${uuid} of threshold event listener did not exist`);
    }
    let cbSlot = collection.cbSlot;
    let type = collection.type
    cbSlot.forEach((cbSet) => {
        let peerName = cbSet.name;
        let returnObj = cbSet.returnObj
        unRegisterEvent(type, peerName, returnObj);
    })

}
var unRegisterEvent = (type, peerName, returnObj) => {
    if (!peersEventHub[peerName]) {
        throw `peer ${peerName} event hub did not exist, may have been canceled first`
    }
    var eh = peersEventHub[peerName].eh
    if (!eh) {
        throw new Error(`${peerName}'s event hub didnot existed`);
    }
    if (type == 'ccEvent') {
        eh.unregisterChaincodeEvent(returnObj);
    } else if (type == 'blockEvent') {
        eh.unregisterBlockEvent(returnObj);
    }
}
var registerEvent = (type, peerName, userContext, cb, opt) => {

    var eh = getOrNewEventHubObjFromMap(peerName, userContext)

    if (type == "ccEvnet") {
        let chaincodeName = opt.chaincodeName
        let eventName = opt.eventName
        return eh.registerChaincodeEvent(chaincodeName, eventName, cb, (err) => {
            logger.warn('event hub err ' + err)
        })
    } else if (type == "blockEvent") {
        return eh.registerBlockEvent(cb)
    }
}
var copyCallBackSet = (peerName) => {
    peersEventHub[peerName].callbackSet._chaincodeRegistrants = peersEventHub[peerName].eh._chaincodeRegistrants
    peersEventHub[peerName].callbackSet._blockOnEvents = peersEventHub[peerName].eh._blockOnEvents
    peersEventHub[peerName].callbackSet._blockOnErrors = peersEventHub[peerName].eh._blockOnErrors
    peersEventHub[peerName].callbackSet._block_registrant_count = peersEventHub[peerName].eh._block_registrant_count;
    peersEventHub[peerName].callbackSet._transactionOnEvents = peersEventHub[peerName].eh._transactionOnEvents
    peersEventHub[peerName].callbackSet._transactionOnErrors = peersEventHub[peerName].eh._transactionOnErrors
}
var resetCallbackSet = (peerName) => {
    peersEventHub[peerName].eh._chaincodeRegistrants = peersEventHub[peerName].callbackSet._chaincodeRegistrants;
    peersEventHub[peerName].eh._blockOnEvents = peersEventHub[peerName].callbackSet._blockOnEvents;
    peersEventHub[peerName].eh._blockOnErrors = peersEventHub[peerName].callbackSet._blockOnErrors;
    peersEventHub[peerName].eh._transactionOnEvents = peersEventHub[peerName].callbackSet._transactionOnEvents;
    peersEventHub[peerName].eh._transactionOnErrors = peersEventHub[peerName].callbackSet._transactionOnErrors;
    peersEventHub[peerName].eh._block_registrant_count = peersEventHub[peerName].callbackSet._block_registrant_count;
}
var getOrNewEventHubObjFromMap = (peerName, userContext) => {
    var eh
    if (peersEventHub[peerName]) {
        eh = peersEventHub[peerName].eh;
    } else {
        eh = getEventHubByName(peerName, userContext)
        peersEventHub[peerName] = {}
        peersEventHub[peerName].eh = eh;
        peersEventHub[peerName].callbackSet = {}
        peersEventHub[peerName].alive = true;
        eh.registerBlockEvent((block) => {
        }, (err) => {
            logger.warn('Peer %s event hub disconnected, clone the callbck set', peerName)
            copyCallBackSet(peerName);
        })
    }
    return eh
}

var reconnectHandler = () => {

    setInterval(() => {
        for (let peerName in peersEventHub) {
            let status = peers.getPeerAliveState(peerName)
            // logger.debug("peer %s alive state : %s", peerName, status)
            if (status && !peersEventHub[peerName].alive) {
                logger.warn('reconnect triggered ')
                resetCallbackSet(peerName)
                setTimeout(() => {
                    client.setUserContext(user.getOrgAdmin(), true)
                    peersEventHub[peerName].eh.connect()
                }, 2000)

            } else if (status) {
                peersEventHub[peerName].eh._checkConnection(false, true);
            }
            peersEventHub[peerName].alive = status
        }
    }, 1000)

}
var resendHandler = () => {
    setInterval(() => {
        for (let peerName in peersEventHub) {
            eventHistoryMethod.getFailedEventHistorys(peerName, config.fabric.eventHub.retryTimes).then((failedHistorys) => {
                failedHistorys.forEach((failedHistory) => {
                    logger.debug(failedHistory)
                    sendPayloadToUrl(peerName, failedHistory.payload, failedHistory.url, failedHistory)
                })
            })
        }
    }, 5000)
}

var registerEventToUrl = (type, peerName, url, userContext, saveToDb, opt) => {
    var labelArr = [peerName, type]
    var returnObjSlot
    var returnObj
    var response
    var eh = getOrNewEventHubObjFromMap(peerName, userContext)
    if (type == "ccEvent") {
        let chaincodeName = opt.chaincodeName
        let eventName = opt.eventName
        labelArr.push(chaincodeName)
        labelArr.push(eventName)
        returnObjSlot = getEventReturnMap(labelArr, url)
        returnObj = eh.registerChaincodeEvent(chaincodeName, eventName, (payload) => {
            payloadobj = JSON.parse(JSON.stringify(payload))
            logger.debug('receive event cc' + JSON.stringify(payloadobj))
            logger.debug('data is ')
            logger.debug(new Buffer.from(payloadobj.payload.data).toString())
            let eventHistoryInfo = {
                peerName: peerName,
                eventType: type,
                url: url,
                payload: payloadobj,
                status: {
                    retryTimes: 0,
                    success: false,
                    reason: ""
                }
            }
            eventHistoryMethod.creatEventHistory(peerName, eventHistoryInfo).then((res) => {
                logger.debug('history create sucessfully')
                sendPayloadToUrl(peerName, payloadobj, url, res)


            })
        })
        response = util.format('registerEvent successfully peerName: %s, chaincodeName: %s eventName: %s to url: %s', peerName, chaincodeName, eventName, url)


    } else if (type == "blockEvent") {
        console.log('blockEvent')
        returnObjSlot = getEventReturnMap(labelArr, url)
        returnObj = eh.registerBlockEvent((payload) => {
            payloadobj = JSON.parse(JSON.stringify(payload))
            logger.debug('receive block event' + payloadobj)
            let eventHistoryInfo = {
                peerName: peerName,
                eventType: type,
                url: url,
                payload: payloadobj,
                status: {
                    retryTimes: 0,
                    success: false,
                    reason: ""
                }
            }
            eventHistoryMethod.creatEventHistory(peerName, eventHistoryInfo).then((res) => {
                sendPayloadToUrl(peerName, payloadobj, url, res)
            })

        })
        response = util.format('register BlockEvent successfully peerName: %s,  to url: %s', peerName, url)
    }
    returnObjSlot[url] = returnObj

    if (saveToDb) {
        setEventUrlDb(labelArr, url)
    }

    return response
}
var sendPayloadToUrl = (peerName, payload, url, eventHistoryInfo) => {
    request.post({
        url: url,
        body: payload,
        json: true
    }, (err, resp, body) => {
        if (err) {
            logger.error(err)
            eventHistoryInfo.status.retryTimes++;
            eventHistoryInfo.status.reason = err.toString()
            eventHistoryMethod.updateEventHistory(peerName, eventHistoryInfo)
        } else {
            eventHistoryInfo.status.retryTimes++;
            eventHistoryInfo.status.success = true
            eventHistoryMethod.updateEventHistory(peerName, eventHistoryInfo)
            logger.debug('event publish to ' + url + ' success')
        }
    })
}
var getEventReturnMap = (labelArr, finalLabel) => {
    let finalObj = labelArr.reduce((cumObj, nowLabel) => {
        if (!cumObj[nowLabel]) {
            cumObj[nowLabel] = {}
        }
        return cumObj[nowLabel]
    }, eventReturnMap)
    if (finalObj[finalLabel]) {
        throw new Error("The event has been registered")
    } else {
        finalObj[finalLabel] = null
        return finalObj
    }

}
var setEventUrlDb = (labelArr, url) => {
    var eventUrlInfo = {
        type: labelArr[1],
        url: url
    }
    if (labelArr[1] == 'ccEvent') {
        eventUrlInfo.chaincodeName = labelArr[2];
        eventUrlInfo.eventName = labelArr[3];
    }
    eventHubUrlDbMethod.createEventUrl(labelArr[0], eventUrlInfo).then((res) => {
        logger.info('set Url Db finish:' + labelArr)
        logger.debug(res)
    })
// let eventUrlList = getEventUrlDb()
// let finalObj = labelArr.reduce((preObj, curLabel, index) => {
//     if (index == labelArr.length - 1) {
//         if (!preObj[curLabel]) {
//             preObj[curLabel] = []
//         }
//     } else if (!preObj[curLabel]) {
//         preObj[curLabel] = {}
//     }
//     return preObj[curLabel]
// }, eventUrlList)
// finalObj.push(url)
// saveEventUrlDb(eventUrlList)
}
var deleteEventUrlDb = (labelArr, url) => {

    if (labelArr[1] == 'ccEvent') {
        eventHubUrlDbMethod.removeCcEventUrl(labelArr[0], labelArr[2], labelArr[3], url).then((res) => {
            logger.debug('delete Url Db finish:' + labelArr)
            logger.debug(res)
        })
    } else if (labelArr[1] == 'blockEvent') {
        eventHubUrlDbMethod.removeBlockEventUrl(labelArr[0], url).then((res) => {
            logger.debug('delete Url Db finish:' + labelArr)
            logger.debug(res)
        })
    }
    // var eventUrlList = getEventUrlDb()

    // var finalObj = labelArr.reduce((preObj, curLabel) => {
    //     return preObj[curLabel]
    // }, eventUrlList)
    // finalObj.forEach((innerUrl, index) => {
    //     if (innerUrl == url) {
    //         var afterArr = finalObj.splice(index + 1)

    //         var popElement = finalObj.splice(index)
    //         afterArr.forEach((afterElement) => {
    //             finalObj.push(afterElement)
    //         })


    //     }
    // })

// saveEventUrlDb(eventUrlList)
}
var eventUrlDbPath = path.join(__dirname, '../Db/EventUrl.json')
// var getEventUrlDb = () => {
//     var eventList = fs.readFileSync(eventUrlDbPath)
//     eventList = JSON.parse(eventList)
//     return eventList
// }
// var saveEventUrlDb = (eventList) => {
//     fs.writeFileSync(eventUrlDbPath, JSON.stringify(eventList))
// }
var resumeEventHubFromEventDbForUrl = (userContext) => {
    var peerNameList = peers.getPeerNameList();
    peerNameList.forEach((peerName) => {
        client.setUserContext(userContext, true)
        eventHubUrlDbMethod.getAllEvents(peerName).then((eventUrls) => {
            eventUrls.forEach((eventUrl) => {
                if (eventUrl.type == 'ccEvent') {
                    registerEventToUrl('ccEvent', peerName, eventUrl.url, userContext, false, {
                        chaincodeName: eventUrl.chaincodeName,
                        eventName: eventUrl.eventName
                    })
                } else if (eventUrl.type == 'blockEvent') {
                    registerEventToUrl('blockEvent', peerName, eventUrl.url, userContext, false)
                }
            })
        })
    })
    // let eventList = getEventUrlDb()
    // for (let peerName in eventList) {
    //     for (let type in eventList[peerName]) {
    //         if (type == "ccEvent") {
    //             for (let ccID in eventList[peerName][type]) {
    //                 for (let eventName in eventList[peerName][type][ccID]) {
    //                     for (let index in eventList[peerName][type][ccID][eventName]) {
    //                         registerEventToUrl(type, peerName, eventList[peerName][type][ccID][eventName][index], userContext, false, {
    //                             chaincodeName: ccID,
    //                             eventName: eventName
    //                         })
    //                     }
    //                 }
    //             }
    //         }
    //         if (type == "blockEvent") {
    //             for (let index in eventList[peerName][type]) {
    //                 registerEventToUrl(type, peerName, eventList[peerName][type][index], userContext, false)
    //             }

//         }
//     }
// }
}


// can switch to the real Db in the future


reconnectHandler()
// resendHandler()

var returnAllEventHistory = (peerName) => {
    return eventHistoryMethod.getEventHistorys(peerName, {})
}
var returnFailedEventHistory = (peerName) => {
    return eventHistoryMethod.getFailedEventHistorys(peerName)
}





module.exports = {
    resumeEventHubFromEventDbForUrl: resumeEventHubFromEventDbForUrl,
    registerEventToUrl: registerEventToUrl,
    unregisterEventToUrl: unregisterEventToUrl,
    registerEvent: registerEvent,
    returnAllEventHistory: returnAllEventHistory,
    returnFailedEventHistory: returnFailedEventHistory,
    registerEventWithThreshold: registerEventWithThreshold,
    unRegisterEventWithThreshold: unRegisterEventWithThreshold,
    getOrgEventHubs: getOrgEventHubs,
    getEventHubByIp: getEventHubByIp,
    closeEhs: closeEhs,
    getEventHubByChannel: getEventHubByChannel,
    getEventHubByName: getEventHubByName

}