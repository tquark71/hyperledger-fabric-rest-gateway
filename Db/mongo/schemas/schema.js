var mongoose = require('mongoose')
var schema = mongoose.Schema

var userSchema = schema({
    username: String,
    password: String
});


var eventHubUrlSchema = schema({
    type: String,
    url: String,
    chaincodeName: String,
    eventName: String
})

var eventHistorySchema = schema({
    peerName: String,
    eventType: String,
    url: String,
    payload: mongoose.Schema.Types.Mixed,
    emitTime: {
        type: Date,
        default: Date.now
    },
    status: {
        retryTimes: Number,
        success: Boolean,
        reason: String
    }
})


module.exports = {
    // userSchema: userSchema,
    eventHubUrlSchema: eventHubUrlSchema,
    eventHistorySchema: eventHistorySchema,
}