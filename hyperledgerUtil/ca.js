var hfc = require('fabric-client');
var path = require('path')
var networkConfig = require('./networkConfig');
var ORGS = networkConfig.getNetworkConfig('network-config');
var copService = require('fabric-ca-client');
var config = require('../config')
var log4js = require('log4js');
var helper = require('./helper')
var logger = log4js.getLogger('caClient');
logger.setLevel(config.gateway.logLevel);

var myOrgName = config.fabric.orgName
var client = require('./client')
var caUrl = ORGS[myOrgName].ca
var tlsOptions = config.fabric.ca.tlsOptions
var gatewayEventHub = require('../gatewayEventHub');

var caClient = new copService(helper.transferSSLConfig(caUrl), tlsOptions,
    /*defautl TLS opts*/
    '',
    /* default CA */
    client.getCryptoSuite());

gatewayEventHub.on('n-org-revise', (reviseInfo) => {
    let {orgName, attribute} = reviseInfo;
    let newUrl = ORGS[myOrgName].ca
    if (attribute == 'ca' && orgName == myOrgName) {
        logger.debug('receive n-org-revise to change ca url')
        let tempCopServie = new copService(helper.transferSSLConfig(newUrl), tlsOptions,
            /*defautl TLS opts*/
            '',
            /* default CA */
            client.getCryptoSuite());
        delete caClient._fabricCAClient;
        caClient._fabricCAClient = tempCopServie._fabricCAClient;
        console.log(caClient.toString())
    }
})
module.exports = caClient