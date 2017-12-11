



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
var eventApp = require('../testEnv/eventHub-receive-server/app')
eventApp.app.listen(6000)

//Will intall mycc1 => simple cc with endorsement policy org1 and org2
//mycc2 => only install in org1 so should be reject
//mycc3 => simple cc without endorsement policy
//mycc4 => simpel cc but with error args
//mycc5 => install different chaincode but with same name mycc5, should not be instantiate
function clearEvent() {
    eventApp.emitter.removeAllListeners()
}
function closeServer() {
    try {
        eventApp.app.close()
    } catch (e) {
        console.log(e)
    }
}
test('Register the ccEvent from org1 gateway for eventCC test event', (t) => {
    sendToGateway('org1', route,
        {
            "chaincodeName": "eventCC",
            "eventName": "test",
            "peerName": "peer1",
            "url": "http://localhost:6000/ccEvent",
            "user": {
                "enrollID": "orgAdmin",
                "enrollSecret": "87654321"
            }
        }).then((res) => {
        t.pass('registe event success')
        t.end()
    }).catch((e) => {
        console.log(e)
        t.fail('reigster event failed');
        t.end()
    })
})
test('Register the blockEvent from org1 gateway for eventCC test event', (t) => {
    sendToGateway('org1', '/event/register/blockEvent/url',
        {
            "peerName": "peer1",
            "url": "http://localhost:6000/blockEvent",
            "user": {
                "enrollID": "orgAdmin",
                "enrollSecret": "87654321"
            }
        }).then((res) => {
        t.pass('registe event success')
        t.end()
    }).catch((e) => {
        console.log(e)
        t.fail('reigster event failed');
        t.end()
    })
})
test('trigger the invoke for eventCC and wait for response event receiver', (t) => {
    sendToGateway('org1', '/chaincode/invoke',
        {
            "chaincodeName": "eventCC",
            "channelName": "mychannel",
            "functionName": "invoke",
            "args": [],
            "user": {
                "enrollID": "orgAdmin",
                "enrollSecret": "87654321"
            }
        }).then((res) => {
        let eventCount = 0;
        setTimeout(() => {
            if (eventCount != 2) {
                return Promise.reject('times up');
                clearEvent()
            }
        }, 1000)
        eventApp.emitter.on('ccEvent', () => {
            console.log('receive cc event');
            eventCount++;
            if (eventCount == 2) {
                t.pass('receive two events')
                clearEvent();
                t.end()
            }
        })
        eventApp.emitter.on('blockEvent', () => {
            console.log('receive block event');
            eventCount++;
            if (eventCount == 2) {
                t.pass('receive two events');
                clearEvent();
                t.end()
            }
        })
    }).catch((e) => {
        t.fail('recieve event failed');
        t.end()
    })
})
test('trigger the invoke for mycc and wait for response event receiver event counter should reveice one event', (t) => {
    sendToGateway('org1', '/chaincode/invoke',
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
        let eventCount = 0;
        setTimeout(() => {
            if (eventCount == 1) {
                clearEvent();
                t.pass('times up receive only a event');
                t.end();
            } else {
                clearEvent();
                t.fail('error event number server recived');
                t.end();
            }
        }, 1000)
        eventApp.emitter.on('ccEvent', () => {
            console.log('receive cc event');
            eventCount++;
        })
        eventApp.emitter.on('blockEvent', () => {
            console.log('receive block event');
            eventCount++;
        })

    }).catch((e) => {
        t.fail('recieve event failed');
        t.end()
    })
})
test('Double register the ccEvent from org1 gateway for eventCC test event', (t) => {
    sendToGateway('org1', '/event/register/ccEvent/url',
        {
            "chaincodeName": "eventCC",
            "eventName": "test",
            "peerName": "peer1",
            "url": "http://localhost:6000/ccEvent",
            "user": {
                "enrollID": "orgAdmin",
                "enrollSecret": "87654321"
            }
        }).then((res) => {
        t.fail('regiter event should not success')
        t.end()
    }).catch((e) => {
        console.log(e)
        t.pass('reigster event failed');
        t.end()
    })
})
test('register the ccEvent from org1 unexisted peer', (t) => {
    sendToGateway('org1', '/event/register/ccEvent/url',
        {
            "chaincodeName": "eventCC",
            "eventName": "test",
            "peerName": "peer3",
            "url": "http://localhost:6000/ccEvent",
            "user": {
                "enrollID": "orgAdmin",
                "enrollSecret": "87654321"
            }
        }).then((res) => {
        t.fail('regiter event should not success')
        t.end()
    }).catch((e) => {
        console.log(e)
        t.equal(e, 'Error: can not get event hub from peer3');
        t.end()
    })
})
test('Unregister the ccEvent from org1 gateway for eventCC test event', (t) => {
    sendToGateway('org1', '/event/unregister/ccEvent/url',
        {
            "chaincodeName": "eventCC",
            "eventName": "test",
            "peerName": "peer1",
            "url": "http://localhost:6000/ccEvent",
            "user": {
                "enrollID": "orgAdmin",
                "enrollSecret": "87654321"
            }
        }).then((res) => {
        t.pass('unregiste event success')
        t.end()
    }).catch((e) => {
        console.log(e)
        t.fail('reigster event failed');
        t.end()
    })
})
test('Unregister the block from org1 gateway for eventCC test event', (t) => {
    sendToGateway('org1', '/event/unregister/blockevent/url',
        {
            "chaincodeName": "blockEvent",
            "eventName": "test",
            "peerName": "peer1",
            "url": "http://localhost:6000/blockEvent",
            "user": {
                "enrollID": "orgAdmin",
                "enrollSecret": "87654321"
            }
        }).then((res) => {
        t.pass('unregiste event success')
        t.end()
    }).catch((e) => {
        console.log(e)
        t.fail('reigster event failed');
        t.end()
    })
})