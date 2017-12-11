

var tape = require('tape');
var _test = require('tape-promise').default;

var test = _test(tape);
var colorize = require('tap-colorize');
// test.createStream().pipe(colorize()).pipe(process.stdout);
var requestTool = require('../requestTool.js')
var testTool = require('../testTool')
var delay = testTool.delay
var sendToGateway = requestTool.sendToGateway
var route = '/chaincode/install'
test('Install chaincode channel code testCC in org1 on mychannel ', (t) => {
    sendToGateway('org1', route,
        {
            "chaincodeName": "mycc",
            "channelName": "mychannel",
            "chaincodePath": "chaincodes/testCC",
            "chaincodeVersion": "v1",
            "sourceType": "sourceCode",
            "langType": "golang",
            "user": {
                "enrollID": "orgAdmin",
                "enrollSecret": "87654321"
            }
        }).then((res) => {
        t.equal(res, 'Successfully Installed chaincode on organization org1')
        t.end()
    }).catch((e) => {
        t.fail('Install chaincode  fail');
        t.end()
    })
})
test('Install chaincode channel code testCC in org1 on mychannel with another name', (t) => {
    sendToGateway('org1', route,
        {
            "chaincodeName": "mycc2",
            "channelName": "mychannel",
            "chaincodePath": "chaincodes/testCC",
            "chaincodeVersion": "v1",
            "sourceType": "sourceCode",
            "langType": "golang",
            "user": {
                "enrollID": "orgAdmin",
                "enrollSecret": "87654321"
            }
        }).then((res) => {
        t.equal(res, 'Successfully Installed chaincode on organization org1')
        t.end()
    }).catch((e) => {
        t.fail('Install chaincode fail');
        t.end()
    })
})

test('Install chaincode channel code testCC in org1 on mychannel with name of mycc3', (t) => {
    sendToGateway('org1', route,
        {
            "chaincodeName": "mycc3",
            "channelName": "mychannel",
            "chaincodePath": "chaincodes/testCC",
            "chaincodeVersion": "v1",
            "sourceType": "sourceCode",
            "langType": "golang",
            "user": {
                "enrollID": "orgAdmin",
                "enrollSecret": "87654321"
            }
        }).then((res) => {
        t.equal(res, 'Successfully Installed chaincode on organization org1')
        t.end()
    }).catch((e) => {
        t.fail('Install chaincode fail');
        t.end()
    })
})
test('Install chaincode channel code testCC in org2 on mychannel with name of mycc3', (t) => {
    sendToGateway('org2', route,
        {
            "chaincodeName": "mycc3",
            "channelName": "mychannel",
            "chaincodePath": "chaincodes/testCC",
            "chaincodeVersion": "v1",
            "sourceType": "sourceCode",
            "langType": "golang",
            "user": {
                "enrollID": "orgAdmin",
                "enrollSecret": "87654321"
            }
        }).then((res) => {
        t.equal(res, 'Successfully Installed chaincode on organization org2')
        t.end()
    }).catch((e) => {
        t.fail('Install chaincode fail');
        t.end()
    })
})

test('Install chaincode channel code testCC in org1 on mychannel with name of mycc4', (t) => {
    sendToGateway('org1', route,
        {
            "chaincodeName": "mycc4",
            "channelName": "mychannel",
            "chaincodePath": "chaincodes/testCC",
            "chaincodeVersion": "v1",
            "sourceType": "sourceCode",
            "langType": "golang",
            "user": {
                "enrollID": "orgAdmin",
                "enrollSecret": "87654321"
            }
        }).then((res) => {
        t.equal(res, 'Successfully Installed chaincode on organization org1')
        t.end()
    }).catch((e) => {
        t.fail('Install chaincode fail');
        t.end()
    })
})
test('Install chaincode channel code testCC in org2 on mychannel with name of mycc4', (t) => {
    sendToGateway('org2', route,
        {
            "chaincodeName": "mycc4",
            "channelName": "mychannel",
            "chaincodePath": "chaincodes/testCC",
            "chaincodeVersion": "v1",
            "sourceType": "sourceCode",
            "langType": "golang",
            "user": {
                "enrollID": "orgAdmin",
                "enrollSecret": "87654321"
            }
        }).then((res) => {
        t.equal(res, 'Successfully Installed chaincode on organization org2')
        t.end()
    }).catch((e) => {
        t.fail('Install chaincode fail');
        t.end()
    })
})
test('Install chaincode channel code testCC in org2 on mychannel ', (t) => {
    sendToGateway('org2', route,
        {
            "chaincodeName": "mycc",
            "channelName": "mychannel",
            "chaincodePath": "chaincodes/testCC",
            "chaincodeVersion": "v1",
            "sourceType": "sourceCode",
            "langType": "golang",
            "user": {
                "enrollID": "orgAdmin",
                "enrollSecret": "87654321"
            }
        }).then((res) => {
        t.equal(res, 'Successfully Installed chaincode on organization org2')
        t.end()
    }).catch((e) => {
        t.fail('Install chaincode  fail');
        t.end()
    })
})
test('Install chaincode channel code testCC in org2 again ', (t) => {
    sendToGateway('org2', route,
        {
            "chaincodeName": "mycc",
            "channelName": "mychannel",
            "chaincodePath": "chaincodes/testCC",
            "chaincodeVersion": "v1",
            "sourceType": "sourceCode",
            "langType": "golang",
            "user": {
                "enrollID": "orgAdmin",
                "enrollSecret": "87654321"
            }
        }).then((res) => {
        t.fail('Should be reject')
        t.end()
    }).catch((e) => {
        t.equal(JSON.stringify(e), JSON.stringify([{
            url: 'grpcs://localhost:8051',
            response: 'Error: chaincode error (status: 500, message: Error installing chaincode code mycc:v1(chaincode /var/hyperledger/production/chaincodes/mycc.v1 exists))'
        },
            {
                url: 'grpcs://localhost:8056',
                response: 'Error: chaincode error (status: 500, message: Error installing chaincode code mycc:v1(chaincode /var/hyperledger/production/chaincodes/mycc.v1 exists))'
            }]))
        t.end()
    })
})
test('Install chaincode testCC with unexist path in org1', (t) => {
    sendToGateway('org1', route,
        {
            "chaincodeName": "mycc",
            "channelName": "mychannel",
            "chaincodePath": "chaincodes/errorCC",
            "chaincodeVersion": "v1",
            "sourceType": "sourceCode",
            "langType": "golang",
            "user": {
                "enrollID": "orgAdmin",
                "enrollSecret": "87654321"
            }
        }).then((res) => {
        t.fail('Should be reject')
        t.end()
    }).catch((e) => {
        t.pass('should be reject')
        t.end()
    })
})

