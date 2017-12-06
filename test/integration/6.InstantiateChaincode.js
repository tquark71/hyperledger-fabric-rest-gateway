

var tape = require('tape');
var _test = require('tape-promise').default;
var test = _test(tape);
var colorize = require('tap-colorize');
// test.createStream().pipe(colorize()).pipe(process.stdout);
var requestTool = require('../requestTool.js')
var testTool = require('../testTool')
var delay = testTool.delay
var sendToGateway = requestTool.sendToGateway
var route = '/chaincode/instantiate'

//Will intall mycc1 => simple cc with endorsement policy org1 and org2
//mycc2 => only install in org1 so should be reject
//mycc3 => simple cc without endorsement policy
//mycc4 => simpel cc but with error args
//mycc5 => install different chaincode but with same name mycc5, should not be instantiate
test('Instantiate chaincode channel code mycc in org1 on mychannel ', (t) => {
    sendToGateway('org1', route,
        {
            "chaincodeName": "mycc",
            "channelName": "mychannel",
            "chaincodeVersion": "v1",
            "functionName": "init",
            "args": [
                "a",
                "100",
                "b",
                "200"
            ],
            "opt": {
                "endorsement-policy": {
                    "identities": [
                        {
                            "role": {
                                "name": "member",
                                "mspId": "Org2MSP"
                            }
                        },
                        {
                            "role": {
                                "name": "member",
                                "mspId": "Org1MSP"
                            }
                        }
                    ],
                    "policy": {
                        "2-of": [
                            {
                                "signed-by": 0
                            },
                            {
                                "signed-by": 1
                            }
                        ]
                    }
                }
            },
            "user": {
                "enrollID": "orgAdmin",
                "enrollSecret": "87654321"
            }
        }).then((res) => {
        t.pass('should be successful')
        t.end()
    }).catch((e) => {
        t.fail('Install chaincode fail');
        t.end()
    })
})
test('Instantiate chaincode channel code mycc in org1 on mychannel  again', (t) => {
    sendToGateway('org1', route,
        {
            "chaincodeName": "mycc",
            "channelName": "mychannel",
            "chaincodeVersion": "v1",
            "functionName": "init",
            "args": [
                "a",
                "100",
                "b",
                "200"
            ],
            "opt": {
                "endorsement-policy": {
                    "identities": [
                        {
                            "role": {
                                "name": "member",
                                "mspId": "Org2MSP"
                            }
                        },
                        {
                            "role": {
                                "name": "member",
                                "mspId": "Org1MSP"
                            }
                        }
                    ],
                    "policy": {
                        "2-of": [
                            {
                                "signed-by": 0
                            },
                            {
                                "signed-by": 1
                            }
                        ]
                    }
                }
            },
            "user": {
                "enrollID": "orgAdmin",
                "enrollSecret": "87654321"
            }
        }).then((res) => {
        t.fail('should be reject')
        t.end()
    }).catch((e) => {
        t.equal(JSON.stringify(e), JSON.stringify([{
            url: 'grpcs://localhost:7051',
            response: 'Error: chaincode error (status: 500, message: chaincode exists mycc)'
        },
            {
                url: 'grpcs://localhost:7056',
                response: 'Error: chaincode error (status: 500, message: chaincode exists mycc)'
            },
            {
                url: 'grpcs://localhost:8051',
                response: 'Error: chaincode error (status: 500, message: chaincode exists mycc)'
            },
            {
                url: 'grpcs://localhost:8056',
                response: 'Error: chaincode error (status: 500, message: chaincode exists mycc)'
            },
            {
                compareResult: false
            }]));
        t.end()
    })
})

test('Instantiate chaincode channel code mycc2 in org1 on mychannel should be reject cause org2 did not have such chaincode ', (t) => {
    sendToGateway('org1', route,
        {
            "chaincodeName": "mycc2",
            "channelName": "mychannel",
            "chaincodeVersion": "v1",
            "functionName": "init",
            "args": [
                "a",
                "100",
                "b",
                "200"
            ],
            "opt": {
                "endorsement-policy": {
                    "identities": [
                        {
                            "role": {
                                "name": "member",
                                "mspId": "Org2MSP"
                            }
                        },
                        {
                            "role": {
                                "name": "member",
                                "mspId": "Org1MSP"
                            }
                        }
                    ],
                    "policy": {
                        "2-of": [
                            {
                                "signed-by": 0
                            },
                            {
                                "signed-by": 1
                            }
                        ]
                    }
                }
            },
            "user": {
                "enrollID": "orgAdmin",
                "enrollSecret": "87654321"
            }
        }).then((res) => {
        t.fail('Instantiate chaincode should be reject');

        t.end()
    }).catch((e) => {
        t.equal(JSON.stringify(e), JSON.stringify([{
            url: 'grpcs://localhost:7051',
            response: {
                status: 200,
                message: 'OK'
            }
        },
            {
                url: 'grpcs://localhost:7056',
                response: {
                    status: 200,
                    message: 'OK'
                }
            },
            {
                url: 'grpcs://localhost:8051',
                response: 'Error: chaincode error (status: 500, message: cannot get package for the chaincode to be instantiated (mycc2:v1)-open /var/hyperledger/production/chaincodes/mycc2.v1: no such file or directory)'
            },
            {
                url: 'grpcs://localhost:8056',
                response: 'Error: chaincode error (status: 500, message: cannot get package for the chaincode to be instantiated (mycc2:v1)-open /var/hyperledger/production/chaincodes/mycc2.v1: no such file or directory)'
            },
            {
                compareResult: false
            }]))
        t.end()
    })
})

