var fs = require('fs');
var hfc = require('fabric-client');
var path = require('path')
var config = require('../config');
var networkConfigPath = path.resolve(__dirname, '../', config.gateway['networkConfig']);
var outerNetworkconfig = require(networkConfigPath)
var networkConfig = outerNetworkconfig['network-config']
var channelConfig = outerNetworkconfig['channelConfig'];
const ordererAttributeList = ['url', 'server-hostname', 'tls_cacerts'];
var gatewayEventHub = require('../gatewayEventHub');
var myOrgIndex = config.fabric.orgIndex;
var log4js = require('log4js');
var logger = log4js.getLogger('hyUtil/networkConfig');
var Promise = require('bluebird');
// var configgen = require('./configgen')
// network-config operation

var nReviseAttribute = (indexArr, value) => {
    let lastAttr = indexArr.pop()
    let attrNeedToChange = indexArr.reduce((nowObject, indexName) => {
        if (!nowObject[indexName]) {
            return Promise.reject('can not revise un existed attribute :' + indexName)
        }
        return nowObject[indexName]
    }, networkConfig)
    if (!attrNeedToChange[lastAttr]) {
        return Promise.reject('can not revise un existed attribute :' + lastAttr)
    }
    attrNeedToChange[lastAttr] = value;
    saveNetworkConfigToFs();
    return Promise.resolve();

}
var getOrgByMspID = (mspID) => {
    logger.debug('<==== getOrgByMspID start =====>');
    logger.debug('find mspID ' + mspID);
    for (var orgIndex in networkConfig) {
        if (networkConfig[orgIndex].mspid && networkConfig[orgIndex].mspid == mspID) {
            logger.debug('fined orgIndex is ' + orgIndex)
            logger.debug('<==== getOrgByMspID f =====>');
            return networkConfig[orgIndex]
        }
    }
    return null
}
var getOrgIndexByMspID = (mspID) => {
    logger.debug('<==== getOrgIndexByMspID start =====>');
    logger.debug('find mspID ' + mspID);
    for (var orgIndex in networkConfig) {
        if (networkConfig[orgIndex].mspid && networkConfig[orgIndex].mspid == mspID) {
            logger.debug('fined orgIndex is ' + orgIndex)
            logger.debug('<==== getOrgIndexByMspID f =====>');
            return orgIndex
        }
    }
    return null
}
module.exports.getOrgIndexByMspID = getOrgIndexByMspID;
module.exports.getOrgByMspID = getOrgByMspID
module.exports.getPeerArrayByMspID = (mspID) => {
    let peerNameArray = [];
    logger.debug('<==== getPeerArrayByMspID start =====>')
    let org = getOrgByMspID(mspID)
    if (org) {
        for (var peerName in org) {
            if (peerName.indexOf('peer') > -1) {
                peerNameArray.push(peerName)
            }
        }
    }

    logger.debug('peerNameArray')
    logger.debug(peerNameArray)
    logger.debug('<==== getPeerArrayByMspID f =====>')
    return peerNameArray
}
module.exports.nReviseOrderer = (ordererName, attribute, value) => {
    let indexArr = [];
    indexArr.push(ordererName);
    indexArr.push(attribute);

    return nReviseAttribute(indexArr, value).then(() => {
        return Promise.resolve()
        gatewayEventHub.emit('n-orderer-revise', ordererName, attribute);
    });
}
module.exports.nReviseOrg = (orgIndex, attribute, value) => {
    if (attribute == 'mspid') {
        return Promise.reject('Ammend mspid is illegaled.');
    }
    let indexArr = [];
    indexArr.push(orgIndex);
    indexArr.push(attribute);
    return nReviseAttribute(indexArr, value).then(() => {
        gatewayEventHub.emit('n-org-revise', {
            orgIndex,
            attribute
        })
        return Promise.resolve();
    })


}
module.exports.nRevisePeer = (orgIndex, peerName, attribute, value) => {
    logger.debug('<==== nRevisePeer start ======>');
    let indexArr = [];
    indexArr.push(orgIndex);
    indexArr.push(peerName);
    indexArr.push(attribute);
    return nReviseAttribute(indexArr, value).then(() => {
        logger.debug('emit n-peer-revise event')
        gatewayEventHub.emit('n-peer-revise', {
            orgIndex,
            peerName,
            attribute
        })
        return Promise.resolve()
    })


}
module.exports.nAddOrg = (orgIndex, gatewayAddress, name, mspid, ca, peers, admin) => {
    let errMsg = "";
    if (!orgIndex) {
        return Promise.reject('missing orgIndex');
    }
    if (!name) {
        return Promise.reject('missing name');

    }
    if (!mspid) {
        return Promise.reject('missing MSP ID');

    }
    if (!ca) {
        return Promise.reject('missing ca url');

    }
    if (peers) {
        if (typeof peers != 'object') {
            return Promise.reject('peers must be a object type');

        }
        for (let peerName in peers) {
            let peer = peers[peerName];
            if (!peer.requests) {
                return Promise.reject('peer missing request url');

            }
            if (!peer.events) {
                return Promise.reject('peer missing events url');
            }
            if (!peer['server-hostname']) {
                return Promise.reject('peer missing server-hostname');
            }
            if (!peer['tls_cacerts']) {
                return Promise.reject('peer missing tls_cacerts');
            }
        }
    }
    if (!admin) {
        return Promise.reject('missing admin');

    }
    if (!admin.key) {
        return Promise.reject('missing admin key');

    }
    if (!admin.cert) {
        return Promise.reject('missing admin cert');
    }
    if (networkConfig[orgIndex]) {
        return Promise.reject(`${orgIndex} have exist`);
    }
    let newOrg = {
        gatewayAddress,
        name,
        mspid,
        ca,
        admin
    }
    if (peers) {
        for (let peerName in peers) {
            newOrg[peerName] = peers[peerName];
        }
    }
    networkConfig[orgIndex] = newOrg;
    saveNetworkConfigToFs();
    return Promise.resolve();
}

