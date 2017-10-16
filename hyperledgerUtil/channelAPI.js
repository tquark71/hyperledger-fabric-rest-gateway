var client = require('./client')
var channels = require('./channels');
var Channel = require('fabric-client/lib/Channel');
var signRequestManager = require('./signRequest/signRequestManager');
var TransactionID = require('fabric-client/lib/TransactionID');
var fs = require('fs')
var util = require('util');
var path = require('path')
var hfc = require('fabric-client');
var user = require('./user')
var EventHub = require('fabric-client/lib/EventHub.js');
var config = require('../config.json');
var myOrgName = config.orgName
var log4js = require('log4js');
var logger = log4js.getLogger('util/channelAPI');
var helper = require('./helper')
var constants = require('../constants')
logger.setLevel(config.logLevel);
hfc.setLogger(logger);
var grpc = require('grpc');
var _policiesProto = grpc.load(__dirname + '/protos/common/policies.proto').common;
var _chaincodeProto = grpc.load(__dirname + '/protos/peer/chaincode.proto').protos;
var _chaincodeDataProto = grpc.load(__dirname + '/protos/peer/chaincode_data.proto').protos;
var _commomProto = grpc.load(__dirname + '/protos/common/policies.proto').common;
var _mspPrincipalProto = grpc.load(__dirname + '/protos/msp/msp_principal.proto').common;
var ORGS = hfc.getConfigSetting('network-config');

var getChaincodeEnodrsememtPolicy = (peerName, channelName, chaincodeName, userContext) => {
    client._userContext = userContext;
    return getChaincodeData(peerName, channelName, chaincodeName, userContext).then((chaincodeData) => {
        logger.debug('##############')
        logger.debug(chaincodeData.policy)
        return chaincodeData.policy
    })
}
var getChaincodeData = (peerName, channelName, chaincodeName, userContext) => {
    var target = helper.getPeerByName(peerName, myOrgName);
    client._userContext = userContext;
    // var signer = userContext.getSigningIdentity();
    var txId = new TransactionID(userContext);
    var request = {
        targets: target,
        chaincodeId: require('fabric-client/lib/Constants').LSCC,
        chainId: channelName,
        txId: txId,
        fcn: 'getccdata',
        args: [channelName, chaincodeName]
    };
    return Channel.sendTransactionProposal(request, channelName, client).then(
        function(results) {
            var responses = results[0];
            logger.debug('queryChaincodeData - got response');
            if (responses && Array.isArray(responses)) {
                //will only be one response as we are only querying one peer
                if (responses.length > 1) {
                    return Promise.reject(new Error('Too many results returned'));
                }
                let response = responses[0];
                if (response instanceof Error) {
                    return Promise.reject(response);
                }
                if (response.response) {
                    logger.debug('queryChaincodeData - response status :: %d', response.response.status);
                    var chaincodeData = _chaincodeDataProto.chaincodeData.decode(response.response.payload);
                    var signaturePolicyEnvelope = _policiesProto.SignaturePolicyEnvelope.decode(chaincodeData.policy)
                    var policy = signaturePolicyEnvelope.policy;
                    var identities = signaturePolicyEnvelope.identities;
                    identities.forEach((identity, index) => {
                        identities[index].principal = _mspPrincipalProto.MSPRole.decode(identity.principal.toBuffer())
                    })
                    chaincodeData.policy = signaturePolicyEnvelope
                    logger.debug('queryChaincodeData result:' + chaincodeData);
                    return Promise.resolve(chaincodeData);
                }
                // no idea what we have, lets fail it and send it back
                return Promise.reject(response);
            }
            return Promise.reject(new Error('Payload results are missing from the query'));
        }
    )


}
var getInstalledChaincodes = function(channelName, peerName, type, userContext) {
    client._userContext = userContext;
    if (type != 'installed') {
        channels.getChannel(channelName)
    }
    var channel = channels[channelName]
    var target
    if (peerName) {
        target = helper.getPeerByName(peerName, myOrgName)
    }
    function switchType() {
        if (type === 'installed') {
            return client.queryInstalledChaincodes(target)
        } else {
            return channel.queryInstantiatedChaincodes(target)
        }
    }
    return switchType().then((response) => {
        if (response) {
            if (type === 'installed') {
                // logger.debug('<<< Installed Chaincodes >>>');
            } else {
                // logger.debug('<<< Instantiated Chaincodes >>>');
            }
            var details = [];
            for (let i = 0; i < response.chaincodes.length; i++) {
                // logger.debug('name: ' + response.chaincodes[i].name + ', version: ' + response.chaincodes[i].version + ', path: ' + response.chaincodes[i].path);
                details.push(response.chaincodes[i]);
            }
            return details;
        } else {
            logger.error('response is null');
            return Promise.reject('response is null')
        }
    }, (err) => {
        logger.error('Failed to send query due to error: ' + err.stack ?
            err.stack :
            err);
        return Promise.reject('Failed to send query due to error: ' + err.stack ?
            err.stack :
            err)
    })
};

