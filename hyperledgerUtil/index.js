var path = require('path')
var config = require('../config');
var hfc = require('fabric-client')
var networkConfig = require('./networkConfig');
var ORGS = networkConfig.getNetworkConfig();
var channelConfig = networkConfig.getChannelConfig();
var log4js = require('log4js');
var logger = log4js.getLogger('hyperledgerUtil');
logger.setLevel(config.gateway.logLevel);
var chaincodeTrigger = require('./chaincodeTrigger')
var user = require('./user')
var channelAPI = require('./channelAPI')
var blockdecoder = require('fabric-client/lib/BlockDecoder');
var client = require('./client')
var channels = require('./channels')
var configgen = require('./configgen')
var eventHub = require('./eventHub')
var helper = require('./helper')
var peers = require('./peers');
var requestPlugin = require('./requestPlugin');
var myOrgName = config.fabric.orgName;
var singRequestManager = require('./signRequest/signRequestManager')
var gatewayEventHub = require('../gatewayEventHub')
//var client = require('./client')
var channelInitEventUuid = {};
var init = () => {
    return client.clientInit().then(() => {
        return user.userInit()
    }).then(() => {
        logger.info(`hyperledger util user init finish`);

        let orgAdmin = user.getOrgAdmin();
        client.setUserContext(orgAdmin, true)
        eventHub.resumeEventHubFromEventDbForUrl(orgAdmin);
        logger.info(`hyperledger util initialize all channel start`);
        let promiseArr = [];


        for (let channelName in channelConfig) {
            promiseArr.push(channelInitAndListenConfig(channelName))
        }
        logger.debug('channel event uuid list');
        logger.debug(channelInitEventUuid);

        return Promise.all(promiseArr)

    })
}
var cancelListenConfig = (channelName) => {
    logger.debug(`cancel config listener of ${channelName}`);
    let uuid = channelInitEventUuid[channelName];
    logger.debug(`uuid ${uuid}`);
    eventHub.unRegisterEventWithThreshold(uuid);
}

var channelInitAndListenConfig = (channelName) => {
    if (!channelConfig[channelName].peers[myOrgName]) {
        return Promise.resolve()
    }
    let orgAdmin = user.getOrgAdmin();
    client.setUserContext(orgAdmin, true)
    let channel = channels.getChannel(channelName);
    let peerNameArr = [];

    channelConfig[channelName].peers[myOrgName].forEach((peerObj) => {
        peerNameArr.push(peerObj.name);
    })
    if (peerNameArr.length > 0) {
        let uuid = eventHub.registerEventWithThreshold('blockEvent', 1, peerNameArr, orgAdmin, (block) => {
            let actionBlock = helper.processBlockToReadAbleJson(block);
            actionBlock.forEach((txObj) => {
                if (txObj.type == 'config' && txObj.channelName == channelName) {
                    let orgAdmin = user.getOrgAdmin();
                    client.setUserContext(orgAdmin, true);
                    logger.debug('get config block, start to init channel')
                    channel.initialize();
                }
            })
        })
        channelInitEventUuid[channelName] = uuid;
        return channel.initialize().then((res) => {
            logger.info(`initialize channel ${channelName} finish`);
        }).catch((e) => {

        })
    }
    return Promise.resolve()

}
gatewayEventHub.on('c-channel-add', ({channelName}) => {
    logger.debug('receive c-channel-add event for ' + channelName)
    channels.initChannel(channelName);
    channelInitAndListenConfig(channelName);
})
gatewayEventHub.on('c-channel-revise', (channelName) => {
    logger.debug('c-channel-revise emited');
    logger.debug(`re init channel ${channelName}`)
    cancelListenConfig(channelName);
    channels.initChannel(channelName);
    logger.debug(`re register config listener for ${channelName}`)
    channelInitAndListenConfig(channelName);
})
module.exports = {
    chaincodeTrigger: chaincodeTrigger,
    channelAPI: channelAPI,
    user: user,
    channels: channels,
    client: client,
    configgen: configgen,
    eventHub: eventHub,
    helper: helper,
    requestPlugin: requestPlugin,
    singRequestManager: singRequestManager,
    init: init,
    peers: peers,
    networkConfig: networkConfig
}