/**
 * @param {string} orgIndex : The orgIndex of peer you want to add;
 * @param {Object} peers : The peers Object, content four attribute [requests, events, server-hostname,tls_cacerts];
 * {
 *     peer1:{
 *      "requests": "grpcs://localhost:7056",
 *      "events": "grpcs://localhost:7058",
 *      "server-hostname": "peer1.org1.example.com",
 *       "tls_cacerts": "../artifacts/crypto-config/peerOrganizations/org1.example.com/peers/peer1.org1.example.com/tls/ca.crt"
 *      }
 *      peer2:{
 *          ...
 *      }
 *  }
 *
 *
 *
 */

module.exports.nAddPeers = (orgIndex, peers) => {
    if (!orgIndex) {
        return Promise.reject('missing orgIndex');
    }
    if (typeof peers != 'object') {
        return Promise.reject('peers must be a object type');

    }
    for (let peerName in peers) {
        let peer = peers[peerName];
        if (!peer.requests) {
            return Promise.reject('peer missing request url');

        }
        if (!peer.events) {
            return Promise.reject('peer missing events url');
        }
        if (!peer['server-hostname']) {
            return Promise.reject('peer missing server-hostname');
        }
        if (!peer['tls_cacerts']) {
            return Promise.reject('peer missing tls_cacerts');
        }
    }
    if (!networkConfig[orgIndex]) {
        return Promise.reject(`${orgIndex} not exist`);
    }
    if (peers) {
        for (let peerName in peers) {
            networkConfig[orgIndex][peerName] = peers[peerName];
        }
    }
    saveNetworkConfigToFs();
    gatewayEventHub.emit('n-peer-add', orgIndex, peerName)
    return Promise.resolve();
}
module.exports.nAddOrderer = (ordererName, url, serverHostName, tlsCacerts) => {
    let errMsg = ""
    if (!ordererName) {
        errMsg += "Missing ordererName";
    }
    if (!url) {
        errMsg += "Missing orderer url";
    }
    if (!serverHostName) {
        errMsg += "Missing orderer serverHostName";
    }
    if (!tlsCacerts) {
        errMsg += "Missing ordererName";
    }
    if (networkConfig[ordererName]) {
        errMsg += ordererName + 'have existed'
    }
    if (errMsg != "") {
        return Promise.reject('NaddOrderer :' + errMsg);
    }
    networkConfig[ordererName] = {
        url,
        "server-hostname": serverHostName,
        "tls_cacerts": tlsCacerts
    }
    saveNetworkConfigToFs();
    return Promise.resolve();

}
/**
 * @param {string} orgIndex: The orgIndex of peers you want to remove;
 * @param {Array} peerNames: The peerName array you want to remove ex:["peer1","peer2"];
 *
 */
