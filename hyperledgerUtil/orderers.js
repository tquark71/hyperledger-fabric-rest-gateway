var log4js = require('log4js');
var logger = log4js.getLogger('peers');
var client = require('./client')
var hfc = require('fabric-client');
var config = require('../config');
var channelConfig = hfc.getConfigSetting('channelConfig');
var networkConfig = require('./networkConfig')
var EndPoint = require('fabric-client/lib/Remote').Endpoint
var grpc = require('grpc');
var _serviceProto = grpc.load(__dirname + '/protos/peer/peer.proto').protos;
var ORGS = networkConfig.getNetworkConfig()
var channelConfig = networkConfig.getChannelConfig()
var helper = require('./helper')
var myOrgName = config.fabric.orgName
var ordererCahe = {}
var gatewayEventHub = require('../gatewayEventHub');

module.exports.getOrderByName = (ordererName) => {
    let orderer
    if (!ORGS[ordererName]) {
        throw new Error('can not find order in network-config');
    }
    if (ordererCahe[ordererName]) {
        orderer = ordererCahe[ordererName]
    } else {
        let opt = helper.getOpt('orderOrg', ordererName);
        orderer = client.newOrderer(helper.transferSSLConfig(ORGS[ordererName].url), opt);
        orderer._name = ['orderOrg', ordererName];
        ordererCahe[ordererName] = orderer;
    }
    return orderer
}
gatewayEventHub.on('n-orderer-revise', (ordereName, attribute) => {
    switch (attribute) {
        case 'url': {
            let orderer = getOrderByName(ordereName);
            helper.renewRemote(orderer);
        }
        case 'server-hostname': {
            let orderer = getOrderByName(ordereName);
            helper.renewRemote(orderer);
        }
        case 'tls_cacerts': {
            let orderer = getOrderByName(ordereName);
            helper.renewRemote(orderer);
        }
    }

})