var hyUtil = require('../../hyperledgerUtil')
var constants = require('../../constants');
var path = require('path')
var fs = require('fs')
var response = require('../../API/response')
var log4js = require('log4js');
var logger = log4js.getLogger('swagger/networkConfig');
var networkConfig = hyUtil.networkConfig;
var config = require('../../config');
var myOrgName = config.fabric.orgName
module.exports.nAddOrg = (req, res, next) => {
    logger.debug('<======  nAddOrg start ======> ')
    var body = req.swagger.params.request.value
    if (req.gErr) {
        response.returnFailed(gErr, res)
    }
    let userObj = req.gUser;
    let {orgName, gatewayAddress, name, mspid, ca, peers, admin} = body;
    networkConfig.nAddOrg(orgName, gatewayAddress, name, mspid, ca, peers, admin).then(() => {
        response.returnSuccess(`add ${orgName} success`, res);
    }).catch((err) => {
        logger.warn('catch err')
        logger.debug(err)
        response.returnFailed(err, res)
    })
}

module.exports.nAddOrderer = (req, res, next) => {
    logger.debug('<======  nAddOrderer start ======> ')
    var body = req.swagger.params.request.value
    if (req.gErr) {
        response.returnFailed(gErr, res)
    }
    let userObj = req.gUser;
    let {ordererName, url, serverHostName, tlsCacerts} = body;
    networkConfig.nAddOrderer(ordererName, url, serverHostName, tlsCacerts).then(() => {
        response.returnSuccess(`Add Orderer ${ordererName} success`, res);
    }).catch((err) => {
        logger.warn('catch err')
        logger.debug(err)
        response.returnFailed(err, res)
    })
}
module.exports.nRemoveOrgs = (req, res, next) => {
    logger.debug('<======  nRemoveOrgs start ======> ')
    var body = req.swagger.params.request.value
    if (req.gErr) {
        response.returnFailed(gErr, res)
    }
    let userObj = req.gUser;
    let {orgNames} = body;
    networkConfig.nRemoveOrgs(orgNames).then(() => {
        response.returnSuccess(`remove ${orgNames} success`, res);
    }).catch((err) => {
        logger.warn('catch err')
        logger.debug(err)
        response.returnFailed(err, res)
    })
}

module.exports.nAddPeers = (req, res, next) => {
    logger.debug('<======  nAddPeers start ======> ')
    var body = req.swagger.params.request.value
    if (req.gErr) {
        response.returnFailed(gErr, res)
    }
    let userObj = req.gUser;
    let {orgName, peers} = body;
    networkConfig.nAddPeers(orgName, peers).then(() => {
        response.returnSuccess(`add peers to ${orgName} success`, res);
    }).catch((err) => {
        logger.warn('catch err')
        logger.debug(err)
        response.returnFailed(err, res)
    })
}

module.exports.cRemoveOrgInChannel = (req, res, next) => {
    logger.debug('<======  cRemoveOrgInChannel start ======> ')
    var body = req.swagger.params.request.value
    if (req.gErr) {
        response.returnFailed(gErr, res)
    }
    let userObj = req.gUser;
    let {channelName, orgName} = body;
    networkConfig.cRemoveOrgInChannel(channelName, orgName).then((result) => {

        response.returnSuccess(`remove ${orgName} from channel ${channelName} success`, res);
    }).catch((err) => {
        logger.warn('catch err')
        logger.debug(err)
        response.returnFailed(err, res)
    })
}