module.exports.nRemovePeers = (orgIndex, peerNames) => {
    if (!Array.isArray(peerNames)) {
        peerNames = [peerNames]
    }
    logger.debug('<=== nRemovePeers start ====>')
    return new Promise((rs, rj) => {
        let promiseArr = [];
        for (let peerName of peerNames) {
            if (!networkConfig[orgIndex] || !networkConfig[orgIndex][peerName]) {
                throw (`Org ${orgIndex} or peer Name ${peerName} did not exist`);
            }
            logger.debug(`check ${peerNames} did exist in org, start to remove`);
            promiseArr.push(nRemovePeer(orgIndex, peerName));
        }
        saveNetworkConfigToFs();
        Promise.all(promiseArr).then(() => {
            rs();
        }).catch((e) => {
            rj(e)
        })
    })


}
var nRemovePeer = (orgIndex, peerName) => {
    logger.debug('<=== nRemovePeer start ====>')
    return new Promise((rs, rj) => {
        let promiseArr = [];
        logger.debug(`check if any channel have  peer ${peerName} in it`)
        for (let channelName in channelConfig) {
            logger.debug(`check channel ${channelName}`)
            let channelInfo = channelConfig[channelName];
            let allPeers = channelInfo.peers;
            if (allPeers[orgIndex]) {
                orgPeers = allPeers[orgIndex];
                for (let peerInfo of orgPeers) {
                    if (peerName == peerInfo.name) {
                        logger.debug(` channel ${channelName} have peer ${peerName} in it, trigger cRemovePeerInChannel remove from channel config`);

                        promiseArr.push(cRemovePeerInChannel(channelName, orgIndex, peerName));
                    }
                }
            }
        }

        Promise.all(promiseArr).then(() => {
            logger.debug(`emit n-remove-peer event ${orgIndex} ${peerName}`)
            gatewayEventHub.emit('n-remove-peer', orgIndex, peerName);
            logger.debug(`network config for ${orgIndex}`);
            logger.debug(networkConfig[orgIndex]);
            logger.debug(`delete peer ${peerName}`);
            delete networkConfig[orgIndex][peerName];
            logger.debug('delete network config for peer success');
            logger.debug(networkConfig[orgIndex]);
            saveNetworkConfigToFs();
            logger.debug('delete a peers in peerNames finish trigger resolve');
            rs();
        }).catch((e) => {
            rj(e);
        })

    })


}
module.exports.nRemoveOrgs = (orgIndexs) => {
    if (!Array.isArray(orgIndexs)) {
        orgIndexs = [orgIndexs];
    }
    let promiseArr = [];
    for (let orgIndex of orgIndexs) {
        logger.debug('networkConfig');
        logger.debug(JSON.stringify(networkConfig))
        if (!networkConfig[orgIndex]) {
            return Promise.reject(`org ${orgIndex} did not exist`);
        } else {
            promiseArr.push(nRemoveOrg(orgIndex))
        }
    }
    return Promise.all(promiseArr).then(() => {

        saveNetworkConfigToFs();
        return Promise.resolve()
    });
}
var nRemoveOrg = (orgIndex) => {
    if (orgIndex == myOrgIndex) {
        return Promise.reject('can not remove self from network config');
    }
    let promiseArr = [];

    for (let channelName in channelConfig) {
        let channelInfo = channelConfig[channelName];
        let allPeers = channelInfo.peers;
        if (allPeers[orgIndex]) {
            promiseArr.push(cRemoveOrgInChannel(channelName, orgIndex))
        }
    }
    return Promise.all(promiseArr).then(() => {
        gatewayEventHub.emit('n-remove-org', {
            orgIndex
        })
        delete networkConfig[orgIndex];
        saveNetworkConfigToFs()

    })
}
/**
 *  @param {array} ordererNames : An array of ordererNames you want to remove;
 */