//used to init channel before the instantiated channel
var initChannel = (channelName, userContext) => {
    client._userContext = userContext;
    return channels[channelName].initialize()
}

var getBlockActionsByNumber = function(channelName, peerName, blockNumber, userContext) {
    var channel = channels.getChannel(channelName)
    var target;
    target = helper.getPeerByName(peerName);
    client.setUserContext(userContext);
    return channel.queryBlock(parseInt(blockNumber), target).then((response_payloads) => {
        if (response_payloads) {
            return helper.processBlockToReadAbleJson(response_payloads)
        } else {
            logger.error('response_payloads is null');
            return Promise.reject('response_payloads is null');
        }
    })
}

// query a block by number and return a decoded block info
var getBlockByNumber = function(channelName, peerName, blockNumber, userContext) {
    channels.getChannel(channelName)
    var channel = channels[channelName]
    var target = helper.getPeerByName(peerName)
    try {
        blockNumber = parseInt(blockNumber)
    } catch (e) {}
    client.setUserContext(userContext)
    return channel.queryBlock(blockNumber, target).then((response_payloads) => {
        if (response_payloads) {

            return response_payloads;

        } else {
            logger.error('response_payloads is null');
            return Promise.reject('response_payloads is null');
        }
    })
};

var getTransactionByID = function(channeName, peerName, trxnID, userContext) {
    channels.getChannel(channelName)
    var channel = channels[channelName]
    var target = helper.getPeerByName(peerName);
    client.setUserContext(userContext)
    return channel.queryTransaction(trxnID, target)
        .then((response_payloads) => {
            if (response_payloads) {
                logger.debug(response_payloads);
                return response_payloads;
            } else {
                logger.error('response_payloads is null');
                throw new Error('response_payloads is null');
            }
        });
};

var getBlockByHash = function(channelName, peerName, hash, userContext) {
    channels.getChannel(channelName);
    var channel = channels[channelName];
    var target = helper.getPeerByName(peerName);
    client.setUserContext(userContext);
    return channel.queryBlockByHash(Buffer.from(hash), target).then((response_payloads) => {
        if (response_payloads) {
            logger.debug(response_payloads);
            return response_payloads;
        } else {
            logger.error('response_payloads is null');
            throw new Error('response_payloads is null');
        }
    });
};

var getChainInfo = function(channelName, peerName, userContext) {
    channels.getChannel(channelName)
    var channel = channels[channelName]
    var target = helper.getPeerByName(peerName)
    client.setUserContext(userContext);

    return channel.queryInfo(target)
        .then((blockchainInfo) => {
            if (blockchainInfo) {
                // logger.debug(blockchainInfo);
                return blockchainInfo;
            } else {
                logger.error('response_payloads is null');
                throw new Error('response_payloads is null');
            }
        });
};

var getChannels = function(peerName, userContext) {
    var target = helper.getPeerByName(peerName);
    client.setUserContext(userContext);
    return client.queryChannels(target)
        .then((response) => {
            if (response) {
                var channelNames = [];
                for (let i = 0; i < response.channels.length; i++) {
                    channelNames.push(response.channels[i].channel_id);
                }
                // logger.debug(channelNames);
                return channelNames;
            } else {
                logger.error('response_payloads is null');
                throw new Error('response_payloads is null');
            }
        });

};

