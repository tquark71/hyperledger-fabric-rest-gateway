

var tape = require('tape');
var _test = require('tape-promise').default;

var test = _test(tape);
var colorize = require('tap-colorize');
test.createStream().pipe(colorize()).pipe(process.stdout);
var requestTool = require('../requestTool.js')
var testTool = require('../testTool')
var delay = testTool.delay
var sendToGateway = requestTool.sendToGateway
test('First time test create channel api', (t) => {
    sendToGateway('org1', '/channel/create',
        {
            "channelName": "mychannel",
            "sourceType": "local",
            "source": "mychannel.tx",
            "user": {
                "enrollID": "orgAdmin",
                "enrollSecret": "87654321"
            }
        }).then((res) => {
        t.equal(res, 'Channel mychannel created Successfully', 'First create channel pass')
        t.end()
    }).catch((e) => {
        t.fail('First time create channel should be successful');
        t.end()
    })
})
test('Second time test create channel api should fail', (t) => {
    delay(500).then(() => {
        return sendToGateway('org1', '/channel/create',
            {
                "channelName": "mychannel",
                "sourceType": "local",
                "source": "mychannel.tx",
                "user": {
                    "enrollID": "orgAdmin",
                    "enrollSecret": "87654321"
                }
            })
    }).then((res) => {
        t.fail('Second time to create mychannel should failed');
        t.end();
    }).catch((e) => {
        t.equal(e, 'Error: BAD_REQUEST', 'Failed success');
        t.end();
    })
})
test('Create channel with error channel name', (t) => {
    delay(500).then(() => {
        return sendToGateway('org1', '/channel/create',
            {
                "channelName": "testchannel",
                "sourceType": "local",
                "source": "mychannel.tx",
                "user": {
                    "enrollID": "orgAdmin",
                    "enrollSecret": "87654321"
                }
            })
    }).then((res) => {
        t.fail('Second time to create mychannel should failed');
        t.end();
    }).catch((e) => {
        t.pass('Reject by error channel name');
        t.end();
    })
})
test('Create channel with none-existed tx', (t) => {
    delay(500).then(() => {
        return sendToGateway('org1', '/channel/create',
            {
                "channelName": "testchannel",
                "sourceType": "local",
                "source": "test-hannel.tx",
                "user": {
                    "enrollID": "orgAdmin",
                    "enrollSecret": "87654321"
                }
            })
    }).then((res) => {
        t.fail('Create channel should failed');
        t.end();
    }).catch((e) => {
        t.pass('Reject by error channel.tx');
        t.end();
    })
})