module.exports.nRemoveOrderers = (ordererNames) => {
    if (!Array.isArray(ordererNames)) {
        ordererNames = [ordererNames];
    }
    let promiseArr = [];
    for (let ordererName of ordererNames) {
        if (!networkConfig[ordererName]) {
            return Promise.reject(`orderer ${ordererName} did not exist`);
        }
        promiseArr.push(nRemoveOrderer(ordererName))
    }
    // ordererNames.forEach((orderereName) => {

    // })
    return Promise.all(promiseArr);
}
var nRemoveOrderer = (ordererName) => {
    let promiseArr = [];
    for (let channelName in channelConfig) {
        let channelInfo = channelConfig[channelName];
        let channelOrderers = channelInfo.orderers;
        channelOrderers.forEach((orderer) => {
            if (orderer == ordererName) {
                promiseArr.push(cRemoveOrdererInChannel(channelName, ordererName));
            }
        })
    }
    return Promise.all(promiseArr).then(() => {
        gatewayEventHub.emit('n-remove-orderer', {
            ordererName
        });
        delete networkConfig[ordererName];
        saveNetworkConfigToFs();
        return Promise.resolve()

    })
}


module.exports.cAddChannel = (channelName, ordererNameArr, orgObjArr) => {
    if (channelConfig[channelName]) {
        return Promise.reject('channel already existed, please use revise channel api to change config');
    } else {
        channelConfig[channelName] = {};
        channelConfig[channelName].orderers = [];
        channelConfig[channelName].peers = {};
    }
    ordererNameArr = ordererNameArr || [];
    orgObjArr = orgObjArr || [];
    let ordererObjArr = []
    for (let ordererName of ordererNameArr) {
        ordererObjArr.push({
            name: ordererName,
            method: 'add'
        })
    }

    return cReviseChannelOrderer(channelName, ordererObjArr).then(() => {
        let promiseArr = [];
        for (let orgObj of orgObjArr) {
            let p = cReviseOrgInChannel(channelName, orgObj.orgIndex, orgObj.peerObjArr);
            promiseArr.push(p)
        }
        return Promise.all(promiseArr);
    }).then(() => {
        logger.debug(`emit c-channel-add for ${channelName}`)
        gatewayEventHub.emit('c-channel-add', {
            channelName
        });
        return Promise.resolve();
    })


}

var cRemoveOrgInChannel = (channelName, orgIndex) => {
    if (!channelConfig[channelName]) {
        return Promise.reject(`channel ${channelName} did not exist`);
    }
    let channelInfo = channelConfig[channelName];
    let allPeers = channelInfo.peers;
    if (!allPeers[orgIndex]) {
        return Promise.reject(`org ${orgIndex} did not exist in ${channelName}`);
    }
    delete allPeers[orgIndex];
    gatewayEventHub.emit('c-channel-revise', channelName);
    return Promise.resolve();

}
module.exports.cRemoveOrgInChannel = cRemoveOrgInChannel;
//channel config operation
//{
//     orgIndex: "org1",
//     peerObjArr:[{name:peer1,type:e}]
// }
module.exports.cAddOrgInChannel = (channelName, orgObj) => {
    if (!channelConfig[channelName]) {
        return Promise.reject(`channel ${channelName} did not exist`);
    }
    let channelInfo = channelConfig[channelName];
    if (channelInfo.peers[orgObj.orgIndex]) {
        return Promise.reject(`org ${orgObj.orgIndex} already exist`);
    }
    orgObj.peerObjArr = orgObj.peerObjArr || []
    return cReviseOrgInChannel(channelName, orgObj.orgIndex, orgObj.peerObjArr).then(() => {
        if (myOrgIndex == orgObj.orgIndex) {

            gatewayEventHub.emit('c-channel-revise', channelName);
        }
        return Promise.resolve();
    })


}
module.exports.cAddPeerInChannel = (channelName, orgIndex, peerName, peerType) => {
    if (!channelConfig[channelName]) {
        return Promise.reject(`channel ${channelName} did not existed`);
    } else {
        channelInfo = channelConfig[channelName];
        let orgInfo = channelInfo.peers[orgIndex];
        if (!orgInfo) {
            return Promise.reject(`channel ${channelName} did not exist ${orgIndex} please use add org api first`);
        }
        let existedPeer = false;
        for (let peerObj of orgInfo) {
            if (peerObj.name == peerName) {
                return Promise.reject(`channel ${channelName},peer ${peerName}  of ${orgIndex} already existed`);
            }
        }
        logger.debug(`orgIndex ${orgIndex} myOrgIndex ${myOrgIndex}`)
        if (orgIndex == myOrgIndex) {
            logger.debug('emit c-channel-revise event for :' + channelName);

            gatewayEventHub.emit('c-channel-revise', channelName);
        }

        return cReviseOrgInChannel(channelName, orgIndex, [{
            name: peerName,
            type: peerType,
            method: 'add'
        }])
    }
}