module.exports.cAddOrdererInChannel = (req, res, next) => {
    logger.debug('<======  cAddOrdererInChannel start ======> ')
    var body = req.swagger.params.request.value
    if (req.gErr) {
        response.returnFailed(gErr, res)
    }
    let userObj = req.gUser;
    let {channelName, ordererName} = body;
    networkConfig.cAddOrdererInChannel(channelName, ordererName).then((result) => {

        response.returnSuccess(`Add orderre ${ordererName} in channel ${channelName} success`, res);
    }).catch((err) => {
        logger.warn('catch err')
        logger.debug(err)
        response.returnFailed(err, res)
    })
}
module.exports.cRemoveOrdererInChannel = (req, res, next) => {
    logger.debug('<======  cRemoveOrdererInChannel start ======> ')
    var body = req.swagger.params.request.value
    if (req.gErr) {
        response.returnFailed(gErr, res)
    }
    let userObj = req.gUser;
    let {channelName, ordererName} = body;
    networkConfig.cRemoveOrdererInChannel(channelName, ordererName).then((result) => {

        response.returnSuccess(`remove orderre ${ordererName} from channel ${channelName} success`, res);
    }).catch((err) => {
        logger.warn('catch err')
        logger.debug(err)
        response.returnFailed(err, res)
    })
}
module.exports.cAddPeerInChannel = (req, res, next) => {
    logger.debug('<======  cAddPeerInChannel start ======> ')
    var body = req.swagger.params.request.value
    if (req.gErr) {
        response.returnFailed(gErr, res)
    }
    let userObj = req.gUser;
    let {channelName, peerName, orgName, type} = body;
    networkConfig.cAddPeerInChannel(channelName, orgName, peerName, type).then(() => {
        logger.debug('auto try to trigger join channel method to join peer into channel')
        return hyUtil.channelAPI.joinChannel(channelName, userObj, peerName).then((result) => {
            return ('Change channel config success, auto join channel success');
        }).catch((e) => {
            logger.warn(e)
            logger.debug('fail auto join the channel, may caused by channel unbuilded or peer already join the channel')
            return ('Change channel config success, auto join channel failed');
        })
    }).then((result) => {
        response.returnSuccess(result, res);
    }).catch((err) => {
        logger.warn('catch err')
        logger.debug(err)
        response.returnFailed(err, res)
    })
}
module.exports.cAddOrgInChannel = (req, res, next) => {
    logger.debug('<======  cAddPeerInChannel start ======> ')
    var body = req.swagger.params.request.value
    if (req.gErr) {
        response.returnFailed(gErr, res)
    }
    let userObj = req.gUser;
    let {channelName, orgName, peerObjArr} = body;
    let orgObj = {
        orgName,
        peerObjArr: peerObjArr
    };
    networkConfig.cAddOrgInChannel(channelName, orgObj).then(() => {
        if (orgObj.orgName == myOrgName) {
            logger.debug('auto try to trigger join channel method to join peer into channel')
            return hyUtil.channelAPI.joinChannel(channelName, userObj).then((result) => {
                return ('Change channel config success, auto join channel success');
            }).catch((e) => {
                logger.warn(e)
                logger.debug('fail auto join the channel, may caused by channel unbuilded or peer already join the channel')
                return ('Change channel config success, auto join channel failed');
            })
        } else {
            return ('Change channel config success')
        }

    }).then((result) => {
        response.returnSuccess(result, res);
    }).catch((err) => {
        logger.warn('catch err')
        logger.debug(err)
        response.returnFailed(err, res)
    })
}

module.exports.nRemovePeers = (req, res, next) => {
    logger.debug('<======  nRemovePeers start ======> ')
    var body = req.swagger.params.request.value
    if (req.gErr) {
        response.returnFailed(gErr, res)
    }
    let userObj = req.gUser;
    let {peerNames, orgName} = body;
    networkConfig.nRemovePeers(orgName, peerNames).then(() => {
        logger.debug('remove peer from network-config success');
        return (`remove peers ${peerNames} of ${orgName} from network-config success`)
    }).then((result) => {
        response.returnSuccess(result, res);
    }).catch((err) => {
        logger.warn('catch err')
        logger.error(err)
        response.returnFailed(err, res)
    })
}

module.exports.cRemovePeer = (req, res, next) => {
    logger.debug('<======  cRemovePeers start ======> ')
    var body = req.swagger.params.request.value
    if (req.gErr) {
        response.returnFailed(gErr, res)
    }
    let userObj = req.gUser;
    let {channelName, peerName, orgName} = body;
    networkConfig.cRemovePeerInChannel(channelName, orgName, peerName).then(() => {
        logger.debug('remove peer from channel config success');
        return (`remove peer ${peerName} of ${orgName} from channel ${channelName} success`)
    }).then((result) => {
        response.returnSuccess(result, res);
    }).catch((err) => {
        logger.warn('catch err')
        logger.error(err)
        response.returnFailed(err, res)
    })
}

