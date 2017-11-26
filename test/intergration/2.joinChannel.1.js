

var tape = require('tape');
var _test = require('tape-promise').default;

var test = _test(tape);
var requestTool = require('../requestTool.js')
var testTool = require('../testTool')
var delay = testTool.delay
var sendToGateway = requestTool.sendToGateway
test('Join org 1 to mychannel', (t) => {
    sendToGateway('org1', '/channel/join',
        {
            "channelName": "mychannel",
            "user": {
                "enrollID": "orgAdmin",
                "enrollSecret": "87654321"
            }
        }).then((res) => {
        t.equal(res, 'Successfully joined peers in organization org1 to the channel mychannel', 'Join channel success')
        t.end()
    }).catch((e) => {
        t.fail('Join channel failed');
        t.end()
    })
})
test('Join org 2 to mychannel', (t) => {
    sendToGateway('org2', '/channel/join',
        {
            "channelName": "mychannel",
            "user": {
                "enrollID": "orgAdmin",
                "enrollSecret": "87654321"
            }
        }).then((res) => {
        t.equal(res, 'Successfully joined peers in organization org2 to the channel mychannel', 'Join channel success')
        t.end()
    }).catch((e) => {
        t.fail('Join channel failed');
        t.end()
    })
})
test('Join org 1 to mychannel second time', (t) => {
    sendToGateway('org1', '/channel/join',
        {
            "channelName": "mychannel",
            "user": {
                "enrollID": "orgAdmin",
                "enrollSecret": "87654321"
            }
        }).then((res) => {
        t.fail('Channel should not be existed can not be joined')
        t.end()
    }).catch((e) => {
        t.equal(e.toString(), ['Error: chaincode error (status: 500, message: Cannot create ledger from genesis block, due to LedgerID already exists)',
            'Error: chaincode error (status: 500, message: Cannot create ledger from genesis block, due to LedgerID already exists)'].toString());
        t.end()
    })
})

test('Join org 1 to testchannel', (t) => {
    sendToGateway('org1', '/channel/join',
        {
            "channelName": "testchannel",
            "user": {
                "enrollID": "orgAdmin",
                "enrollSecret": "87654321"
            }
        }).then((res) => {
        t.fail('Channel should not be existed can not be joined')
        t.end()
    }).catch((e) => {
        t.equal(e, 'Error: invailed channel name, plz check your network config has the config of channel testchannel');
        t.end()
    })
})
