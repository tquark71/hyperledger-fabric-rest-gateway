var mongoose = require('mongoose')
var schema = mongoose.Schema

var txSchema = schema({
    blockNumber: Number,
    valid: Boolean,
    txID: String,
    timestamp: String,
    endorseInput: [{
        chaincodeName: String,
        input: mongoose.Schema.Types.Mixed
    }],
    type: String
});
var blockSchema = schema({
    channelName: String,
    validNum: Number,
    unValidNum: Number,
    number: Number,
    txs: [txSchema],
    hash: String,
    preHash: String,
    txNum: Number
});

var channelSchema = schema({
    channelName: String,
    validNum: Number,
    unValidNum: Number,
    deployTimes: Number,
    invokeTimes: Number,
    configTimes: Number,
    blockNum: Number,
    txNum: Number,
})
var peerSchema = schema({
    peerName: String,
    url: String,
    channelNames: [String],
    installedChaincodes: [{
        version: String,
        path: String,
        name: String
    }]
})
var chaincodeSchema = schema({
    channelName: String,
    chaincodeName: String,
    txNum: Number,
    validNum: Number,
    unValidNum: Number,
    version: String,
    initInput: Array,
    "endorsementPolicy": {
        version: Number,
        policy: mongoose.Schema.Types.Mixed,
        identities: [{
            "principal_classification": Number,
            principal: {
                "msp_identifier": String,
                "role": Number
            }
        }]
    }
})


// var chaincodeInfoDB = mongoose.model('chaincodeInfoDB', chaincodeInfoSchema);
// var blockDB = mongoose.model('blockDB', blockSchema);
// var txDB = mongoose.model('txDB', txSchema);
// var userDB = mongoose.model('userDB', userSchema);
// var channelDB = mongoose.model('channelDB', channelSchema);
// var peerDB = mongoose.model('peerDB', peerSchema);
module.exports = {
    peerSchema: peerSchema,
    channelSchema: channelSchema,
    chaincodeSchema: chaincodeSchema,
    blockSchema: blockSchema,
    txSchema: txSchema
}