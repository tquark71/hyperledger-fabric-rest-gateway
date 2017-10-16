var client = require('./client')
var channels = require('./channels')
var util = require('util')
var helper = require('./helper')
var requestPlugin = require('./requestPlugin')
var user = require('./user')
var hfc = require('fabric-client');
var EventHub = require('fabric-client/lib/EventHub.js');
var config = require('../config.json');
var myOrgName = config.orgName
var log4js = require('log4js');
var logger = log4js.getLogger('chaincodeTrigger');
var channelAPI = require('./channelAPI')
var Sender = require('./sender')
var DBs = require('../Db')
var chaincodeMethod = DBs.chaincodeMethod
logger.setLevel(config.logLevel);
var fs = require('fs')
var Promise = require('bluebird')
var path = require('path')
hfc.setLogger(logger);
var ORGS = hfc.getConfigSetting('network-config');
var channelConfig = hfc.getConfigSetting('channelConfig')
var grpc = require('grpc')
var _chaincodeDataProto = grpc.load(__dirname + '/protos/peer/chaincode_data.proto').protos

// used for outside added function to process request


function registarTxPromises(ehs, txID, timeout) {

    var txPromises = []
    var expireTime = timeout || 30000

    ehs.forEach(function(eh) {

        let txPromise = new Promise((resolve, reject) => {
            let handle = setTimeout(() => {
                eh.disconnect();
                reject();
            }, expireTime);
            eh.registerTxEvent(txID, (tx, code) => {
                logger.info('The chaincode  transaction has been send to peer ' + eh._ep._endpoint.addr);
                clearTimeout(handle);
                eh.unregisterTxEvent(txID);
                eh.disconnect();

                if (code !== 'VALID') {
                    logger.error('The chaincode  transaction was invalid, code = ' + code);
                    reject();
                } else {
                    resolve();
                }
            });
        });
        txPromises.push(txPromise)
    })
    return txPromises

}

function registarTxPromisesAny(ehs, txID, timeout) {

    var txPromises = []
    var expireTime = timeout || 30000

    ehs.forEach(function(eh) {

        let txPromise = new Promise((resolve, reject) => {
            let handle = setTimeout(() => {
                eh.disconnect();
                reject();
            }, expireTime);
            eh.registerTxEvent(txID, (tx, code) => {
                logger.info('The chaincode  transaction has been committed on peer ' + eh._ep._endpoint.addr);
                clearTimeout(handle);
                eh.unregisterTxEvent(txID);
                eh.disconnect();

                if (code !== 'VALID') {
                    logger.error('The chaincode  transaction was invalid, code = ' + code);
                    reject();
                } else {
                    resolve();
                }
            });
        });
        txPromises.push(txPromise)
    })
    return Promise.race(txPromises)

}


var installChaincode = function(channelName, chaincodeName, sourceType, chaincodePath, chaincodeVersion, userContext, opt) {
    var targets = []
    if (config.mode == "dev") {
        targets.push(client.newPeer('grpc://localhost:7051'))
    } else {
        if (opt) {
            targets = helper.getTargetsByOpt(opt.targetList)
        } else {
            targets = helper.getChannelTargetByPeerType(channelName, myOrgName, 'e')
        }
    }
    logger.info('start to install chaincode on peers')
    logger.debug(targets)
    var request = {
        targets: targets,
        chaincodePath: chaincodePath,
        chaincodeId: chaincodeName,
        chaincodeVersion: chaincodeVersion,

    };
    if (sourceType == 'package') {
        request.chaincodePackage = fs.readFileSync(path.join(process.env.GOPATH, 'src', chaincodePath))
    }
    client._userContext = userContext;

    return requestPlugin.getPluginAndProcess('install', request, opt).then(() => {
        return client.installChaincode(request)
    }).then((results) => {
        let proposalGood = Sender.checkProposal(results)
        if (proposalGood) {
            logger.info(util.format('Successfully sent install Proposal and received ProposalResponse'));
            logger.debug('\nSuccessfully Installed chaincode on organization ' + myOrgName + '\n');
            return 'Successfully Installed chaincode on organization ' + myOrgName;
        } else {
            let response = Sender.makeProposalResponse(targets, results[0], 'install')
            logger.error(response)
            return Promise.reject(response)
        }
    });
};


