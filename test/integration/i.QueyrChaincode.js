

var tape = require('tape');
var _test = require('tape-promise').default;
var test = _test(tape);
var colorize = require('tap-colorize');
// test.createStream().pipe(colorize()).pipe(process.stdout);
var requestTool = require('../requestTool.js')
var testTool = require('../testTool')
var delay = testTool.delay
var sendToGateway = requestTool.sendToGateway
var route = '/chaincode/query'

//Will intall mycc1 => simple cc with endorsement policy org1 and org2
//mycc2 => only install in org1 so should be reject
//mycc3 => simple cc without endorsement policy
//mycc4 => simpel cc but with error args
//mycc5 => install different chaincode but with same name mycc5, should not be instantiate
test('Query chaincode channel code mycc in org1 on mychannel  for account a', (t) => {
    sendToGateway('org1', route,
        {
            "chaincodeName": "mycc",
            "channelName": "mychannel",
            "functionName": "invoke",
            "args": [
                "query",
                "a"
            ],
            "user": {
                "enrollID": "orgAdmin",
                "enrollSecret": "87654321"
            }
        }).then((res) => {
        t.equal(res, '80')
        t.end()
    }).catch((e) => {
        t.fail('query chaincode fail');
        t.end()
    })
})
test('Query chaincode channel code mycc3 in org2 on mychannel ', (t) => {
    sendToGateway('org2', route,
        {
            "chaincodeName": "mycc3",
            "channelName": "mychannel",
            "functionName": "invoke",
            "args": [
                "query",
                "a"
            ],
            "user": {
                "enrollID": "orgAdmin",
                "enrollSecret": "87654321"
            }
        }).then((res) => {
        t.equal(res, '80')
        t.end()
    }).catch((e) => {
        t.fail('Query chaincode fail');
        t.end()
    })
})
test('Query chaincode channel code mycc in org1 on mychannel with error channel name', (t) => {
    sendToGateway('org1', route,
        {
            "chaincodeName": "mycc",
            "channelName": "testchannel",
            "functionName": "invoke",
            "args": [
                "query",
                "a"
            ],
            "user": {
                "enrollID": "orgAdmin",
                "enrollSecret": "87654321"
            }
        }).then((res) => {
        t.fail('error chanel name shell not pass')
        t.end()
    }).catch((e) => {
        t.equal(e, 'Error: invailed channel name, plz check your network config has the config of channel testchannel');
        t.end()
    })
})
test('Query chaincode channel code mycc in org1 on mychannel with error chaincode name', (t) => {
    sendToGateway('org1', route,
        {
            "chaincodeName": "mycctest",
            "channelName": "mychannel",
            "functionName": "invoke",
            "args": [
                "query",
                "a"
            ],
            "user": {
                "enrollID": "orgAdmin",
                "enrollSecret": "87654321"
            }
        }).then((res) => {
        console.log(res)
        t.fail('error chaincode name shell not pass')
        t.end()
    }).catch((e) => {
        t.equal(JSON.stringify(e), JSON.stringify([{
            "url": "grpcs://localhost:7051",
            "response": "Error: could not find chaincode with name 'mycctest' - make sure the chaincode mycctest has been successfully instantiated and try again"
        }, {
            "url": "grpcs://localhost:7056",
            "response": "Error: could not find chaincode with name 'mycctest' - make sure the chaincode mycctest has been successfully instantiated and try again"
        }]))
        t.end()
    })
})
test('Query chaincode channel code mycc in org2 on mychannel with error arg', (t) => {
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
                "url": "grpcs://localhost:8051",
                "response": "Error: chaincode error (status: 500, message: Unknown action, check the first argument, must be one of 'delete', 'query', or 'move'. But got: a)"
            }, {
                "url": "grpcs://localhost:8056",
                "response": "Error: chaincode error (status: 500, message: Unknown action, check the first argument, must be one of 'delete', 'query', or 'move'. But got: a)"
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