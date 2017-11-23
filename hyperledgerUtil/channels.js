var hfc = require('fabric-client');
var Channel = require('fabric-client/lib/Channel');
var client = require('./client')
var config = require('../config')
var fs = require('fs')
var user = require('./user')
var path = require('path')
var orgName = config.fabric.orgName
var networkConfig = require('./networkConfig')
var ORGS = networkConfig.getNetworkConfig('network-config');
var helper = require('./helper')
var peers = require('./peers');
var orderers = require('./orderers');
var channelConfig = networkConfig.getChannelConfig();
var log4js = require('log4js');
var logger = log4js.getLogger('channel');
var gatewayEventHub = require('../gatewayEventHub');
logger.setLevel(config.gateway.logLevel);
gatewayEventHub.on('c-channel-orderer-add', (channelName, ordererName) => {
    logger.debug('receive c-channel-orderer-add, start to add orderer');
    let channel = getChannel(channelName);
    let ordererArr = channel._orderers;
    let ordererInfo = ORGS[ordererName];
    let url = ORGS[ordererName].url;
    let opt = helper.getOpt('orderOrg', ordererName)
    let newOrderer = client.newOrderer(url, opt);
    channel.addOrderer(newOrderer);
    logger.debug('receive c-channel-orderer-add, add orderer fininsh');
})
gatewayEventHub.on('c-channel-orderer-remove', (channelName, ordererName) => {
    logger.debug('receive c-channel-orderer-remove, start to remove orderer');

    let channel = getChannel(channelName);
    let orderer = orderers.getOrderByName(ordererName);
    channel.removeOrderer(orderer);
    logger.debug('receive c-channel-orderer-remove, remove orderer fininsh');
})
var channels = {}
var initChannel = (channelName) => {
    try {
        delete client._channels[channelName]
    } catch (e) {}
    channels[channelName] = client.newChannel(channelName)
    addOrderers(channelName);
    let peerObjs = peers.getChannelTargetByPeerType(channelName, 'all', 'all')
    peerObjs.forEach(function(peer) {
        channels[channelName].addPeer(peer)
    });

}
var initChannels = () => {
    logger.debug("channelConfig :" + JSON.stringify(channelConfig))
    for (let channelName in channelConfig) {
        logger.info("start to init channel :" + channelName)
        initChannel(channelName);
    }
}
initChannels();

function addOrderers(channelName) {
    logger.debug('<===== addOrderers start ======>')
    var orderersNames = channelConfig[channelName].orderers
    for (let ordererNameIndex in orderersNames) {
        ordererName = orderersNames[ordererNameIndex]
        if (ORGS[ordererName] == undefined) {
            logger.error("can't find the orderer config:" + ordererName)
        } else {
            let orderer = orderers.getOrderByName(ordererName)
            channels[channelName].addOrderer(orderer)
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
channels.initChannel = initChannel
module.exports = channels