test('Install chaincode testCC in unexist channel in org1', (t) => {
    sendToGateway('org1', route,
        {
            "chaincodeName": "mycc",
            "channelName": "testchannel",
            "chaincodePath": "chaincodes/testCC",
            "chaincodeVersion": "v1",
            "sourceType": "sourceCode",
            "langType": "golang",
            "user": {
                "enrollID": "orgAdmin",
                "enrollSecret": "87654321"
            }
        }).then((res) => {
        t.fail('Should be reject')
        t.end()
    }).catch((e) => {
        t.equal(e, 'Error: channel : testchannel did not exist in channel config')
        t.end()
    })
})
test('Install chaincode channel code testCC2 in org1 on mychannel with name of mycc5', (t) => {
    sendToGateway('org1', route,
        {
            "chaincodeName": "mycc5",
            "channelName": "mychannel",
            "chaincodePath": "chaincodes/testCC2",
            "chaincodeVersion": "v1",
            "sourceType": "sourceCode",
            "langType": "golang",
            "user": {
                "enrollID": "orgAdmin",
                "enrollSecret": "87654321"
            }
        }).then((res) => {
        t.equal(res, 'Successfully Installed chaincode on organization org1')
        t.end()
    }).catch((e) => {
        t.fail('Install chaincode fail');
        t.end()
    })
})
test('Install chaincode channel code testCC in org2 on mychannel with name of mycc5', (t) => {
    sendToGateway('org2', route,
        {
            "chaincodeName": "mycc5",
            "channelName": "mychannel",
            "chaincodePath": "chaincodes/testCC",
            "chaincodeVersion": "v1",
            "sourceType": "sourceCode",
            "langType": "golang",
            "user": {
                "enrollID": "orgAdmin",
                "enrollSecret": "87654321"
            }
        }).then((res) => {
        t.equal(res, 'Successfully Installed chaincode on organization org2')
        t.end()
    }).catch((e) => {
        t.fail('Install chaincode fail');
        t.end()
    })
})

test('Install chaincode events_cc in mychannel for event hub test and named eventCC ', (t) => {
    sendToGateway('org1', route,
        {
            "chaincodeName": "eventCC",
            "channelName": "mychannel",
            "chaincodePath": "chaincodes/events_cc",
            "chaincodeVersion": "v1",
            "sourceType": "sourceCode",
            "langType": "golang",
            "user": {
                "enrollID": "orgAdmin",
                "enrollSecret": "87654321"
            }
        }).then((res) => {
        t.equal(res, 'Successfully Installed chaincode on organization org1')
        t.end()
    }).catch((e) => {
        t.fail('Install chaincode  fail');
        t.end()
    })
})

test('Install chaincode events_cc in mychannel for event hub test and named eventCC ', (t) => {
    sendToGateway('org2', route,
        {
            "chaincodeName": "eventCC",
            "channelName": "mychannel",
            "chaincodePath": "chaincodes/events_cc",
            "chaincodeVersion": "v1",
            "sourceType": "sourceCode",
            "langType": "golang",
            "user": {
                "enrollID": "orgAdmin",
                "enrollSecret": "87654321"
            }
        }).then((res) => {
        t.equal(res, 'Successfully Installed chaincode on organization org2')
        t.end()
    }).catch((e) => {
        t.fail('Install chaincode  fail');
        t.end()
    })
})