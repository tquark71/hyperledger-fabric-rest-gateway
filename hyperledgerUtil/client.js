var hfc = require('fabric-client');
var path = require('path')
var log4js = require('log4js');
var logger = log4js.getLogger('client');

// require('./channelNorman') require('./clientNorman') hfc.setLogger(logger);
var config = require('../config')
logger.setLevel(config.logLevel);
var keyValueStore = config.keyValueStore
let client = new hfc();
let cryptoSuite = hfc.newCryptoSuite();
cryptoSuite.setCryptoKeyStore(hfc.newCryptoKeyStore({
    path: path.join(keyValueStore, config.orgName, "crypto")
}));
client.setCryptoSuite(cryptoSuite);

hfc.newDefaultKeyValueStore({
    path: path.join(keyValueStore, config.orgName, "keyValue")
}).then((store) => {
    client.setStateStore(store);
})
hfc.setConfigSetting('request-timeout', 150000)
if (config.mode == "dev") {
    client.setDevMode(true)
}
module.exports = client