//send the instantiate request and return the status, we can not get responese from the chaincode because
// the chaicnode was executed by lscc but send the lscc's responese not the chaincode's one
var instantiateChaincode = function(channelName, chaincodeName, chaincodeVersion, functionName, args, userContext, opt) {
    logger.info('start to instantiate chaincode')
    logger.debug('')
    var tx_id = null
    var channel = channels.getChannel(channelName)
    client._userContext = userContext;
    tx_id = client.newTransactionID();
    logger.debug('get tx_id');
    logger.debug(tx_id);
    var targets = []
    if (config.mode == "dev") {
        targets.push(client.newPeer('grpc://localhost:7051'))
    } else {
        if (opt.targetList) {
            targets = helper.getTargetsByOpt(opt.targetList)
        } else {
            targets = helper.getChannelTargetByPeerType(channelName, 'all', 'e')
        }
    }
    logger.debug('instantiate targest : ' + JSON.stringify(targets))
    // send proposal to endorser
    var request = {
        targets: targets,
        chaincodeId: chaincodeName,
        chaincodeVersion: chaincodeVersion,
        fcn: functionName,
        args: args,
        txId: tx_id
    };


    if (opt) {
        logger.debug('request has endorsement policy')
        if (opt['endorsement-policy']) {
            request['endorsement-policy'] = opt['endorsement-policy']
        }
    }
    return requestPlugin.getPluginAndProcess('instantiate', request, opt).then(() => {
        logger.debug('plug request fromat finish');
        client._userContext = userContext;
        return channel.sendInstantiateProposal(request)
    }).then((results) => {
        var proposalGood = Sender.checkProposal(results)
        logger.debug('checking instantiate proposal')
        if (proposalGood) {
            return sendToCommit(results, tx_id, channel, userContext, 'instantiate').then(() => {
                return util.format("Initiatiate chaincode %s at channel %s successful", chaincodeName, channelName)
            })

        } else {
            let response = Sender.makeProposalResponse(targets, results[0], 'instantiate')
            logger.error(response)
            return Promise.reject(response)
        }
    })
};
//internal method, after check proposal, use this function to send to orderer.
function sendToCommit(results, txID, channel, userContext, type) {
    client._userContext = userContext;
    var request = {
        proposalResponses: results[0],
        proposal: results[1],
        header: results[2]
    };
    var deployId = txID.getTransactionID();
    var ehs = helper.getOrgEventHubs(userContext, channel.getName())
    var expireTime;
    if (type == 'instantiate' || type == 'upgrade') {
        expireTime == 180000
    } else {
        expireTime == 30000
    }
    var txPromises = registarTxPromisesAny(ehs, deployId, expireTime);
    var sendPromise = channel.sendTransaction(request);
    var allPromise = []
    allPromise.push(sendPromise)
    allPromise.push(txPromises)
    return Promise.all(allPromise).then((results) => {
        return 'Done'
    })
}

var upgradeChaincode = function(channelName, chaincodeName, chaincodeVersion, functionName, args, userContext, opt) {
    var tx_id = null
    var channel = channels.getChannel(channelName)
    client._userContext = userContext;
    tx_id = client.newTransactionID();
    var targets = []
    if (config.mode == "dev") {
        targets.push(client.newPeer('grpc://localhost:7051'))
    } else {
        if (opt) {
            targets = helper.getTargetsByOpt(opt.targetList)
        } else {
            targets = helper.getChannelTargetByPeerType(channelName, 'all', 'e')
        }
    }
    // send proposal to endorser
    var request = {
        targets: targets,
        chaincodePath: chaincodePath,
        chaincodeId: chaincodeName,
        chaincodeVersion: chaincodeVersion,
        fcn: functionName,
        args: args,
        txId: tx_id
    };
    if (opt && opt['endorsement-policy']) {
        request['endorsement-policy'] = opt['endorsement-policy']
    }
    return requestPlugin.getPluginAndProcess('upgrade', request, opt).then(() => {
        logger.debug('start send upgrade proposal')
        client._userContext = userContext;
        return channel.sendUpgradeProposal(request)
    }).then((results) => {
        var all_good = Sender.checkProposal(results)
        logger.debug('checking upgrade proposal')
        if (all_good) {
            return sendToCommit(results, tx_id, channel, userContext, 'upgrade').then(() => {
                return util.format("Initiatiate chaincode %s at channel %s successful", chaincodeName, channelName)
            })
        } else {
            let response = Sender.makeProposalResponse(targets, results[0], 'instantiate')
            logger.error(response)
            return Promise.reject(response)

        }
    })
};