var createChannel = function(channelName, sourceType, source, userContext) {
    // read in the envelope for the channel config raw bytes
    client._userContext = userContext;
    var envelope;
    var configUpdate;
    channels.getChannel(channelName)
    if (sourceType == 'local') {
        envelope = fs.readFileSync(path.join(__dirname, '../artifacts/channel', source));
    } else if (sourceType == 'buffer') {
        envelope = new Buffer.from(source)
    }
    configUpdate = client.extractChannelConfig(envelope);
    logger.debug(util.format('Successfully acquired admin user for the organization "%s"', myOrgName));
    let signature = client.signChannelConfig(channelConfig);

    let request = {
        config: configUpdate,
        signatures: [signature],
        name: channelName,
        orderer: channels[channelName].getOrderers()[0],
        txId: client.newTransactionID()
    };
    // send to orderer
    return client.createChannel(request)
        .then((response) => {
            logger.debug(' response ::%j', response);
            if (response && response.status === 'SUCCESS') {
                logger.debug('Successfully created the channel.');

                return 'Channel \'' + channelName + '\' created Successfully';
            } else {
                return Promise.reject('Failed to create the channel \'' + channelName + '\' \n\n')
            }
        });
};
var joinChannel = function(channelName, userContext) {
    channels.getChannel(channelName)
    client._userContext = userContext;

    logger.info(util.format('Calling peers in organization "%s" to join the channel', myOrgName));


    var channel = channels[channelName]
    var eventhubs = [];

    tx_id = client.newTransactionID();
    let request = {
        txId: tx_id
    };

    return channel.getGenesisBlock(request)
        .then((genesis_block) => {
            tx_id = client.newTransactionID();
            var request = {
                targets: helper.getChannelTargetByPeerType(channelName, myOrgName, 'all'),
                txId: tx_id,
                block: genesis_block
            };
            eventhubs = helper.getEventHubByChannel(channelName, userContext)

            var eventPromises = [];
            eventhubs.forEach((eh) => {
                let txPromise = new Promise((resolve, reject) => {
                    let handle = setTimeout(() => {
                        reject("overTime to join channel")
                    }, parseInt(10000));
                    // logger.debug('wait time' + config.eventWaitTime) logger.debug(eh)
                    eh.registerBlockEvent((block) => {
                        clearTimeout(handle);
                        if (block.data.data.length === 1) {
                            var channel_header = block.data.data[0].payload.header.channel_header;
                            if (channel_header.channel_id === channelName) {
                                resolve();
                            } else {
                                reject();
                            }
                        }
                    });
                });
                eventPromises.push(txPromise);
            });
            client._userContext = userContext;
            let sendPromise = channel.joinChannel(request);
            return Promise.all([sendPromise].concat(eventPromises))
        }).then((results) => {
        logger.debug(util.format('Join Channel R E S P O N S E : %j', results));
        if (results[0] && results[0][0] && results[0][0].response && results[0][0].response.status == 200) {
            logger.info(util.format('Successfully joined peers in organization %s to the channel \'%s\'', myOrgName, channelName));
            helper.closeEhs(eventhubs)

            return util.format('Successfully joined peers in organization %s to the channel \'%s\'', myOrgName, channelName);
        } else {
            logger.error(' Failed to join channel');
            helper.closeEhs(eventhubs)
            return Promise.reject('Failed to join channel')
        }
    });
};


var getChannelConfig = (channelName, userContext, writePath) => {
    channels.getChannel(channelName)
    var channel = channels[channelName]
    client._userContext = userContext;
    return channel.getChannelConfig().then((configEnvolop) => {
        if (writePath) {
            fs.writeFileSync(path.join(__dirname, '../artifacts/', writePath), configEnvolop.toBuffer())
        }
        return Promise.resolve(configEnvolop.toBuffer())
    })

}


var updateChannel = (channelName, sourceType, source, userContext) => {
    var channel = channels.getChannel(channelName)
    var configUpdate
    var signatures
    var errMsg = ""
    if (sourceType == 'local') {
        try {
            configUpdate = fs.readFileSync(path.join(__dirname, '../artifacts/channel/', source))

        } catch (e) {
            errMsg = "cant not find the configUpdate at " + path.join(__dirname, '../artifacts/channel/', source)
            throw new Error(errMsg)
        }
    } else if (sourceType == 'buffer') {
        configUpdate = source
    } else if (sourceType == 'signRequest') {
        let signRequest = signRequestManager.getInnerSignRequestObj(source);
        if (!signRequest.isFullFilled()) {
            errMsg = "signRequest have not fullfiled";
            throw new Error(errMsg)

        } else if (signRequest._type != constants.CHANNEL_CONFIG_REQUEST) {
            errMsg = `${source} is not a channel config sign request`
            throw new Error(errMsg)

        } else if (signRequest.content.channelName != channelName) {
            errMsg = `${source} is not for the channel ${channelName}`
        } else {
            configUpdate = signRequest.content.configUpdate;
            signatures = signRequest._responses;
        }

    }

    if (!errMsg) {
        client._userContext = userContext;
        signatures = signatures || client.signChannelConfig(configUpdate);
        let request = {
            // envelope: envelope,
            config: configUpdate,
            signatures: signatures,
            name: channelName,
            orderer: channels[channelName].getOrderers()[0],
            txId: client.newTransactionID()
        };
        client._userContext = userContext;
        return client.updateChannel(request).then((response) => {
            logger.debug(' response ::%j', response);
            if (response && response.status === 'SUCCESS') {
                logger.debug('Successfully update the channel.');
                let response = 'Channel \'' + channelName + '\' updated Successfully'
                return response;
            } else {
                return Promise.reject('Failed to update the channel \'' + channelName + '\' \n\n')
            }

        })
    }
}

module.exports = {
    createChannel: createChannel,
    joinChannel: joinChannel,
    getChainInfo: getChainInfo,
    getInstalledChaincodes: getInstalledChaincodes,
    getBlockByNumber: getBlockByNumber,
    getBlockActionsByNumber: getBlockActionsByNumber,
    getChannels: getChannels,
    getChannelConfig: getChannelConfig,
    updateChannel: updateChannel,
    initChannel: initChannel,
    getChaincodeEnodrsememtPolicy: getChaincodeEnodrsememtPolicy,
    getChaincodeData: getChaincodeData
}