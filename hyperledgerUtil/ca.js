var hfc = require('fabric-client');
var path = require('path')
var ORGS = hfc.getConfigSetting('network-config');
var copService = require('fabric-ca-client');
var config = require('../config')
var log4js = require('log4js');
var helper = require('./helper')
var logger = log4js.getLogger('caClient');
logger.setLevel(config.logLevel);
hfc.setLogger(logger);

var orgName = config.orgName
var client = require('./client')
var caUrl = ORGS[orgName].ca
var tlsOptions = config.ca.tlsOptions


var caClient = new copService(helper.transferSSLConfig(caUrl), tlsOptions,
    /*defautl TLS opts*/
    '',
    /* default CA */
    client.getCryptoSuite());

module.exports = caClient