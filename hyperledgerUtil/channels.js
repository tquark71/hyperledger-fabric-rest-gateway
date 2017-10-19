var hfc = require('fabric-client');
var Channel = require('fabric-client/lib/Channel');
var client = require('./client')
var config = require('../config')
var fs = require('fs')
var user = require('./user')
var path = require('path')
var orgName = config.fabric.orgName
var ORGS = hfc.getConfigSetting('network-config');
var helper = require('./helper')
var channelConfig = hfc.getConfigSetting('channelConfig')
var log4js = require('log4js');
var logger = log4js.getLogger('channel');
logger.setLevel(config.gateway.logLevel);

var channels = {}
var initChannel = (channelName) => {
    addOrderers(channelName);
    peers = helper.getChannelTargetByPeerType(channelName, 'all', 'all')
    peers.forEach(function(peer) {
        channels[channelName].addPeer(peer)
    });

}
var initChannels = () => {
    logger.debug("channelConfig :" + JSON.stringify(channelConfig))
    for (let channelName in channelConfig) {
        logger.info("start to init channel :" + channelName)
        channels[channelName] = client.newChannel(channelName)
        initChannel(channelName);
    }
}
initChannels();

function addOrderers(channelName) {
    var orderersNames = channelConfig[channelName].orderers
    for (let ordererNameIndex in orderersNames) {
        ordererName = orderersNames[ordererNameIndex]
        if (ORGS[ordererName] == undefined) {
            logger.error("can't find the orderer config:" + ordererName)
        } else {
            let opt
            if (config.fabric.mode == 'prod') {
                var caRootsPath = ORGS[ordererName].tls_cacerts;
                let data = fs.readFileSync(path.join(__dirname, caRootsPath));
                let caroots = Buffer
                    .from(data)
                    .toString();
                opt = {
                    'pem': caroots,
                    'ssl-target-name-override': ORGS.orderer['server-hostname']
                }
            } else {
                opt = {}
            }

            channels[channelName].addOrderer(client.newOrderer(helper.transferSSLConfig(ORGS[ordererName].url), opt))
            logger.debug("channel:" + channelName + " add orederor: " + ORGS[ordererName].url)

        }
    }
}

var getChannel = (channelName) => {
    if (!channels[channelName]) {
        throw new Error("invailed channel name, plz check your network config has the config of channel " + channelName)
    } else {
        return channels[channelName]
    }
}

channels.getChannel = getChannel

module.exports = channels