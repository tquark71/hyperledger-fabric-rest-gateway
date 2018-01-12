var hfc = require('fabric-client');
var path = require('path')
var log4js = require('log4js');
var logger = log4js.getLogger('client');

var config = require('../config')
var couchImpClass = require('fabric-client/lib/impl/CouchDBKeyValueStore.js')
logger.setLevel(config.gateway.logLevel);
let client = new hfc();
var clientInit = () => {
    var promiseArr = []
    var pc = makeCryptoSuiteAndSetStore().then((cs) => {
        return client.setCryptoSuite(cs);
    })
    promiseArr.push(pc);
    var pk = makeKeyValStore().then((store) => {
        return client.setStateStore(store)
    })
    promiseArr.push(pk);
    return Promise.all(promiseArr)
}

var newCouchKeyValueStore = function(options) {
    // initialize the correct KeyValueStore
    return new Promise(function(resolve, reject) {
        var store = couchImpClass
        return resolve(new store(options));
    });
};
var makeCryptoSuiteAndSetStore = () => {
    return new Promise((rs, rj) => {
        let cryptoSuite = hfc.newCryptoSuite();
        if (config.fabric.keyValueStore.type == 'couch') {
            let store = hfc.newCryptoKeyStore(couchImpClass, {
                url: config.fabric.keyValueStore.couch.url,
                name: 'crypto-key'
            })

            cryptoSuite.setCryptoKeyStore(store);
            rs(cryptoSuite)

        } else {
            let store = hfc.newCryptoKeyStore({
                path: path.resolve(__dirname, '../', config.fabric.keyValueStore.fs.path, config.fabric.orgIndex, "crypto")
            })
            cryptoSuite.setCryptoKeyStore(store);
            rs(cryptoSuite)
        }
    })
}
var makeKeyValStore = () => {
    return new Promise((rs, rj) => {
        if (config.fabric.keyValueStore.type == 'couch') {
            newCouchKeyValueStore({
                url: config.fabric.keyValueStore.couch.url,
                name: 'key-value-store'
            }).then((store) => {
                rs(store)
            }).catch((e) => {
                logger.error(e)
                rj(e)
            })
        } else {
            logger.debug('use fs to be key value store')
            hfc.newDefaultKeyValueStore({
                path: path.resolve(__dirname, '../', config.fabric.keyValueStore.fs.path, config.fabric.orgIndex, "keyValue")
            }).then((store) => {
                rs(store)

            })

        }
    })
}



hfc.setConfigSetting('request-timeout', 150000)
if (config.fabric.mode == "dev") {
    client.setDevMode(true)
}
client.clientInit = clientInit
module.exports = client