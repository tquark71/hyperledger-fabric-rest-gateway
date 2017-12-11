var express = require('express');
var bodyParser = require('body-parser');
var API = require('./API')
var config = require('./config')
var app = express();
var events = require('events');
var emitter = new events.EventEmitter();


app.use(bodyParser());
app.use(API)
module.exports = {
    app: app,
    emitter: emitter
}
// app.listen(config.port)