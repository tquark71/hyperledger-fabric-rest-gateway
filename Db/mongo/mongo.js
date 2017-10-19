var mongoose = require('mongoose');
var config = require('../../config');
var myOrgName = config.fabric.orgName;
var ORGS = require('../../network-config')['network-config']
var log4js = require('log4js');
var logger = log4js.getLogger('mongo');
var port = config.gateway.storage.mongo.port;
var ip = config.gateway.storage.mongo.ip;
var options = {
    promiseLibrary: require('bluebird'),
    server: {
        auto_reconnect: true
    }
};
var basicSchema = require('./schemas/schema');
var schema = require('./schemas/monitorSchema');
var gatewaySchema = require('./schemas/gatewaySchema');
var DBs = {}
for (let peer in ORGS[myOrgName]) {
    if (peer.indexOf('peer') > -1) {
        var uPS = ""
        if (config.gateway.storage.mongo.username && config.gateway.storage.mongo.username != "" && config.gateway.storage.mongo.password && config.gateway.storage.mongo.password != "") {
            uPS = config.gateway.storage.mongo.username + ':'
            config.gateway.storage.mongo.password + '@'
        }
        logger.info('connect db at ' + 'mongodb://' + uPS + ip + ':' + port + '/' + myOrgName + '-' + peer)
        let connect = mongoose.createConnection('mongodb://' + ip + ':' + port + '/' + myOrgName + '-' + peer, options, () => {
            logger.info('peer db connect')
        })
        connect.on('reconnected', () => {
            logger.info(myOrgName + " " + peer + " reconnected");
        })
        DBs[peer] = {
        }

        for (let dbSchema in basicSchema) {
            let dbName = dbSchema.replace('Schema', '') + "DB"
            DBs[peer][dbName] = connect.model(dbName, basicSchema[dbSchema])
        }
        for (let dbSchema in schema) {
            let dbName = dbSchema.replace('Schema', '') + "DB"
            DBs[peer][dbName] = connect.model(dbName, schema[dbSchema])
        }

    }
}
function connectGatewayModel() {
    let connect = mongoose.createConnection('mongodb://' + ip + ':' + port + '/' + myOrgName + '-' + 'gateway', options, () => {
        logger.warn('gateway db connect')
    })
    connect.on('reconnected', () => {
        logger.warn("gateway db reconnected");
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