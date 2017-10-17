var mongoose = require('mongoose')
var schema = mongoose.Schema

module.exports.innerSignRequestSchema = schema({
    uuid: String,
    name: String,
    type: String,
    description: String,
    policy: mongoose.Schema.Types.Mixed,
    contentBytes: Buffer,
    responses: [Buffer],
    fullfilled: Boolean,
    creatorName: String,
    signRequestSignatureBytes: Buffer,
    createTime: {
        type: Date,
        default: Date.now
    }

})

module.exports.outerSignRequestSchema = schema({
    uuid: String,
    signRequestSignatureBytes: Buffer,
    toRole: String,
    type: String,
    description: String,
    status: String,
    contentBytes: Buffer,
    signerName: String,
    fromMspID: String,
    receiveTime: {
        type: Date,
        default: Date.now
    }
})

module.exports.sendHistorySchema = schema({
    url: String,
    type: String,
    uuid: String,
    meta: mongoose.Schema.Types.Mixed,
    body: mongoose.Schema.Types.Mixed,
    sendTime: {
        type: Date,
        default: Date.now
    },
    status: {
        retryTimes: Number,
        success: Boolean,
        reason: String
    },
    maxTryTimes: {
        type: Number,
        default: 5
    },
    timeout: {
        type: Number,
        default: 60000
    }
})
