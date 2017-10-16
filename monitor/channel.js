var hyperUtil = require('../hyperledgerUtil')
var users = hyperUtil.user

var log4js = require('log4js');
var logger = log4js.getLogger('monitor/channel');
var config = require('../config')
var Promise = require('bluebird')
var DBs = require('../Db')
var channelMethod = DBs.channelMethod;
var blockMethod = DBs.blockMethod;
var txMethod = DBs.txMethod
var chaincodeMethod = DBs.chaincodeMethod
logger.setLevel(config.logLevel);
var channel = class {
    constructor(peerName, channelName, io) {
        this.peerName = peerName;
        this.io = io
        this.channelName = channelName;
        this.peerAlive = true;
        this.trackDone = false;
        this.orgAdmin = users.getOrgAdmin()
        this.summary = {
            txNum: 0,
            validNum: 0,
            unValidNum: 0,
            blockNum: 0,
            deployTimes: 0,
            invokeTimes: 0,
            configTimes: 0,
            channelName: channelName,
        }
        this.diffChaincodes=[],
        this.blockNumberArray=[]
        this.currentHeight = 0;
        this.chaincodes = {};
    }

    //method for monitor query
    returnLastTxs(lastNumber) {
        return new Promise((rs, rj) => {
            var txs = []
            let promiseCountArr = []
            for (let i = 0; i < lastNumber; i++) {
                promiseCountArr[i] = i
            }
            logger.debug(promiseCountArr)
            // Get block info from DB iterativly until lastNumber was fullfilled.
            return Promise.each(promiseCountArr, (counter) => {
                logger.debug(counter)
                logger.debug(this.summary.blockNum)
                logger.debug('get block ' + (this.summary.blockNum - counter - 1))
                return blockMethod.getBlockByNumber(this.peerName, this.channelName, this.summary.blockNum - counter - 1).then((blockInfo) => {
                    if (blockInfo && blockInfo.txs) {
                        if (lastNumber < blockInfo.txs.length) {
                            for (let j = 0; j < lastNumber; j++) {
                                txs.push(blockInfo.txs[j])
                                // break promise if counter is fullfiled.
                                return Promise.reject('finish')
                            }
                            lastNumber = 0
                        } else {
                            txs = txs.concat(blockInfo.txs)
                            lastNumber -= blockInfo.txs.length
                            return Promise.resolve('next')
                        }
                    } else {
                        console.log('finish reject')
                        return Promise.reject('finish')
                    }
                })
            }).then((res) => {
                rs(txs)
            }, (e) => {

                //make sure last promise was returned by fullfilling critiria not exception.
                if (e == 'finish') {
                    rs(txs)
                } else {
                    rj(e)
                }
            })
        })
    }
    returnBlockTxsNum(lastNumber){
        try{
            lastNumber = parseInt(lastNumber,10)
        }catch(e){

        }
        logger.debug(`fetch last ${lastNumber} block txs`)
        let currentHeight = parseInt(this.currentHeight,10)
        logger.debug(`current height ${currentHeight}`)
        logger.debug(`fetch from ${currentHeight-lastNumber-1}`)
        return blockMethod.getBlocks(this.peerName,{
            channelName:this.channelName,
            number:{$gt:currentHeight-lastNumber-1}
        }).then((blocks)=>{
            let result= []
            blocks.forEach((block)=>{
                result.push({blockNumber:block.number,txNum:block.txNum})
            })
            return result
        })
    }
    returnBlockInfo(blockNumber) {
        try {
            blockNumber = parseInt(blockNumber,10)
        } catch (e) {}
        return blockMethod.getBlockByNumber(this.peerName, this.channelName, blockNumber)
    }
    returnChannelInfo() {
        var summary = JSON.parse(JSON.stringify(this.summary))
        return hyperUtil.channelAPI.getInstalledChaincodes(this.channelName, this.peerName, "instantiated", this.orgAdmin)
            .then((chaincodes) => {
                summary.chaincodes = chaincodes
                return Promise.resolve(summary)
            })

    }
    returnChaincodeInfo(chaincodeName) {
        return Promise.resolve(this.chaincodes[chaincodeName])
    }


    //operation methods
    //check the db's data to decide clean db or not.
    start() {
        logger.info('Start execute peer %s channel %s obj for monitor ', this.peerName, this.channelName)
        var self = this
        this.trackDone = false;
        this.checkHistory().then(() => {
            // after check, start to fetch db
            self.checkAndTrace()
        })

    }
    //public method to set internal peer status
    setPeerAlive(state) {
        this.peerAlive = state;
    }
    //internal method, fetch newest channel state then make up the gap
    checkAndTrace() {
        logger.debug('check and trace')

        return hyperUtil.channelAPI.getChainInfo(this.channelName, this.peerName, this.orgAdmin)
            .then((channelInfo) => {
                let nowHeight = channelInfo.height.low
                nowHeight = parseInt(nowHeight, 10)
                logger.debug('current channel height :' + nowHeight)
                this.currentHeight = nowHeight
                let storageHeight = this.summary.blockNum
                return this.refreshRangeBlocks(storageHeight, nowHeight)
            }).then(() => {
                logger.info('refresh Range block finish ')
                let promiseArr = []
                promiseArr.push(this.updateChannelInfo());
                promiseArr.push(this.updateChaincodeInfo());
                return Promise.all(promiseArr)
            }).then(()=>{
                logger.info('first track and trace finish');
                this.trackDone = true;
            })
    }
    updateChannelInfo() {
        var channelInfo = hyperUtil.helper.cloneJSON(this.summary)
        delete channelInfo._id
        delete channelInfo.__v
        return channelMethod.updateChannel(this.peerName, channelInfo)
    }
    updateChaincodeInfo() {
        let promiseArr =[]
        for (var chaincodeName in this.chaincodes) {
            let chaincodeInfo = hyperUtil.helper.cloneJSON(this.chaincodes[chaincodeName])
            delete chaincodeInfo._id
            delete chaincodeInfo.__v
            promiseArr.push( chaincodeMethod.updateChaincodeInfo(this.peerName, chaincodeInfo))
        }
        return Promise.all(promiseArr)
    }
    eventBlock(block) {
        logger.debug('get event Block');
        var blockNumber = block.header.number;
        blockNumber = parseInt(blockNumber, 10)
        logger.debug('event Block Number is ' + blockNumber)
        logger.debug('current Block Number is ' + (this.currentHeight - 1 ))

        if (this.currentHeight -1 < ((blockNumber) - 1)) {
            logger.warn('lose block, start to trace')
            this.refreshRangeBlocks(this.currentHeight, blockNumber).then(() => {
                this.updateChannelInfo()
                this.updateChaincodeInfo()
            })
        }
        this.currentHeight = blockNumber+1;
        block.header.number = {
            low: blockNumber
        }
        this.refreshBlockAndTx(block).then(() => {
           let promiseArr = [];
            promiseArr.push(this.updateChannelInfo());
            promiseArr.push(this.updateChaincodeInfo());
            Promise.all(promiseArr).then(()=>{
                if(this.trackDone){
                    this.returnChannelInfo().then((channelInfo)=>{
                        this.io.emit('channelInfoChange',{
                            peerName: this.peerName,
                            channelName: this.channelName,
                            channelInfo : channelInfo
                        })
                    })
                    this.returnLastTxs(20).then((lastTxs)=>{
                        this.io.emit('lastTxsChange',{peerName:this.peerName,
                            channelName:this.channelName,
                            lastTxs: lastTxs
                        })
                    })
                    this.returnBlockTxsNum(20).then((blocksTxs)=>{
                        console.log('blockTxs emit')
                        this.io.emit('blocksTxsChange',{
                            peerName: this.peerName,
                            channelName: this.channelName,
                            blocksTxs:blocksTxs
                        })
                    })
                    this.diffChaincodes.forEach((chaincodeName)=>{
                        this.returnChaincodeInfo(chaincodeName).then((chaincodeInfo)=>{
                            this.io.emit('chaincodeChange',{
                                peerName: this.peerName,
                                channelName: this.channelName,
                                chaincodeName:this.chaincodeName,
                                chaincodeInfo
                            })
                        })
                    },this)



                }


            })
        })


    }
    refreshRangeBlocks(start, end) {
        logger.info('start fetch range blocks from %d to %d', start, end)
        var blockPromiseArr = []
        var self = this;
        for (let i = start; i < end; i++) {
            blockPromiseArr.push(hyperUtil.channelAPI.getBlockByNumber(self.channelName, self.peerName, i, this.orgAdmin).then((block) => {
                blockPromiseArr.push(this.refreshBlockAndTx(block))
            }))
        }
        return Promise.all(blockPromiseArr)
    }
    refreshBlockAndTx(block) {
        var blockNumber = block.header.number.low;

        let verifyNumber = this.blockNumberArray.find((element)=>{
            return  element == blockNumber;
        })
        if(verifyNumber){
            return Promise.resolve('duplicate block number')
        }else{
            this.blockNumberArray.push(blockNumber);
            console.log('start to refresh block and tx')
            var self = this;
            self.summary.blockNum++;
            console.log('#### block num : '+self.summary.blockNum )
            var hash = block.header.data_hash;
            var preHash = block.header.previous_hash;
            let actionBlock = hyperUtil.helper.processBlockToReadAbleJson(block)
            logger.debug('process block to json')
            logger.debug(actionBlock)
            var blockInfo = {
                txNum: 0,
                validNum: 0,
                unValidNum: 0,
                hash: hash,
                preHash: preHash,
                channelName: this.channelName,
                number: blockNumber,
                txs: []
            }
            logger.debug('get block info')
            logger.debug(blockInfo)
            actionBlock.forEach((tx) => {
                logger.debug('start to process individual tx')
                var txInfo = {
                    valid: true,
                    txID: tx.txID,
                    type: tx.type,
                    timestamp: tx.timestamp,
                    endorseInput: [],
                    blockNumber: blockNumber
                }
                txInfo.valid = channel.checkTxVaild(block, txInfo.txID)
                blockInfo.txNum++;
                self.summary.txNum++;
                if (txInfo.valid) {
                    blockInfo.validNum++;
                    self.summary.validNum++;
                } else {
                    blockInfo.unValidNum++;
                    self.summary.unValidNum++;
                }
                logger.debug('gonna to refresh chaincode')
                logger.debug(txInfo)
                if (tx.type == 'tx') {
                    tx.endorsementsInput.forEach((input) => {
                        let inputInfo = {}
                        inputInfo['chaincodeName'] = input.chaincodeName.split(':')[0];
                        inputInfo['input'] = input.input;
                        this.refreshChaincodeInfo(txInfo.valid, inputInfo, blockInfo)
                        txInfo.endorseInput.push(inputInfo)
                    })
                } else {
                    self.summary.configTimes++;
                }
                blockInfo.txs.push(txInfo)
            })
            return blockMethod.updateBlock(this.peerName, blockInfo)
        }
    }
    refreshChaincodeInfo(valid, inputs, blockInfo) {
        logger.debug('start refresh chaincodeInfo')
        var self = this;
        var chaincodeName;
        var chaincodeInfo;

        if (inputs.input[0] == 'invoke') {
            chaincodeName = inputs.chaincodeName.split(':')[0];
        } else if (inputs.input[0] == 'deploy' || inputs.input[0] == 'upgrade') {
            chaincodeName = inputs.input[2].chaincodeName.split(':')[0]
        }
        if(this.traceDone){
            this.diffChaincodes.push(chaincodeName)
        }
        logger.debug('get chaincode name %s', chaincodeName)
        if (!self.chaincodes[chaincodeName]) {
            logger.debug('init chaincode info for %s', chaincodeName)
            self.chaincodes[chaincodeName] = {
                channelName: this.channelName,
                chaincodeName: chaincodeName,
                txNum: 0,
                validNum: 0,
                unValidNum: 0,
                deployTimes: 0,
                invokeTimes: 0,
                version: 0,
                updateBlockNumber: 0,
                endorsementPolicy: {}
            }
        }
        logger.debug(self.chaincodes[chaincodeName])
        chaincodeInfo = self.chaincodes[chaincodeName]
        chaincodeInfo.txNum++;
        if (valid) {
            chaincodeInfo.validNum++;
        } else {
            chaincodeInfo.unValidNum++;
        }
        if (inputs.input[0] == 'invoke') {
            self.summary.invokeTimes++;
            chaincodeInfo.invokeTimes++;
        } else {
            // if the tx is update and the block is bigger than record, update the chaincode info
            self.summary.deployTimes++;
            chaincodeInfo.deployTimes++;
            if (blockInfo.number > chaincodeInfo.updateBlockNumber) {
                chaincodeInfo.version = inputs.input[2].chaincodeName.split(':')[1]
                logger.warn(inputs.input[3])
                chaincodeInfo.endorsementPolicy = inputs.input[3]
                chaincodeInfo.updateBlockNumber = blockInfo.number
                chaincodeInfo.initInput = inputs.input[2].input
            }
        }
    }
    cleanDb() {
        logger.info('clean db for peer %s channel %s', this.peerName, this.channelName)
        let promiseArr = []
        promiseArr.push(blockMethod.removeBlock(this.peerName, {
            channelName: this.channelName
        }))
        promiseArr.push(chaincodeMethod.removeChaincodeInfo(this.peerName, {
            channelName: this.channelName
        }))
        return Promise.all(promiseArr).then(() => {
            logger.info('clean finish')
        })
    }
    checkPreBlock(blockNum) {

    }
    checkHistory() {
        var currentHash;
        var storageHash;
        var storageChannelInfo
        logger.info('check history for peer %s channel %s', this.peerName, this.channelName)
        return channelMethod.getChannel(this.peerName, this.channelName).then((res) => {
            logger.debug('get storage channel info')
            logger.debug(res)
            if (!res) {
                logger.debug('channel info is empty')
                return this.cleanDb()
            } else {
                storageChannelInfo = res
                return hyperUtil.channelAPI.getBlockByNumber(this.channelName, this.peerName, 0, this.orgAdmin)
                    .then((res) => {
                        logger.debug('===========check hash===========')
                        logger.debug('DB block one')
                        logger.debug(res)
                        currentHash = res.header.data_hash;
                        return blockMethod.getBlockHashByNum(this.peerName, this.channelName, 0).then((blockZHash) => {
                            if (currentHash == blockZHash) {
                                logger.info('same generation')
                                this.summary = storageChannelInfo
                                return chaincodeMethod.getChaincodeInfosByChannel(this.peerName, this.channelName).then((chaincodeInfos) => {
                                    if (chaincodeInfos) {
                                        chaincodeInfos.forEach((chaincodeInfo) => {
                                            this.chaincodes[chaincodeInfo.chaincodeName] = chaincodeInfo
                                        })
                                    }
                                    return Promise.resolve()
                                })
                            } else {
                                logger.info('new generation')
                                return this.cleanDb()
                            }
                        })
                    })
            }
        })

    }
    static checkTxVaild(block, txID) {
        //TO DO:
        return true;
    }

}
module.exports = channel