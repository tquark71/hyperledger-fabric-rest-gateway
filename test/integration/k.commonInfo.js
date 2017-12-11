



var tape = require('tape');
var _test = require('tape-promise').default;
var test = _test(tape);
var colorize = require('tap-colorize');
// test.createStream().pipe(colorize()).pipe(process.stdout);
var requestTool = require('../requestTool.js')
var testTool = require('../testTool')
var delay = testTool.delay
var sendToGateway = requestTool.sendToGateway
var route = '/event/register/ccEvent/url'

//Will intall mycc1 => simple cc with endorsement policy org1 and org2
//mycc2 => only install in org1 so should be reject
//mycc3 => simple cc without endorsement policy
//mycc4 => simpel cc but with error args
//mycc5 => install different chaincode but with same name mycc5, should not be instantiate

test('Query channelInfo from peer1 in org1 for mychannel', (t) => {
    sendToGateway('org1', '/channel/info',
        {
            "peerName": "peer1",
            "channelName": "mychannel",
            "user": {
                "enrollID": "orgAdmin",
                "enrollSecret": "87654321"
            }
        }).then((res) => {
        if (res.height && res.currentBlockHash && res.previousBlockHash) {
            t.pass('query channel info success')
        }
        t.end()
    }).catch((e) => {
        console.log(e)
        t.fail('reigster event failed');
        t.end()
    })
})
test('Query channelInfo from peer2 in org1 for mychannel', (t) => {
    sendToGateway('org2', '/channel/info',
        {
            "peerName": "peer1",
            "channelName": "mychannel",
            "user": {
                "enrollID": "orgAdmin",
                "enrollSecret": "87654321"
            }
        }).then((res) => {
        if (res.height && res.currentBlockHash && res.previousBlockHash) {
            t.pass('query channel info success')
        }
        t.end()
    }).catch((e) => {
        console.log(e)
        t.fail('reigster event failed');
        t.end()
    })
})
test('Query channelInfo from peer2 in org1 for mychannel', (t) => {
    sendToGateway('org2', '/channel/info',
        {
            "peerName": "peer1",
            "channelName": "mychannel",
            "user": {
                "enrollID": "orgAdmin",
                "enrollSecret": "87654321"
            }
        }).then((res) => {
        if (res.height && res.currentBlockHash && res.previousBlockHash) {
            t.pass('query channel info success')
        }
        t.end()
    }).catch((e) => {
        console.log(e)
        t.fail('reigster event failed');
        t.end()
    })
})
test('Query channelInfo from peer2 in org1 for testchannel', (t) => {
    sendToGateway('org2', '/channel/info',
        {
            "peerName": "peer1",
            "channelName": "testchannel",
            "user": {
                "enrollID": "orgAdmin",
                "enrollSecret": "87654321"
            }
        }).then((res) => {
        t.fail('query from an un-existed peer should not success')
        t.end()
    }).catch((e) => {
        console.log(e)
        t.equal(e, 'Error: invailed channel name, plz check your network config has the config of channel testchannel')
        t.end()
    })
})
test('Query chaincode in installed from peer1 in org2 for testchannel', (t) => {
    sendToGateway('org2', '/chaincode/installed',
        {
            "peerName": "peer1",
            "user": {
                "enrollID": "orgAdmin",
                "enrollSecret": "87654321"
            }
        }).then((res) => {
        t.equal(JSON.stringify(res), JSON.stringify([{
            "name": "eventCC",
            "version": "v1",
            "path": "chaincodes/events_cc",
            "input": "",
            "escc": "",
            "vscc": ""
        }, {
            "name": "mycc",
            "version": "v1",
            "path": "chaincodes/testCC",
            "input": "",
            "escc": "",
            "vscc": ""
        }, {
            "name": "mycc3",
            "version": "v1",
            "path": "chaincodes/testCC",
            "input": "",
            "escc": "",
            "vscc": ""
        }, {
            "name": "mycc4",
            "version": "v1",
            "path": "chaincodes/testCC",
            "input": "",
            "escc": "",
            "vscc": ""
        }, {
            "name": "mycc5",
            "version": "v1",
            "path": "chaincodes/testCC",
            "input": "",
            "escc": "",
            "vscc": ""
        }]))
        t.end()
    }).catch((e) => {
        console.log(e)
        t.fail('query should success')
        t.end()
    })
})