module.exports.nRevisePeer = (req, res, next) => {
    logger.debug('<======  nRevisePeer start ======> ')
    var body = req.swagger.params.request.value
    if (req.gErr) {
        response.returnFailed(gErr, res)
    }
    let userObj = req.gUser;
    let {orgName, peerName, attribute, value} = body;
    networkConfig.nRevisePeer(orgName, peerName, attribute, value).then(() => {
        logger.debug(`revise peer ${peerName} ${attribute} to ${value} sucess`);
        return (`revise peer ${peerName} ${attribute} to ${value} sucess`);
    }).then((result) => {
        response.returnSuccess(result, res);
    }).catch((err) => {
        logger.warn('catch err')
        logger.error(err)
        response.returnFailed(err, res)
    })
}

module.exports.nReviseOrg = (req, res, next) => {
    logger.debug('<======  nReviseOrg start ======> ')
    var body = req.swagger.params.request.value
    if (req.gErr) {
        response.returnFailed(gErr, res)
    }
    let userObj = req.gUser;
    let {orgName, attribute, value} = body;
    networkConfig.nReviseOrg(orgName, attribute, value).then(() => {
        logger.debug(`revise org ${orgName} ${attribute} to ${value} sucess`);
        return (`revise org ${orgName} ${attribute} to ${value} sucess`);
    }).then((result) => {
        response.returnSuccess(result, res);
    }).catch((err) => {
        logger.warn('catch err')
        logger.error(err)
        response.returnFailed(err, res)
    })
}


module.exports.nReviseOrderer = (req, res, next) => {
    logger.debug('<======  nReviseOrg start ======> ')
    var body = req.swagger.params.request.value
    if (req.gErr) {
        response.returnFailed(gErr, res)
    }
    let userObj = req.gUser;
    let {ordererName, attribute, value} = body;
    networkConfig.nReviseOrderer(ordererName, attribute, value).then(() => {
        logger.debug(`revise org ${orgName} ${attribute} to ${value} sucess`);
        return (`revise org ${orgName} ${attribute} to ${value} sucess`);
    }).then((result) => {
        response.returnSuccess(result, res);
    }).catch((err) => {
        logger.warn('catch err')
        logger.error(err)
        response.returnFailed(err, res)
    })
}

module.exports.nRemoveOrderers = (req, res, next) => {
    logger.debug('<======  nRemoveOrderers start ======> ')
    var body = req.swagger.params.request.value
    if (req.gErr) {
        response.returnFailed(gErr, res)
    }
    let userObj = req.gUser;
    let {ordererName} = body;
    networkConfig.nRemoveOrderers(ordererName).then(() => {
        logger.debug(`revise orderer ${ordererName} sucess`);
        return (`revise orderer ${ordererName} sucess`);
    }).then((result) => {
        response.returnSuccess(result, res);
    }).catch((err) => {
        logger.warn('catch err')
        logger.error(err)
        response.returnFailed(err, res)
    })

}


module.exports.cAddChannel = (req, res, next) => {
    logger.debug('<======  cAddChannel start ======> ')
    var body = req.swagger.params.request.value
    if (req.gErr) {
        response.returnFailed(gErr, res)
    }
    let userObj = req.gUser;
    let {channelName, ordererNameArr, orgObjArr} = body;
    networkConfig.cAddChannel(channelName, ordererNameArr, orgObjArr).then(() => {
        logger.debug(`add channel ${channelName} sucess`);
        return (`add channel ${channelName} sucess`);
    }).then((result) => {
        response.returnSuccess(result, res);
    }).catch((err) => {
        logger.warn('catch err')
        logger.error(err)
        response.returnFailed(err, res)
    })
}
module.exports.cChangePeerTypeChannel = (req, res, next) => {
    logger.debug('<======  cChangePeerTypeChannel start ======> ')
    var body = req.swagger.params.request.value
    if (req.gErr) {
        response.returnFailed(gErr, res)
    }
    let userObj = req.gUser;
    let {channelName, orgName, peerName, peerType} = body;
    networkConfig.cChangePeerTypeChannel(channelName, orgName, peerName, peerType).then(() => {
        logger.debug(`Change PeerType for ${peerName} at Channel ${channelName} sucess`);
        return (`Change PeerType for ${peerName} at Channel ${channelName} sucess`);
    }).then((result) => {
        response.returnSuccess(result, res);
    }).catch((err) => {
        logger.warn('catch err')
        logger.error(err)
        response.returnFailed(err, res)
    })
}