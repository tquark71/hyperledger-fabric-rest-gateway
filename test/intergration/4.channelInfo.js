

var tape = require('tape');
var _test = require('tape-promise').default;

var test = _test(tape);
var requestTool = require('../requestTool.js')
var testTool = require('../testTool')
var delay = testTool.delay
var sendToGateway = requestTool.sendToGateway
var route = '/channel/info'
test('Org1 Query channel config on peer1', (t) => {
    sendToGateway('org1', route,
        {
            "peerName": "peer1",
            "channelName": "mychannel",
            "user": {
                "enrollID": "orgAdmin",
                "enrollSecret": "87654321"
            }
        }).then((res) => {
        t.equal(res.height.low, 1)
        t.end()
    }).catch((e) => {
        t.fail('Queyr channel info fail');
        t.end()
    })
})
test('Org1 Query channel config on peer2', (t) => {
    sendToGateway('org1', route,
        {
            "peerName": "peer2",
            "channelName": "mychannel",
            "user": {
                "enrollID": "orgAdmin",
                "enrollSecret": "87654321"
            }
        }).then((res) => {
        t.equal(res.height.low, 1)
        t.end()
    }).catch((e) => {
        t.fail('Queyr channel info fail');
        t.end()
    })
})
test('Org2 Query channel config on peer1', (t) => {
    sendToGateway('org2', route,
        {
            "peerName": "peer1",
            "channelName": "mychannel",
            "user": {
                "enrollID": "orgAdmin",
                "enrollSecret": "87654321"
            }
        }).then((res) => {
        t.equal(res.height.low, 1)
        t.end()
    }).catch((e) => {
        t.fail('Queyr channel info fail');
        t.end()
    })
})
test('Org2 Query channel config on peer2', (t) => {
    sendToGateway('org2', route,
        {
            "peerName": "peer2",
            "channelName": "mychannel",
            "user": {
                "enrollID": "orgAdmin",
                "enrollSecret": "87654321"
            }
        }).then((res) => {
        t.equal(res.height.low, 1)
        t.end()
    }).catch((e) => {
        t.fail('Queyr channel info fail');
        t.end()
    })
})
test('Org1 Query channel config on peer2 with error name', (t) => {
    sendToGateway('org1', route,
        {
            "peerName": "peer2",
            "channelName": "testchannel",
            "user": {
                "enrollID": "orgAdmin",
                "enrollSecret": "87654321"
            }
        }).then((res) => {
        t.fail("should be reject")
        t.end()
    }).catch((e) => {
        t.equal(e, 'Error: invailed channel name, plz check your network config has the config of channel testchannel');
        t.end()
    })
})