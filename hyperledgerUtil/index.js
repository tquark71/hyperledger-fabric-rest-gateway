var path = require('path')
var config = require('../config');
var hfc = require('fabric-client')
hfc.addConfigFile(path.join(__dirname, '../network-config.json'));
var ORGS = hfc.getConfigSetting('network-config');
var channelConfig = hfc.getConfigSetting('channelConfig');
var log4js = require('log4js');
var logger = log4js.getLogger('hyperledgerUtil');
logger.setLevel(config.logLevel);
var chaincodeTrigger = require('./chaincodeTrigger')
var user = require('./user')
var channelAPI = require('./channelAPI')
var client = require('./client')
var channels = require('./channels')
var configgen = require('./configgen')
var eventHub = require('./eventHub')
var helper = require('./helper')
var requestPlugin = require('./requestPlugin');
var myOrgName = config.orgName;

//var client = require('./client')

var init = () => {
    return user.userInit().then(() => {
        logger.info(`hyperledger util user init finish`);

        let orgAdmin = user.getOrgAdmin();
        client.setUserContext(orgAdmin)
        eventHub.resumeEventHubFromEventDbForUrl(orgAdmin);
        logger.info(`hyperledger util initialize all channel start`);
        let promiseArr = [];

        logger.warn(`///////////////////////////////////////////////////////////////////////////////////////////////////////////////`)
        logger.warn(`///////////////////////Don not feel nervous if you see any err message in the section /////////////////////////`)
        logger.warn(`///////////////////////////////////////////////////////////////////////////////////////////////////////////////`)
        logger.warn(`///////////////////////////////////////////////////////////////////////////////////////////////////////////////`)

        for (let channelName in channelConfig) {
            let channel = channels.getChannel(channelName);
            // initialize all channel for channel Obj when start up the gateway, if channel have not created,
            // channel will initialize when the config block event has been triggered
            promiseArr.push(channel.initialize().then((res) => {
                logger.info(`initialize channel ${channelName} finish`);
            }))


            let peerNameArr = [];
            // get peerName from the channel config to register config block
            channelConfig[channelName].peers[myOrgName].forEach((peerObj) => {
                peerNameArr.push(peerObj.name);
            })
            eventHub.registerEventWithThreshold('blockEvent', 1, peerNameArr, orgAdmin, (block) => {
                let actionBlock = helper.processBlockToReadAbleJson(block);
                actionBlock.forEach((txObj) => {
                    if (txObj.type == 'config' && txObj.channelName == channelName) {
                        let orgAdmin = user.getOrgAdmin();
                        client.setUserContext(orgAdmin);
                        channel.initialize();
                    }
                })
            })
        }
        return Promise.all(promiseArr, (res) => {
            logger.warn(`///////////////////////////////////////////////////////////////////////////////////////////////////////////////`)
            logger.warn(`///////////////////////////////////////////////////////////////////////////////////////////////////////////////`)

        }).catch((err) => {
            logger.warn(`///////////////////////////////////////////////////////////////////////////////////////////////////////////////`)
            logger.warn(`///////////////////////////////////////////////////////////////////////////////////////////////////////////////`)


        })

    })
}
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
    init: init
}
