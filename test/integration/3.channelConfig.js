

var tape = require('tape');
var _test = require('tape-promise').default;

var test = _test(tape);
var colorize = require('tap-colorize');
// test.createStream().pipe(colorize()).pipe(process.stdout);
var requestTool = require('../requestTool.js')
var testTool = require('../testTool')
var delay = testTool.delay
var sendToGateway = requestTool.sendToGateway
var route = '/channel/config'
test('Org1 Query channel config', (t) => {
    sendToGateway('org1', route,
        {
            "channelName": "mychannel",
            "user": {
                "enrollID": "orgAdmin",
                "enrollSecret": "87654321"
            }
        }).then((res) => {
        t.equal(res.type, "Buffer")
        t.end()
    }).catch((e) => {
        t.fail('Queyr channel config fail');
        t.end()
    })
})
test('Org2 Query channel config', (t) => {
    sendToGateway('org2', route,
        {
            "channelName": "mychannel",
            "user": {
                "enrollID": "orgAdmin",
                "enrollSecret": "87654321"
            }
        }).then((res) => {
        t.equal(res.type, "Buffer")
        t.end()
    }).catch((e) => {
        t.fail('Queyr channel config fail');
        t.end()
    })
})
test('Query channel config with error name', (t) => {
    sendToGateway('org1', route,
        {
            "channelName": "testchannel",
            "user": {
                "enrollID": "orgAdmin",
                "enrollSecret": "87654321"
            }
        }).then((res) => {
        t.fail('Should failed to query config')
        t.end()
    }).catch((e) => {
        t.equal(e.toString(), ' Can\'t find testchannelchannel');
        t.end()
    })
})