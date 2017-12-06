var mongoose = require('mongoose');
mongoose.Promise = require('bluebird');
var config = require('../../config');
var myOrgName = config.fabric.orgName;
var hfc = require('fabric-client');
var networkConfig = require('../../hyperledgerUtil/networkConfig')
var ORGS = networkConfig.getNetworkConfig();
var log4js = require('log4js');
var logger = log4js.getLogger('mongo');
var port = config.gateway.storage.mongo.port;
var ip = config.gateway.storage.mongo.ip;
var options = {
    server: {
        auto_reconnect: true
    }
};
var basicSchema = require('./schemas/schema');
var schema = require('./schemas/monitorSchema');
var gatewaySchema = require('./schemas/gatewaySchema');
var gatewayEventHub = require('../../gatewayEventHub');
gatewayEventHub.on('n-add-peer', (peerName) => {
    connectAndLinkModelsForPeerDb(peerName);
})
var DBs = {}
var connectAndLinkModelsForPeerDb = (peerName) => {
    var uPS = ""
    if (config.gateway.storage.mongo.username && config.gateway.storage.mongo.username != "" && config.gateway.storage.mongo.password && config.gateway.storage.mongo.password != "") {
        uPS = config.gateway.storage.mongo.username + ':'
        config.gateway.storage.mongo.password + '@'
    }
    logger.info('connect db at ' + 'mongodb://' + uPS + ip + ':' + port + '/' + myOrgName + '-' + peerName)
    let connect = mongoose.createConnection('mongodb://' + ip + ':' + port + '/' + myOrgName + '-' + peerName, options, () => {
        logger.info('peer db connect')
    })
    connect.on('reconnected', () => {
        logger.info(myOrgName + " " + peerName + " reconnected");
    })
    DBs[peerName] = {
    }

    for (let dbSchema in basicSchema) {
        let dbName = dbSchema.replace('Schema', '') + "DB"
        DBs[peerName][dbName] = connect.model(dbName, basicSchema[dbSchema])
    }
    for (let dbSchema in schema) {
        let dbName = dbSchema.replace('Schema', '') + "DB"
        DBs[peerName][dbName] = connect.model(dbName, schema[dbSchema])
    }
}
for (let peer in ORGS[myOrgName]) {
    if (peer.indexOf('peer') > -1) {
        connectAndLinkModelsForPeerDb(peer)
    }
}
function connectGatewayModel() {
    let connect = mongoose.createConnection('mongodb://' + ip + ':' + port + '/' + myOrgName + '-' + 'gateway', options, () => {
        logger.info('gateway db connect')
    })
    connect.on('reconnected', () => {
        logger.info("gateway db reconnected");
    })
    DBs.gateway = {}
    for (let dbSchema in gatewaySchema) {
        let dbName = dbSchema.replace('Schema', '') + "DB"

        DBs['gateway'][dbName] = connect.model(dbName, gatewaySchema[dbSchema]);
    }
}
connectGatewayModel()
// logger.debug('provide DBS')
// logger.debug(DBs)
var getDbs = (peerName, dbName) => {
    return DBs[peerName][dbName]
}
module.exports = {
    getDbs: getDbs
}