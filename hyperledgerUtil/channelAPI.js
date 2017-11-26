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
var eventHub = require('./eventHub');
var config = require('../config');
var myOrgName = config.fabric.orgName
var log4js = require('log4js');
var logger = log4js.getLogger('util/channelAPI');
var helper = require('./helper')
var peers = require('./peers');
var constants = require('../constants')
logger.setLevel(config.gateway.logLevel);
var grpc = require('grpc');
var _policiesProto = grpc.load(__dirname + '/protos/common/policies.proto').common;
var _chaincodeProto = grpc.load(__dirname + '/protos/peer/chaincode.proto').protos;
var _chaincodeDataProto = grpc
    .load(__dirname + '/addedProto/chaincode_data.proto')
    .protos;
var _commomProto = grpc.load(__dirname + '/protos/common/policies.proto').common;
var _configtxProto = grpc.load(__dirname + '/protos/common/configtx.proto').common;
var _mspPrincipalProto = grpc.load(__dirname + '/protos/msp/msp_principal.proto').common;
var networkConfig = require('./networkConfig');
var ORGS = networkConfig.getNetworkConfig('network-config');
var eventDefaultTime = config.fabric.eventWaitTime.default
var getChaincodeEnodrsememtPolicy = (peerName, channelName, chaincodeName, userContext) => {
    client._userContext = userContext;
    return getChaincodeData(peerName, channelName, chaincodeName, userContext).then((chaincodeData) => {
        logger.debug('##############')
        logger.debug(chaincodeData.policy)
        return chaincodeData.policy
    })
}
var getChaincodeData = (peerName, channelName, chaincodeName, userContext) => {
    var target = peers.getPeerByName(peerName, myOrgName);
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
                    logger.debug("chaincodeData")

                    logger.debug(chaincodeData)
                    var signaturePolicyEnvelope = _policiesProto.SignaturePolicyEnvelope.decode(chaincodeData.policy)
                    var rule = signaturePolicyEnvelope.rule;
                    logger.debug("signaturePolicyEnvelope")
                    logger.debug(signaturePolicyEnvelope)
                    logger.debug("rule")
                    logger.debug(rule)
                    var identities = signaturePolicyEnvelope.identities;
                    identities.forEach((identity, index) => {
                        identities[index].principal = _mspPrincipalProto.MSPRole.decode(identity.principal.toBuffer())
                    })
                    logger.debug("signaturePolicyEnvelope")
                    logger.debug(JSON.stringify(signaturePolicyEnvelope))
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
        target = peers.getPeerByName(peerName, myOrgName)
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
    target = peers.getPeerByName(peerName);
    client.setUserContext(userContext, true);
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
    var target = peers.getPeerByName(peerName)
    try {
        blockNumber = parseInt(blockNumber)
    } catch (e) {}
    client.setUserContext(userContext, true)
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
    var target = peers.getPeerByName(peerName);
    client.setUserContext(userContext, true)

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
    var target = peers.getPeerByName(peerName);
    client.setUserContext(userContext, true);
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
    var target = peers.getPeerByName(peerName)
    client.setUserContext(userContext, true);

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
    var target = peers.getPeerByName(peerName);
    client.setUserContext(userContext, true);
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
    let signature = client.signChannelConfig(configUpdate);

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

                return `Channel ${channelName} created Successfully`;
            } else {
                return Promise.reject('Failed to create the channel \'' + channelName + '\' \n\n')
            }
        });
};
var joinChannel = function(channelName, userContext, peerName) {
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
            var targets;
            if (peerName) {
                targets = [peers.getPeerByName(peerName, myOrgName)]
            } else {
                targets = peers.getChannelTargetByPeerType(channelName, myOrgName, 'all')
            }
            var request = {
                targets: targets,
                txId: tx_id,
                block: genesis_block
            };
            if (peerName) {
                eventhubs = [eventHub.getEventHubByName(peerName, userContext)]
            } else {
                eventhubs = eventHub.getEventHubByChannel(channelName, userContext)
            }

            var eventPromises = [];
            eventhubs.forEach((eh) => {
                let txPromise = new Promise((resolve, reject) => {
                    let handle = setTimeout(() => {
                        reject("overTime to join channel")
                    }, parseInt(config.fabric.eventWaitTime.joinChannel || eventDefaultTime));
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
            let sendPromise = channel.joinChannel(request).then((res) => {
                let errMsg = []
                if (Array.isArray(res)) {
                    res.forEach((result) => {
                        if (result instanceof Error) {
                            errMsg.push(result.toString())
                        }
                    })
                }
                if (errMsg.length > 0) {
                    return Promise.reject(errMsg)
                } else {
                    return res
                }
            })
            return Promise.all([sendPromise].concat(eventPromises))
        }).then((results) => {
        logger.debug(util.format('Join Channel R E S P O N S E : %j', results));
        if (results[0] && results[0][0] && results[0][0].response && results[0][0].response.status == 200) {
            logger.info(util.format('Successfully joined peers in organization %s to the channel %s', myOrgName, channelName));
            eventHub.closeEhs(eventhubs)

            return util.format('Successfully joined peers in organization %s to the channel %s', myOrgName, channelName);
        } else {
            logger.error(' Failed to join channel');
            eventHub.closeEhs(eventhubs)
            return Promise.reject('Failed to join channel')
        }
    });
};


var getChannelConfig = (channelName, userContext, writePath) => {
    channels.getChannel(channelName)
    var channel = channels[channelName]
    client._userContext = userContext;
    return channel.getChannelConfig().then((configEnvolop) => {
        configEnvolop = configEnvolop.toBuffer()
        if (writePath) {

            fs.writeFileSync(path.resolve(__dirname, '../artifacts/', writePath), configEnvolop.toBuffer())
        }
        return Promise.resolve(configEnvolop)
    })

}


var updateChannel = (channelName, sourceType, source, userContext) => {
    var channel = channels.getChannel(channelName)
    var configUpdate
    var signatures = []
    var errMsg = ""
    var promiseArr = [];
    if (sourceType == 'local') {
        try {
            configUpdate = fs.readFileSync(path.resolve(__dirname, '../artifacts/channel/', source))
            promiseArr.push(Promise.resolve())
        } catch (e) {
            errMsg = "cant not find the configUpdate at " + path.resolve(__dirname, '../artifacts/channel/', source)
            throw new Error(errMsg)
        }
    } else if (sourceType == 'buffer') {
        configUpdate = source
        promiseArr.push(Promise.resolve())

    } else if (sourceType == 'signRequest') {
        let p = signRequestManager.getInnerSignRequestObj(source).then((signRequest) => {
            if (!signRequest.isFullFilled()) {
                errMsg = "signRequest have not fullfiled";
                throw new Error(errMsg)

            } else if (signRequest._type != constants.CHANNEL_CONFIG_REQUEST) {
                errMsg = `${source} is not a channel config sign request`
                throw new Error(errMsg)

            } else if (signRequest.content.channelName != channelName) {
                errMsg = `${source} is not for the channel ${channelName}`
                throw new Error(errMsg)
            } else {
                logger.debug('update channel by sign Request')
                configUpdate = signRequest.content.configUpdate;
                signRequest._responses.forEach((signatureBuffer, index) => {
                    let proto_config_signature = _configtxProto.ConfigSignature.decode(signatureBuffer);
                    signatures.push(proto_config_signature)
                })
                logger.debug("configUpdate");
                logger.debug(configUpdate)
                // logger.debug('signatures');
                // logger.debug(signatures)
                return Promise.resolve()
            }
        })
        promiseArr.push(p)


    }

    if (!errMsg) {
        console.log(promiseArr)
        return Promise.all(promiseArr).then(() => {
            console.log('in the all')
            client._userContext = userContext;
            if (signatures.length == 0) {
                signatures = client.signChannelConfig(configUpdate);
            }
            let request = {
                // envelope: envelope,
                config: configUpdate,
                signatures: signatures,
                name: channelName,
                orderer: channels[channelName].getOrderers()[0],
                txId: client.newTransactionID()
            };
            // console.log('request');
            // // console.log(request)

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