test('Query chaincode data mycc3  installed from peer1 in org1 for testchannel', (t) => {
    sendToGateway('org1', '/chaincode/data',
        {
            "chaincodeName": "mycc3",
            "peerName": "peer1",
            "channelName": "mychannel",
            "user": {
                "enrollID": "orgAdmin",
                "enrollSecret": "87654321"
            }
        }).then((res) => {
        if (res.name == 'mycc3' && res.version == 'v1' && res.escc && res.vscc && res.policy) {
            t.pass('query chaincode success')
        } else {
            t.fail()
        }
        t.end()
    }).catch((e) => {
        console.log(e)
        t.fail('query datashould success')
        t.end()
    })
})
test('Query chaincode data mycc  installed from peer1 in org1 for testchannel', (t) => {
    sendToGateway('org1', '/chaincode/data',
        {
            "chaincodeName": "mycc",
            "peerName": "peer1",
            "channelName": "mychannel",
            "user": {
                "enrollID": "orgAdmin",
                "enrollSecret": "87654321"
            }
        }).then((res) => {
        if (res.name == 'mycc' && res.version == 'v1' && res.escc && res.vscc && res.policy) {
            t.pass('query chaincode success')
        } else {
            t.fail('query chaincode mycc info not match')
        }
        t.end()
    }).catch((e) => {
        console.log(e)
        t.fail('query datashould success')
        t.end()
    })
})
test('Query chaincode data mycc2 in installed from peer1 in org1 for testchannel', (t) => {
    sendToGateway('org1', '/chaincode/data',
        {
            "chaincodeName": "mycc2",
            "peerName": "peer1",
            "channelName": "mychannel",
            "user": {
                "enrollID": "orgAdmin",
                "enrollSecret": "87654321"
            }
        }).then((res) => {
        t.fail('query chaincode mycc2 should not success')
        t.end()
    }).catch((e) => {
        console.log(e)
        t.equal(e, 'Error: chaincode error (status: 500, message: could not find chaincode with name \'mycc2\')')
        t.end()
    })
})
test('Query chaincode data mycc without require parameter', (t) => {
    sendToGateway('org1', '/chaincode/data',
        {
            "chaincodeName": "mycc2",
            "channelName": "mychannel",
            "user": {
                "enrollID": "orgAdmin",
                "enrollSecret": "87654321"
            }
        }).then((res) => {
        t.fail('query chaincode mycc2 should not success')
        t.end()
    }).catch((e) => {
        console.log(e)
        t.pass('schema failed to be reject')
        t.end()
    })
})

test('Query chaincodes instantiated in mychannel from peer1', (t) => {
    sendToGateway('org1', '/channel/instantiated',
        {
            "channelName": "mychannel",
            "peerName": "peer1",
            "user": {
                "enrollID": "orgAdmin",
                "enrollSecret": "87654321"
            }
        }).then((res) => {
        t.equal(res.length, 3)
        t.end()
    }).catch((e) => {
        console.log(e)
        t.faild('chaincodes should be queried')
        t.end()
    })
})
test('Query chaincodes instantiated in testchannel from peer1', (t) => {
    sendToGateway('org1', '/channel/instantiated',
        {
            "channelName": "testchannel",
            "peerName": "peer1",
            "user": {
                "enrollID": "orgAdmin",
                "enrollSecret": "87654321"
            }
        }).then((res) => {
        t.faild('query chaincodes from an un-existed channel should be faild')
        t.end()
    }).catch((e) => {
        console.log(e)
        t.equal(e, 'Error: invailed channel name, plz check your network config has the config of channel testchannel')
        t.end()
    })
})
test('Query block action from mychannel of peer1 in org1', (t) => {
    sendToGateway('org1', '/block/action',
        {
            "channelName": "mychannel",
            "peerName": "peer1",
            "blockNum": "0",
            "user": {
                "enrollID": "orgAdmin",
                "enrollSecret": "87654321"
            }
        }).then((res) => {
        t.pass('query block action success')
        t.end()
    }).catch((e) => {
        console.log(e)
        t.faild('query block action should be success')
        t.end()
    })
})
test('Query block action without required parameter from mychannel of peer1 in org1', (t) => {
    sendToGateway('org1', '/block/action',
        {
            "channelName": "mychannel",
            "peerName": "peer1",
            "user": {
                "enrollID": "orgAdmin",
                "enrollSecret": "87654321"
            }
        }).then((res) => {
        t.faild('query block action without require parameter should failed');
        t.end()
    }).catch((e) => {
        console.log(e)
        t.pass('query block action should be rejected')
        t.end()
    })
})
test('Query block info  from mychannel of peer1 in org2', (t) => {
    sendToGateway('org2', '/block/info',
        {
            "channelName": "mychannel",
            "peerName": "peer1",
            "blockNum": "1",
            "user": {
                "enrollID": "orgAdmin",
                "enrollSecret": "87654321"
            }
        }).then((res) => {
        if (res.header.number && res.header.previous_hash && res.header.data_hash) {
            t.pass('query block info succes');
        } else {
            t.faild('result schema does not match');
        }
        t.end()
    }).catch((e) => {
        console.log(e)
        t.faild('query block info should be success')
        t.end()
    })
})

test('Query block info without required parameter from mychannel of peer1 in org1', (t) => {
    sendToGateway('org1', '/block/info',
        {
            "channelName": "mychannel",
            "blockNum": "1",
            "user": {
                "enrollID": "orgAdmin",
                "enrollSecret": "87654321"
            }
        }).then((res) => {
        t.faild('query block action without require parameter should failed');
        t.end()
    }).catch((e) => {
        console.log(e)
        t.pass('query block action should be rejected')
        t.end()
    })
})