//disappriciated function, misssing load balance and policy get
var invokeChaincode = function(channelName, chaincodeName, fcn, args, userContext, opt) {
    var channel = channels.getChannel(channelName)
    client._userContext = userContext;
    var tx_id = null;
    var proposalResuls = [];
    tx_id = client.newTransactionID();
    var targets = []
    if (config.mode == "dev") {
        targets.push(client.newPeer('grpc://localhost:7051'))
    } else {
        if (opt) {
            targets = helper.getTargetsByOpt(opt.targetList)
        } else {
            targets = helper.getChannelTargetByPeerType(channelName, 'all', 'e', opt)
        }
    }
    var request = {
        targets: targets,
        chaincodeId: chaincodeName,
        fcn: fcn,
        args: args,
        chainId: channelName,
        txId: tx_id
    };
    return requestPlugin.getPluginAndProcess('invoke', request, opt).then(() => {
        client._userContext = userContext;
        return channel.sendTransactionProposal(request)
    }).then((results) => {
        results[0].forEach((response) => {
            if (response.response) {
                proposalResuls.push(response.response.payload.toString())
            }
        })
        var proposalGood = Sender.checkProposal(results, true)
        if (proposalGood) {
            return sendToCommit(results, tx_id, channel, userContext, 'invoke').then(() => {
                if (checkAllResult(proposalResuls)) {
                    return proposalResuls[0]
                } else {
                    return "tx has commite but some peer's response not the same" + proposalResuls
                }
            })
        } else {
            let response = Sender.makeProposalResponse(targets, results[0], 'invoke')
            logger.error(response)
            return Promise.reject(response)
        }
    })

};
var invokeChaincodeByEndorsePolice = (channelName, chaincodeName, fcn, args, userContext, opt) => {
    var channel = channels.getChannel(channelName)
    client._userContext = userContext;
    var tx_id = client.newTransactionID();
    var proposalResuls = [];
    var sender
    var request = {
        chaincodeId: chaincodeName,
        fcn: fcn,
        args: args,
        chainId: channelName,
        txId: tx_id
    };
    return requestPlugin.getPluginAndProcess('invoke', request, opt).then(() => {
        logger.debug('process request finish')
        logger.debug(request)
        return getChaincodePolicy(channelName, chaincodeName, userContext)
    }).then((policy) => {
        logger.debug('get policy')
        logger.debug(policy)
        sender = new Sender(channel, policy, 'invoke', userContext, request, tx_id, opt)
        return sender.initExecute()
    }).then((results) => {
        logger.debug('results is ' + results)
        results[0].forEach((response) => {
            if (response.response) {
                proposalResuls.push(response.response.payload.toString())
            }
        })
        // return 'endorse good'
        if (!Sender.checkProposal(results)) {
            let response = sender.makeProposalResponse()
            return Promise.reject(JSON.stringify(response))
        } else {
            return sendToCommit(results, tx_id, channel, userContext, 'invoke').then(() => {
                if (checkAllResult(proposalResuls)) {
                    return proposalResuls[0]
                } else {
                    return "tx has commite but some peer's response not the same" + proposalResuls
                }
            })
        }
    }).catch((e) => {
        logger.error(e)
        if (!(e.toString().indexOf('policy failed') > -1)) {
            let response = sender.makeProposalResponse()
            return Promise.reject(response)

        } else {
            return Promise.reject(e)
        }

    })
}
var getChaincodePolicy = (channelName, chaincodeName, userContext) => {
    logger.debug('get channelName %s chaincode %s endorse policy', channelName, chaincodeName)
    let peerName;
    let peerList = channelConfig[channelName]['peers'][myOrgName]
    logger.debug(peerList)
    for (let peerIndex in peerList) {
        logger.debug('check peerInfo', peerList[peerIndex])
        let peerStatus = helper.getPeerAliveState(peerList[peerIndex].name, myOrgName)
        logger.debug(peerStatus)
        if (peerStatus) {
            logger.debug('get chaincode endorsement policy from %s', peerList[peerIndex].name)
            return channelAPI.getChaincodeEnodrsememtPolicy(peerList[peerIndex].name, channelName, chaincodeName, userContext).catch((e) => {
                return Promise.reject(util.format('Fetch chaincode %s policy failed reason : %s', chaincodeName, e.toString()))
            })
        }
    }
}


