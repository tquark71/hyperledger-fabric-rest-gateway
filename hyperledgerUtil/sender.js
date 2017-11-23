var helper = require('./helper')
var peers = require('./peers')
var util = require('util')
var Promise = require('bluebird')
var log4js = require('log4js');
var logger = log4js.getLogger('sender');
var hfc = require('fabric-client');
var Channel = require('fabric-client/lib/Channel');
var clientUtils = require('fabric-client/lib/client-utils.js');
var grpc = require('grpc');
var client = require('./client')
var _ccProto = grpc.load(__dirname + '/protos/peer/chaincode.proto').protos;
var _commonProto = grpc.load(__dirname + '/protos/common/common.proto').common;
//replace the src code Channel static functin sendTransactionProposal so we can send same noce
//to the endorse
Channel.sendTransactionProposal = (request, channelId, clientContext, opt) => {
    // Verify that a Peer has been added
    var errorMsg = null;

    // args is not optional because we need for transaction to execute
    if (request && !request.args) {
        errorMsg = 'Missing "args" in Transaction proposal request';
    } else {
        errorMsg = clientUtils.checkProposalRequest(request);
    }

    if (!request.targets || request.targets.length < 1) {
        errorMsg = 'Missing peer objects in Transaction proposal';
        logger.error('sendTransactionProposal Error:' + errorMsg);
        return Promise.reject(new Error(errorMsg));
    }

    if (errorMsg) {
        logger.error('sendTransactionProposal error ' + errorMsg);
        return Promise.reject(new Error(errorMsg));
    }

    var args = [];
    args.push(Buffer.from(request.fcn ? request.fcn : 'invoke', 'utf8'));
    // logger.debug('sendTransactionProposal - adding function arg:%s', request.fcn ? request.fcn : 'invoke');

    for (let i = 0; i < request.args.length; i++) {
        // logger.debug('sendTransactionProposal - adding arg:%s', request.args[i]);
        args.push(Buffer.from(request.args[i], 'utf8'));
    }
    //special case to support the bytes argument of the query by hash
    if (request.argbytes) {
        // logger.debug('sendTransactionProposal - adding the argument :: argbytes');
        args.push(request.argbytes);
    } else {
        // logger.debug('sendTransactionProposal - not adding the argument :: argbytes');
    }
    let invokeSpec = {
        type: _ccProto.ChaincodeSpec.Type.GOLANG,
        chaincode_id: {
            name: request.chaincodeId
        },
        input: {
            args: args
        }
    };
    var proposal,
        header;

    var userContext = clientContext.getUserContext();

    var channelHeader = clientUtils.buildChannelHeader(
        _commonProto.HeaderType.ENDORSER_TRANSACTION,
        channelId,
        request.txId.getTransactionID(),
        null,
        request.chaincodeId
    );

    if (opt) {
        header = opt.header || clientUtils.buildHeader(userContext.getIdentity(), channelHeader, request.txId.getNonce());
        proposal = opt.proposal || clientUtils.buildProposal(invokeSpec, header, request.transientMap);
    } else {
        header = clientUtils.buildHeader(userContext.getIdentity(), channelHeader, request.txId.getNonce());
        proposal = clientUtils.buildProposal(invokeSpec, header, request.transientMap);

    }
    let signed_proposal = clientUtils.signProposal(userContext.getSigningIdentity(), proposal);
    return clientUtils.sendPeersProposal(request.targets, signed_proposal)
        .then(
            function(responses) {
                return Promise.resolve([responses, proposal, header]);
            }
    ).catch(
        function(err) {
            logger.error('Failed Proposal. Error: %s', err.stack ? err.stack : err);
            return Promise.reject(err);
        }
    );
}