var cRemovePeerInChannel = (channelName, orgIndex, peerName) => {
    logger.debug('<===== cRemovePeerInChannel start =====>')
    if (!channelConfig[channelName]) {
        return Promise.reject(`channel ${channelName} did not existed`);
    }
    logger.debug(`get channel config of ${channelName}`);
    channelInfo = channelConfig[channelName];
    logger.debug(`${JSON.stringify(channelInfo)}`);
    let orgInfo = channelInfo.peers[orgIndex];
    if (!orgInfo) {
        return Promise.reject(`channel ${channelName} did not exist ${orgIndex} please use add org api first`);
    }
    logger.debug(`get org ${orgIndex} in channel ${channelName}`);
    logger.debug(orgInfo)
    let existedPeer;
    logger.debug(existedPeer)

    for (let peerObj of orgInfo) {
        logger.debug(`compare ${JSON.stringify(peerObj)} with ${peerName}`)
        if (peerObj.name == peerName) {
            existedPeer = true;
        }
    }
    logger.debug(`check if peer ${peerName} did exist in channel ${channelName}`);
    if (!existedPeer) {
        return Promise.reject(`${peerName} of ${orgIndex} did not exist`);
    }

    logger.debug('remove peer from channel with cReviseOrgInChannel function');
    return cReviseOrgInChannel(channelName, orgIndex, [{
        name: peerName,
        method: 'delete'
    }]).then(() => {
        if (orgIndex == myOrgIndex) {
            logger.debug(`emit c-channel-revise for ${channelName}`);

            gatewayEventHub.emit('c-channel-revise', channelName);
        }
        return Promise.resolve()
    })



}
module.exports.cRemovePeerInChannel = cRemovePeerInChannel;