var queryChaincode = function(channelName, chaincodeName, fcn, args, userContext, opt) {
    logger.info('start to query chaincode on channel %s chaincode ', channelName, chaincodeName)
    var channel = channels.getChannel(channelName)
    client._userContext = userContext;
    tx_id = client.newTransactionID();
    var queryResponses = []
    // send query
    var targets = []
    if (config.mode == "dev") {
        targets.push(client.newPeer('grpc://localhost:7051'))
    } else {
        if (opt) {
            targets = helper.getTargetsByOpt(opt.targetList)
        } else {
            targets = helper.getChannelTargetByPeerType(channelName, myOrgName, 'e')
        }
    // TO DO use endorsePolicy to assign target
    }
    var request = {
        targets: targets,
        chaincodeId: chaincodeName,
        txId: tx_id,
        fcn: fcn,
        args: args
    };
    return requestPlugin.getPluginAndProcess('query', request, opt).then(() => {
        client._userContext = userContext;
        return channel.queryByChaincode(request)
    }).then((response_payloads) => {
        if (response_payloads) {
            for (let i = 0; i < response_payloads.length; i++) {
                queryResponses.push(response_payloads[i].toString('utf8'))
            }
            logger.debug('query result ' + queryResponses)
            if (checkAllResult(queryResponses)) {
                return queryResponses[0]
            } else {
                return "some peer's response not the same" + queryResponses
            }
        } else {
            logger.error('response_payloads is null');
            return Promise.reject('response_payloads is null');
        }
    })

};
var queryHistory = function(channelName, chaincodeName, fcn, args, userContext, opt) {
    logger.info('start to query chaincode on channel %s chaincode ', channelName, chaincodeName)
    var channel = channels.getChannel(channelName)
    client._userContext = userContext;
    tx_id = client.newTransactionID();
    var queryResponses = []
    // send query
    var targets = []
    if (config.mode == "dev") {
        targets.push(client.newPeer('grpc://localhost:7051'))
    } else {
        if (opt) {
            targets = helper.getTargetsByOpt(opt.targetList)
        } else {
            targets = helper.getChannelTargetByPeerType(channelName, myOrgName, 'e')
        }
    // TO DO use endorsePolicy to assign target
    }
    var request = {
        targets: targets,
        chaincodeId: chaincodeName,
        txId: tx_id,
        fcn: fcn,
        args: args
    };
    return requestPlugin.getPluginAndProcess('queryHistory', request, opt).then(() => {
        client._userContext = userContext
        return channel.queryByChaincode(request)
    }).then((response_payloads) => {
        if (response_payloads) {
            for (let i = 0; i < response_payloads.length; i++) {
                queryResponses.push(response_payloads[i].toString('utf8'))
            }
            logger.debug('query result ' + queryResponses)
            if (checkAllResult(queryResponses)) {
                return queryResponses[0]
            } else {
                return "some peer's response not the same" + queryResponses
            }
        } else {
            logger.error('response_payloads is null');
            return Promise.reject('response_payloads is null');
        }
    })

};

var checkAllResult = (results) => {
    var result = null;
    var allTheSame = true
    results.forEach((oResult) => {
        if (result === null) {
            result = oResult
        } else {
            if (result !== oResult) {
                allTheSame == false

            }
        }
    })
    return allTheSame
}

module.exports = {
    installChaincode: installChaincode,
    instantiateChaincode: instantiateChaincode,
    invokeChaincode: invokeChaincode,
    queryChaincode: queryChaincode,
    queryHistory: queryHistory,
    upgradeChaincode: upgradeChaincode,
    invokeChaincodeByEndorsePolice: invokeChaincodeByEndorsePolice
}