const ENDORSER_TRANSACTION = 3
var sender = class {
    constructor(channel, initPolicy, sendType, userContext, request, txID, opt) {
        this.channel = channel;
        this.initPolicy = initPolicy;
        this.identities = initPolicy.identities;
        this.request = request;
        this.userContext = userContext;
        this.txID = txID;
        this.endorsementArr = [];
        this.responseTargets = [];
        this.responseResults = [];
        this.sendType = sendType;
        if (!opt) {
            opt = {}
        }
        this.invokeSpec = {
            type: _ccProto.ChaincodeSpec.Type.GOLANG,
            chaincode_id: {
                name: this.request.chaincodeId
            },
            input: {
                args: this.makeArgs()
            }
        };
        this.executeType = opt.executeType || "step"
        this.expireTime = opt.expireTime || 500
        this.channelHeader = clientUtils.buildChannelHeader(ENDORSER_TRANSACTION, channel.getName(), this.txID.getTransactionID(), null, this.request.chaincodeId)
        this.header = clientUtils.buildHeader(userContext.getIdentity(), this.channelHeader, this.txID.getNonce())
        this.proposal = clientUtils.buildProposal(this.invokeSpec, this.header, this.request.transientMap)
        this.results = [
            [], this.proposal, this.header
        ]
        this.proposalOpt = {
            header: this.header,
            proposal: this.proposal
        }
    }
    makeArgs() {
        var args = [];
        args.push(Buffer.from(this.request.fcn ? this.request.fcn : 'invoke', 'utf8'));
        logger.debug('sendTransactionProposal - adding function arg:%s', this.request.fcn ? this.request.fcn : 'invoke');

        for (let i = 0; i < this.request.args.length; i++) {
            logger.debug('sendTransactionProposal - adding arg:%s', this.request.args[i]);
            args.push(Buffer.from(this.request.args[i], 'utf8'));
        }
        //special case to support the bytes argument of the query by hash
        if (this.request.argbytes) {
            logger.debug('sendTransactionProposal - adding the argument :: argbytes');
            args.push(this.request.argbytes);
        } else {
            logger.debug('sendTransactionProposal - not adding the argument :: argbytes');
        }
        return args
    }
    executePolicy(policy) {
        if (policy.Type == 'n_out_of') {
            logger.debug('start n out of ')
            return this.executeNOutOf(policy)
        } else if (policy.Type == 'signed_by') {
            logger.debug('start signed by ')

            return this.executeSignBy(policy)
        }
    }
    initExecute() {
        // logger.debug('init policy is :' + JSON.stringify(this.initPolicy))
        return this.executeNOutOf(this.initPolicy.policy).catch((e) => {
            return Promise.reject('try all method but can not fullfill the policy of chaincode')
        })
    }
    executeNOutOf(policy) {
        // logger.debug('execute N out of policy : %s', JSON.stringify(policy))
        let n = policy['n_out_of'].n
        logger.debug('execute N out of n : %s', n)
        let progressInfo = {
            number: n,
            policiesIndex: 0
        }
        let policies = policy['n_out_of'].policies

        // open mutiplu endorseThread depend on how many n need to be achieved
        var threadPromiseArr = []
        if (this.executeType == 'step') {
            for (let i = 0; i < n; i++) {
                logger.debug('open a promise thread')
                threadPromiseArr.push(this.endorseThread(progressInfo, policies))
            }
            return Promise.all(threadPromiseArr).then((results) => {
                logger.debug('all thread done, check results')
                logger.debug(results)
                var allDone = false;
                results.forEach((result) => {
                    logger.debug(result)
                    if (result == 'Done') {
                        allDone = true
                    }
                })
                logger.debug('all Done ' + allDone)
                if (allDone == true) {
                    return this.results
                } else {
                    return Promise.reject('all failed')
                }

            })
        }
        //TO DO: use once mode to trigger the polices
        // else if (this.executeType == 'once') {
        //     for (let i = 0; i < policies.length; i++) {
        //         threadPromiseArr.push(() => {
        //             return this.executePolicy(policies[i]).catch((e) => {
        //                 return new Promise((rs, rj) => {
        //                     setTimeout(() => {
        //                         rj();
        //                     }, this.expireTime)
        //                 })

        //             })
        //         })

        //     }
        //     return Promise.some(threadPromiseArr, n)
        // }

    }
    executeSignBy(policy) {
        let identityIndex = policy['signed_by']
        let mspID = this.identities[identityIndex].principal['msp_identifier'];
        let role = this.identities[identityIndex].principal['role'];
        return this.sendProposalToOrg(mspID, role)
    }
    endorseThread(progressInfo, policies) {
        logger.debug('start to endorseThread')
        // now impelment method is open n time thread to reach the n
        // we can add speed up mode that send all request at same time to
        // try all method at one time
        if (progressInfo.number == 0) {
            return Promise.resolve('Done')
        } else {
            let policiesIndex = progressInfo.policiesIndex;
            if (policiesIndex == policies.length) {
                logger.warn('all police has been try but can not reach the critiria');
                return Promise.resolve('all police has been try but can not reach the critiria')
            } else {
                progressInfo.policiesIndex++;
                return this.executePolicy(policies[policiesIndex]).then((res) => {
                    progressInfo.number--;
                    return this.endorseThread(progressInfo, policies)
                }).catch((e) => {
                    return this.endorseThread(progressInfo, policies)
                })
            }
        }
    }
    // constantly send the request to targets util any target have signed the proposal
    iterativeSend(targets, sendFunc) {
        logger.debug('start iterative send')
        return sender.reorderTargets(targets).then((reTargets) => {
            // logger.debug(reTargets)
            return Promise.each(reTargets, (target) => {
                let request = JSON.parse(JSON.stringify(this.request))
                logger.debug('proposal request')
                request.txId = this.txID
                request.targets = [target]
                client.setUserContext(this.userContext, true);
                peers.addPeerRequestTime(target._name[0], target._name[1]);
                return Channel.sendTransactionProposal(request, this.channel.getName(), client, this.proposalOpt).then((results) => {
                    logger.debug('proposal result' + results)
                    this.responseTargets.push(target)
                    this.responseResults.push(results[0][0])
                    var proposalGood = sender.checkProposal(this.channel, results, true)
                    if (proposalGood) {
                        this.results[0].push(results[0][0])
                        return Promise.reject('Done')
                    } else {
                        if (results[0][0].toString().indexOf('chaincode error') > -1 &&
                            results[0][0].toString().indexOf('exist') == -1) {
                            return Promise.reject('Done')
                        }
                        return Promise.resolve()
                    }
                })
            })
        }).then(() => {
            return Promise.reject('All failed')
        }).catch((e) => {
            logger.debug('iterative end')
            if (e == 'Done') {
                return Promise.resolve('Done')
            } else {
                logger.warn(e)
                return Promise.reject(e)
            }
        })
    }
    makeProposalResponse() {
        return sender.makeProposalResponse(this.responseTargets, this.responseResults, 'invoke')
    }
    sendProposalToOrg(mspID, role) {

        let orgName = helper.getOrgNameByMspID(mspID)
        if (!orgName) {
            return Promise.reject('can not find mspId in network config')
        }
        let targets = peers.getChannelTargetByPeerType(this.channel.getName(), orgName, 'e', role)
        if (targets.length <= 0) {
            return Promise.reject(util.format('no endorse peer of org %s in channel %s ', orgName, this.channel.getName()))
        } else {
            logger.debug('get targets');
            logger.debug('send method is ' + this.sendType)
            if (this.sendType == 'instantiate') {
                //TO DO: intantiate should send to all peers
                //and so it worth to be disscuess how to do when the
                //instantiate type
            } else if (this.sendType == 'upgrade') {
                //TO DO: same as the instantiate
            } else if (this.sendType == 'invoke') {
                logger.debug('sendType is invoke')
                return this.iterativeSend(targets)

            }
        }

    }
    static checkProposal(channel, results, onePass) {
        var proposalResponses = results[0];

        var proposal = results[1];
        var header = results[2];
        var all_good = true;
        for (var i in proposalResponses) {
            let one_good = false;
            if (proposalResponses && proposalResponses[i].response && proposalResponses[i].response.status === 200) {
                one_good = true;
                if (onePass) {
                    return true;
                }
                logger.debug('tx proposal was good');
            } else {
                logger.warn('tx proposal was bad');
            }
            all_good = all_good & one_good;
        }
        if (all_good) {
            if (channel != null || onePass) {
                logger.debug(proposalResponses)
                if (!channel.compareProposalResponseResults(proposalResponses)) {
                    return 'proposal response are not the same';
                }
            }
            return all_good

        } else {
            return false
        }

    }
    static reorderTargets(targets) {
        logger.debug('<====== reorderTargets start =========>');
        logger.debug('orignial tartgets');
        logger.debug(targets);
        let reorderedTargets = []
        targets.forEach((target) => {
            let requestTime = peers.getPeerRequsetTime(target._name[0], target._name[1]);
            logger.debug(`get request Time for ${target._name} : ${requestTime}`);
            if (reorderedTargets.length == 0) {
                logger.debug('first compare, so just push into quene');
                reorderedTargets.push({
                    target,
                    requestTime
                })
            } else {
                // want to re-arrange the target from times small to times large
                let isInserted = false
                for (let i = 0; i < reorderedTargets.length; i++) {
                    if (reorderedTargets[i].requestTime > requestTime) {
                        for (let j = reorderedTargets.length - 1; j >= i; j--) {
                            reorderedTargets[j + 1] = reorderedTargets[j];
                        }
                        reorderedTargets[i] = {
                            target,
                            requestTime
                        }
                        isInserted = true;

                    }
                }
                if (!isInserted) {
                    reorderedTargets.push({
                        target,
                        requestTime
                    })
                }
            }
        })
        reorderedTargets.forEach((target, index) => {
            reorderedTargets[index] = target.target;
        })
        logger.debug('changed tartgets');
        logger.debug(reorderedTargets)
        return Promise.resolve(reorderedTargets)
    }
    static makeProposalResponse(targets, proposalResuls, type) {
        var proposalResponse = []
        for (let targetIndx = 0; targetIndx < targets.length; targetIndx++) {
            let targetUrl = targets[targetIndx].getUrl()
            let response = {
                url: targetUrl
            }
            if (proposalResuls[targetIndx].response) {
                if (type == 'instantiate') {
                    response.response = proposalResuls[targetIndx].response
                    delete response.response.payload
                } else if (type == 'invoke') {
                    response.response = proposalResuls[targetIndx].response.payload.toString()
                }
            } else {
                response.response = proposalResuls[targetIndx].toString()
            }
            console.log(proposalResponse)
            proposalResponse.push(response)
        }

        return proposalResponse


    }
}




module.exports = sender