var hyperUtil = require('../hyperledgerUtil')
var users = hyperUtil.user

var log4js = require('log4js');
var logger = log4js.getLogger('monitor/peer');
var config = require('../config')
var Promise = require('bluebird')
var channel = require('./channel')
var DBs = require('../Db')
var peerMethod = DBs.peerMethod
logger.setLevel(config.gateway.logLevel);
var renewInterval = 2000
var peer = class {
    constructor(peerName, url, io) {
        this.orgAdmin = users.getOrgAdmin()
        this.peerName = peerName;
        this.orgIndex = config.fabric.orgIndex;
        this.peerAlive = true;
        this.peerInfo = {
            peerName: peerName,
            url: url,
            installedChaincodes: [],
            channelNames: []
        }
        this.needEmit = false;
        this.blockEventNumber = null
        this.channelObjs = {}
        this.io = io;
        this.intervalHandler = null;
    }
    //return function, for monitor query protocool
    returnPeerInfo() {
        if (this.peerAlive) {
            return Promise.resolve(this.peerInfo)
        } else {
            return Promise.reject('Peer disconnected')
        }
    }
    //return function, for monitor query protocool
    returnChannelObj(channelName) {
        if (this.channelObjs) {
            if (this.channelObjs[channelName]) {
                return this.channelObjs[channelName]
            }
        }
        return Promise.reject('ChannelName not found')
    }

    //refresh inner channelObje
    refreshChannelObj() {
        var self = this
        this.peerInfo.channelNames.forEach(function(channelName) {
            if (!self.channelObjs.hasOwnProperty(channelName)) {
                logger.info('new a channel object ' + channelName)
                self.channelObjs[channelName] = new channel(self.peerName, channelName, this.io)
                self.channelObjs[channelName].start()
            }
        }, this);
    }
    //internal method refresh inner channelNames
    refreshChannelNames() {
        return hyperUtil.channelAPI.getChannels(this.peerName, this.orgAdmin).then((channelNames) => {
            // logger.debug('get channel Names: ' + channelNames)
            if (this.peerInfo.channelNames.length != channelNames.length) {
                this.peerInfo.channelNames = channelNames
                this.needEmit = true
            }
        })
    }
    //internal method ,refresh installed chaincodes
    refreshInstalledChaincodes() {
        return hyperUtil.channelAPI.getInstalledChaincodes("", this.peerName, "installed", this.orgAdmin).then((res) => {
            // logger.debug('get install chaincodes: ' + JSON.stringify(res))

            if (this.peerInfo.installedChaincodes.length != res.length) {
                this.peerInfo.installedChaincodes = res;
                this.needEmit = true;
            }
        })
    }
    //internal method, update peer info to DB
    updatePeerInfo() {
        // logger.debug('peer: %s update peer info', this.peerName)
        var peer = hyperUtil.helper.cloneJSON(this.peerInfo)
        delete peer._id;
        delete peer.__v;
        peer.installedChaincodes.forEach((chaincode) => {
            delete chaincode._id
        })

        if (this.needEmit) {
            logger.info('emit peer info changed')
            this.io.emit('peerInfoChange', {
                peerName: this.peerName,
                peerInfo: peer
            })
            this.needEmit = false;
        }
        return peerMethod.updatePeer(this.peerName, peer)
    }
    fetchPeerInfo() {
        logger.debug('fetch Peer info from db')
        return peerMethod.getPeer(this.peerName).then((res) => {
            logger.debug('get storage Peer info')
            logger.debug(res)
            if (res) {
                this.peerInfo = res;
            }
            return Promise.resolve()
        })
    }
    //Internal method, register eventhub for the channel object to refresh, intead of getting
    //info periodically
    establishEventHub() {
        hyperUtil.eventHub.registerEvent('blockEvent', this.peerName, this.orgAdmin, (block) => {
            var self = this
            var actionBlock = hyperUtil.helper.processBlockToReadAbleJson(block)
            let channelName = actionBlock[0].channelName
            if (!self.channelObjs.hasOwnProperty(channelName)) {
                logger.info('new a channel object ' + channelName)
                self.channelObjs[channelName] = new channel(self.peerName, channelName, this.io)
                self.channelObjs[channelName].start()
            }
            this.channelObjs[channelName].eventBlock(block)
        })
    }
    //start to refresh peerInfo
    start() {
        var self = this
        this.fetchPeerInfo().then(() => {
            logger.debug('start to loop for renew peer %s info ', self.peerName)
            this.establishEventHub()
            this.intervalHandler = setInterval(() => {
                // check peer status, if peer crashed, don't fetch info from it.
                let res = hyperUtil.peers.getPeerAliveState(self.peerName)
                self.peerAlive = res
                for (var channelName in self.channelObjs) {
                    // set children's state
                    self.channelObjs[channelName].setPeerAlive(res)
                }
                // if peer alived, update peer's info
                if (res) {
                    let promiseArr = [];
                    self.refreshChannelNames().then(() => {
                        self.refreshChannelObj()
                    })
                    self.refreshInstalledChaincodes()
                    self.updatePeerInfo()
                }


            }, config.gateway.monitor.interval)
        })
    }
    delete() {
        clearInterval(this.intervalHandler);
    }
}

module.exports = peer