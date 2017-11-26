

var tape = require('tape');
var _test = require('tape-promise').default;
var test = _test(tape);
var colorize = require('tap-colorize');
test.createStream().pipe(colorize()).pipe(process.stdout);
var requestTool = require('../requestTool.js')
var testTool = require('../testTool')
var delay = testTool.delay
var sendToGateway = requestTool.sendToGateway
var route = '/chaincode/invokeE'

//Will intall mycc1 => simple cc with endorsement policy org1 and org2
//mycc2 => only install in org1 so should be reject
//mycc3 => simple cc without endorsement policy
//mycc4 => simpel cc but with error args
//mycc5 => install different chaincode but with same name mycc5, should not be instantiate
test('Invoke chaincode channel code mycc in org1 on mychannel ', (t) => {
    sendToGateway('org1', route,
        {
            "chaincodeName": "mycc",
            "channelName": "mychannel",
            "functionName": "invoke",
            "args": [
                "move",
                "a",
                "b",
                "10"
            ],
            "user": {
                "enrollID": "orgAdmin",
                "enrollSecret": "87654321"
            }
        }).then((res) => {
        t.equal(res, 'Aval = 80, Bval = 220\n')
        t.end()
    }).catch((e) => {
        t.fail('Install chaincode fail');
        t.end()
    })
})
test('Invoke chaincode channel code mycc in org2 on mychannel ', (t) => {
    sendToGateway('org2', route,
        {
            "chaincodeName": "mycc3",
            "channelName": "mychannel",
            "functionName": "invoke",
            "args": [
                "move",
                "a",
                "b",
                "10"
            ],
            "user": {
                "enrollID": "orgAdmin",
                "enrollSecret": "87654321"
            }
        }).then((res) => {
        t.equal(res, 'Aval = 80, Bval = 220\n')
        t.end()
    }).catch((e) => {
        t.fail('Install chaincode fail');
        t.end()
    })
})
test('Invoke chaincode channel code mycc in org1 on mychannel with error channel name', (t) => {
    sendToGateway('org1', route,
        {
            "chaincodeName": "mycc",
            "channelName": "testchannel",
            "functionName": "invoke",
            "args": [
                "move",
                "a",
                "b",
                "10"
            ],
            "user": {
                "enrollID": "orgAdmin",
                "enrollSecret": "87654321"
            }
        }).then((res) => {
        t.fail('fullfilled endorsement policy faild, should not pass')
        t.end()
    }).catch((e) => {
        t.equal(e, 'Error: invailed channel name, plz check your network config has the config of channel testchannel');
        t.end()
    })
})
test('Invoke chaincode channel code mycc in org2 on mychannel with error chaincode name', (t) => {
    sendToGateway('org2', route,
        {
            "chaincodeName": "mycctest",
            "channelName": "mychannel",
            "functionName": "invoke",
            "args": [
                "move",
                "a",
                "b",
                "10"
            ],
            "user": {
                "enrollID": "orgAdmin",
                "enrollSecret": "87654321"
            }
        }).then((res) => {
        t.fail('fullfilled endorsement policy faild, should not pass')
        t.end()
    }).catch((e) => {
        t.equal(e.toString(), "Fetch chaincode mycctest policy failed reason : Error: chaincode error (status: 500, message: could not find chaincode with name 'mycctest')")
        t.end()
    })
})
test('Invoke chaincode channel code mycc in org2 on mychannel with error arg', (t) => {
    sendToGateway('org2', route,
        {
            "chaincodeName": "mycc",
            "channelName": "mychannel",
            "functionName": "invoke",
            "args": [
                "a",
                "b",
                "10"
            ],
            "user": {
                "enrollID": "orgAdmin",
                "enrollSecret": "87654321"
            }
        }).then((res) => {
        t.fail('error args should failed')
        t.end()
    }).catch((e) => {
        if (JSON.stringify(e) == JSON.stringify([{
                "url": "grpcs://localhost:7051",
                "response": "Error: chaincode error (status: 500, message: Unknown action, check the first argument, must be one of 'delete', 'query', or 'move'. But got: a)"
            }, {
                "url": "grpcs://localhost:8051",
                "response": "Error: chaincode error (status: 500, message: Unknown action, check the first argument, must be one of 'delete', 'query', or 'move'. But got: a)"
            }, {
                "compareResult": false
            }]) || JSON.stringify(e) == JSON.stringify([{
                "url": "grpcs://localhost:8051",
                "response": "Error: chaincode error (status: 500, message: Unknown action, check the first argument, must be one of 'delete', 'query', or 'move'. But got: a)"
            }, {
                "url": "grpcs://localhost:7051",
                "response": "Error: chaincode error (status: 500, message: Unknown action, check the first argument, must be one of 'delete', 'query', or 'move'. But got: a)"
            }, {
                "compareResult": false
            }])) {
            t.pass('reject by chaincode level')
            t.end()
        } else {
            t.fail('error msg error')
            t.end()

        }
    })
})

test('Invoke chaincode channel code mycc in org2 on mychannel without required parameter', (t) => {
    sendToGateway('org2', route,
        {
            "channelName": "mychannel",
            "functionName": "invoke",
            "args": [
                "a",
                "b",
                "10"
            ],
            "user": {
                "enrollID": "orgAdmin",
                "enrollSecret": "87654321"
            }
        }).then((res) => {
        t.fail('error args should failed')
        t.end()
    }).catch((e) => {
        t.pass('Error: Parameter (request) failed schema validation')
        t.end()
    })
})