module.exports.cChangePeerTypeChannel = (channelName, orgIndex, peerName, peerType) => {
    if (!channelConfig[channelName]) {
        return Promise.reject(`channel ${channelName} did not existed`);
    }
    channelInfo = channelConfig[channelName];
    let orgInfo = channelInfo.peers[orgIndex];
    if (!orgInfo) {
        return Promise.reject(`channel ${channelName} did not exist ${orgIndex} please use add org api first`);
    }
    let existedPeer = false;
    orgInfo.forEach((peerObj) => {
        if (peerObj.name == peerName) {
            existedPeer = true;
        }
    })
    if (!existedPeer) {
        return Promise.reject(`${peerName} of ${orgIndex} did not exist`);
    }
    let promiseArr = []
    let p1 = cReviseOrgInChannel(channelName, orgIndex, [{
        name: peerName,
        method: 'delete'
    }])
    let p2 = cReviseOrgInChannel(channelName, orgIndex, [{
        name: peerName,
        type: peerType,
        method: 'add'
    }])

    promiseArr.push(p1, p2)
    return Promise.all(promiseArr);
}
module.exports.cAddOrdererInChannel = (channelName, ordererName) => {
    if (!channelConfig[channelName]) {
        return Promise.reject(`channel ${channelName} did not existed`);
    }
    if (!networkConfig[ordererName]) {
        return Promise.reject(`orderer ${ordererName} did not existed in network-config`);
    }
    channelInfo = channelConfig[channelName];
    orderers = channelInfo.orderers;
    let exist = false;

    // orderers.forEach((oOrderName) => {
    //     if (ordererName == oOrderName) {
    //         return Promise.reject(`orderer ${ordererName} have existed`);
    //     }
    // })
    for (let oOrderName of orderers) {
        if (ordererName == oOrderName) {
            return Promise.reject(`orderer ${ordererName} have existed`);
        }
    }
    return cReviseChannelOrderer(channelName, [{
        name: ordererName,
        method: 'add'
    }]).then(() => {
        gatewayEventHub.emit('c-channel-orderer-add', channelName, ordererName);
        return 'ok'
    })
}
var cRemoveOrdererInChannel = (channelName, ordererName) => {
    if (!channelConfig[channelName]) {
        return Promise.reject(`channel ${channelName} did not existed`);
    }
    if (!networkConfig[ordererName]) {
        return Promise.reject(`orderer ${ordererName} did not existed in network-config`);
    }
    channelInfo = channelConfig[channelName];
    orderers = channelInfo.orderers;
    let exist = false;
    for (let oOrderName of orderers) {
        if (ordererName == oOrderName) {
            exist = true;
        }
    }
    if (!exist) {
        return Promise.reject(`orderer ${orderName} did not exist at channel ${channelName}`);
    }
    return cReviseChannelOrderer(channelName, [{
        name: ordererName,
        method: 'delete'
    }]).then(() => {
        gatewayEventHub.emit('c-channel-orderer-remove', channelName, ordererName);
        return Promise.resolve('ok')
    })
}
module.exports.cRemoveOrdererInChannel = cRemoveOrdererInChannel;
// revise the channel config of a channel config, if if peerObj, will cover the original one;
//{
//     name:"peer1",
//     type:"e",
//     method: 'delete/add(default: add)'
// }
var cReviseOrgInChannel = (channelName, orgIndex, peerObjArr) => {
    logger.debug('<==== cReviseOrgInChannel ====>');
    logger.debug(`channelName ${channelName}`);
    logger.debug(`orgIndex ${orgIndex}`);
    logger.debug(`peerObjArr ${JSON.stringify(peerObjArr)}`);


    let channelObj = channelConfig[channelName];
    if (!channelObj) {
        return Promise.reject(`channelName ${channelName} of channel config did not exist`);
    }
    if (!channelObj.peers[orgIndex]) {
        channelObj.peers[orgIndex] = [];
    }
    var newOrgPeerArray = []
    //check if the peerName have existed, if true, just replace it,
    //if not, push a new peer obj info into channel Peer array
    channelObj.peers[orgIndex].forEach((peer) => {
        var deleted = false;
        peerObjArr.forEach((peerObj) => {
            if (peerObj.name == peer.name && peerObj.method == 'delete') {
                deleted = true;
            }
        })
        if (!deleted) {
            newOrgPeerArray.push(peer);
        }
    })
    peerObjArr.forEach((peerObj) => {
        let duplicate = false
        newOrgPeerArray.forEach((peer, index) => {
            if (peer.name == peerObj.name) {
                delete peerObj.method
                channelObj.peers[orgIndex][index] = peerObj;
                duplicate = true;
            }
        })
        if (duplicate == false && peerObj.method != 'delete') {
            delete peerObj.method
            newOrgPeerArray.push(peerObj);
        }
    })
    logger.debug(`new orgObje ${JSON.stringify(newOrgPeerArray)}`);
    channelConfig[channelName].peers[orgIndex] = newOrgPeerArray;
    saveNetworkConfigToFs();
    return Promise.resolve();

}
// {
//     name:'orderers',
//     method: (delete/add)
// }
var cReviseChannelOrderer = (channelName, ordererObjs) => {
    logger.debug('<==== cReviseChannelOrderer ====>');
    let channelObj = channelConfig[channelName];
    let ordererArr = channelObj.orderers;
    let newOrderers = [];
    ordererArr.forEach((orderer) => {
        var deleted = false;
        ordererObjs.forEach((ordererObj) => {
            if (ordererObj.name == orderer && ordererObj.method == 'delete') {
                deleted = true;
            }
        })
        if (!deleted) {
            newOrderers.push(orderer);
        }
    })
    ordererObjs.forEach((ordereObj) => {
        let existed = false;
        newOrderers.forEach((orderer) => {
            if (orderer == ordereObj.name) {
                existed == true;
            }
        })
        if (!existed && ordereObj.method != 'delete') {
            newOrderers.push(ordereObj.name);
        }

    })
    channelConfig[channelName].orderers = newOrderers;
    logger.debug(`${channelName} new orderer array ${JSON.stringify(newOrderers)}`)
    saveNetworkConfigToFs();
    return Promise.resolve();


}
module.exports.getNetworkConfig = () => {
    return networkConfig
}
module.exports.getChannelConfig = () => {
    return channelConfig
}

saveNetworkConfigToFs = () => {
    var networkConfigAll = {
        "network-config": networkConfig,
        channelConfig: channelConfig
    }
    fs.writeFileSync(networkConfigPath, JSON.stringify(networkConfigAll, null, 2));
}