test('Instantiate chaincode channel code mycc3 in org1 on testchannel ', (t) => {
    sendToGateway('org1', route,
        {
            "chaincodeName": "mycc3",
            "channelName": "testchannel",
            "chaincodeVersion": "v1",
            "functionName": "init",
            "args": [
                "a",
                "100",
                "b",
                "200"
            ],
            "opt": {
                "endorsement-policy": {
                    "identities": [
                        {
                            "role": {
                                "name": "member",
                                "mspId": "Org2MSP"
                            }
                        },
                        {
                            "role": {
                                "name": "member",
                                "mspId": "Org1MSP"
                            }
                        }
                    ],
                    "policy": {
                        "2-of": [
                            {
                                "signed-by": 0
                            },
                            {
                                "signed-by": 1
                            }
                        ]
                    }
                }
            },
            "user": {
                "enrollID": "orgAdmin",
                "enrollSecret": "87654321"
            }
        }).then((res) => {
        t.fail('Instantiate chaincode should be reject');

        t.end()
    }).catch((e) => {
        t.equal(e, 'Error: invailed channel name, plz check your network config has the config of channel testchannel')
        t.end()
    })
})
test('Instantiate chaincode channel code mycc3 in org1 on mychannel without endorsing policy', (t) => {
    sendToGateway('org1', route,
        {
            "chaincodeName": "mycc3",
            "channelName": "mychannel",
            "chaincodeVersion": "v1",
            "functionName": "init",
            "args": [
                "a",
                "100",
                "b",
                "200"
            ],
            "user": {
                "enrollID": "orgAdmin",
                "enrollSecret": "87654321"
            }
        }).then((res) => {
        t.pass('Instantiate chaincode should be successful');
        t.end()
    }).catch((e) => {
        t.fail('Instantiate mycc3 should be successful')
        t.end()
    })
})

test('Instantiate chaincode channel code mycc4 in org1 on mychannel with error args', (t) => {
    sendToGateway('org1', route,
        {
            "chaincodeName": "mycc4",
            "channelName": "mychannel",
            "chaincodeVersion": "v1",
            "functionName": "Init",
            "args": [
                "100",
                "b",
                "200"
            ],
            "user": {
                "enrollID": "orgAdmin",
                "enrollSecret": "87654321"
            }
        }).then((res) => {
        t.fail('Instantiate chaincode should be reject');
        t.end()
    }).catch((e) => {
        t.equal(JSON.stringify(e), JSON.stringify([{
            url: 'grpcs://localhost:7051',
            response: 'Error: Transaction returned with failure: Incorrect number of arguments. Expecting 4'
        },
            {
                url: 'grpcs://localhost:7056',
                response: 'Error: Transaction returned with failure: Incorrect number of arguments. Expecting 4'
            },
            {
                url: 'grpcs://localhost:8051',
                response: 'Error: Transaction returned with failure: Incorrect number of arguments. Expecting 4'
            },
            {
                url: 'grpcs://localhost:8056',
                response: 'Error: Transaction returned with failure: Incorrect number of arguments. Expecting 4'
            },
            {
                compareResult: false
            }]))
        t.end()
    })
})


test('Instantiate chaincode channel code mycc5 in org1 on mychannel should be reject cause the different chaincode installed is different', (t) => {
    sendToGateway('org1', route,
        {
            "chaincodeName": "mycc5",
            "channelName": "mychannel",
            "chaincodeVersion": "v1",
            "functionName": "init",
            "args": [
                "a",
                "100",
                "b",
                "200"
            ],
            "user": {
                "enrollID": "orgAdmin",
                "enrollSecret": "87654321"
            }
        }).then((res) => {
        t.fail('Instantiate chaincode should be reject');
        t.end()
    }).catch((e) => {
        t.equal(JSON.stringify(e), JSON.stringify([{
            url: 'grpcs://localhost:7051',
            response: {
                status: 200,
                message: 'OK'
            }
        },
            {
                url: 'grpcs://localhost:7056',
                response: {
                    status: 200,
                    message: 'OK'
                }
            },
            {
                url: 'grpcs://localhost:8051',
                response: {
                    status: 200,
                    message: 'OK'
                }
            },
            {
                url: 'grpcs://localhost:8056',
                response: {
                    status: 200,
                    message: 'OK'
                }
            },
            {
                compareResult: false
            }]))
        t.end()
    })
})