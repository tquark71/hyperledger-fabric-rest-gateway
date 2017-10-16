# Hyperledger fabric 1.0 gateway

A sample Node.js app wrapped API server used to recieve request and send to Fabric network. This gateway is desinged for organization unit.

### Prerequisites and setup:

* [Docker](https://www.docker.com/products/overview) - v1.12 or higher
* [Docker Compose](https://docs.docker.com/compose/overview/) - v1.8 or higher
* [Git client](https://git-scm.com/downloads) - needed for clone commands
* **Node.js** v6.2.0 - 6.10.0 ( __Node v7+ is not supported__ )
* Download docker images




# Install
Use following CLI to install dependency .
```
./insatll.sh
```
This script will install npm packages and the configtxlator tool.
# Getting Start
### Set up the Fabirc network.
We will set up a network like following
* 2 CAs
* A SOLO orderer
* 4 peers (2 peers per Org)
```
cd artifacts/composeFile
./startup_prod.sh
```
All artifact has been settled at correct folder, we can replace then with your network's material in the future.

### Set up two gateway for two org.
Before starting this gateway, we should know this gateway was designed based on a organization, so that we have to start two instances to simulate two organization interact in the Fabric newtowrk.So we need to config ./config.json as follwoing
```json
{
    "orgName": "org1",
    "port": "4001",
    "keyValueStore": "./volume/fabric1.0/keyValStore",
    "logPath": "./volume/logs",
    "eventWaitTime": "30000",
    "ca": {
        "admin": {
            "enrollmentID": "admin",
            "enrollmentSecret": "adminpw"
        }
    },
    "eventHub": {
        "retryTimes": "10"
    },
    "storage": {
        "type": "mongo",
        "DbAdress": {
            "ip": "localhost",
            "port": "27017",
            "username": "",
            "password": ""
        }
    },
    "monitor": {
        "enabled": false,
        "interval": 3000
    },
    "tlsEnable": "true",
    "mode": "prod",
    "logLevel": "DEBUG"
}
```
Then start  org1's gateway
```
node app.js
```
Change the configuration for org2
```json
{
    "orgName": "org2",
    "port": "4002",
    "keyValueStore": "./volume/fabric1.0/keyValStore",
    "logPath": "./volume/logs",
    "eventWaitTime": "30000",
    "ca": {
        "admin": {
            "enrollmentID": "admin",
            "enrollmentSecret": "adminpw"
        }
    },
    "eventHub": {
        "retryTimes": "10"
    },
    "storage": {
        "type": "mongo",
        "DbAdress": {
            "ip": "localhost",
            "port": "27017",
            "username": "",
            "password": ""
        }
    },
    "monitor": {
        "enabled": false,
        "interval": 3000
    },
    "tlsEnable": "true",
    "mode": "prod",
    "logLevel": "DEBUG"
}
```
Then start org2's gateway
```
node app.js
```

Now we have two gateway instance for org1 and org2 seperately which listening on 4001 and 4002 respectively.

### Send reqest with Swagger UI
Use your browser to send request with swagger UI.
Swagger UI is in the __localhost:4001/docs__ (org1) and __localhost:4002/docs__ (org2)

### Create channel
Go to localhost:4001/docs find collection __"Channel"__ in th swagger UI and find __/channel/create__, there is an example request like following

```json
{
  "channelName": "mychannel",
  "channelConfigSource": "mychannel.tx",
  "user": {
    "enrollID": "orgAdmin",
    "enrollSecret": "87654321"
  }
}
```
You sould recieve response as following if everything good.
```
{"sdkResult":"Channel 'mychannel' created Successfully"}
```

This request means use organization admin to send a create channel request to orderer peer with the configEnvelope __mychannel.tx__. ChannelConfigSource will map to file in __./artifacts/channel__ folder.

### Join channel
Go to localhost:4001/docs find collection __"Channel"__ and find __/channel/join__, there is an example request like following

```json
{
  "channelName": "mychannel",
  "user": {
    "enrollID": "orgAdmin",
    "enrollSecret": "87654321"
  }
}
```
This request means use organization admin to send a join request to orderer peer.
You should recieve response as following.
```
{"sdkResult":"Successfully joined peers in organization org1 to the channel 'mychannel'"}
```

For org2, just go to localhost:4002 and do the same things then you should get same response.
```
{"sdkResult":"Successfully joined peers in organization org2 to the channel 'mychannel'"}
```

### Install chaincode
Go to localhost:4001/docs find collection __"Chaincode"__ and find __/chaincode/install__, there is an example request like following
```json
{
  "chaincodeName": "mycc",
  "channelName": "mychannel",
  "chaincodePath": "chaincodes/testCC",
  "chaincodeVersion": "v1",
  "sourceType": "sourceCode",
  "user": {
    "enrollID": "orgAdmin",
    "enrollSecret": "87654321"
  }
}
```
This request means send a install request to all endorser peer in org1 with organization admin's signiture. Chaincode Path will map to __./gopath/src__ folder name.

If everything work well, you should recieve such response
```
{"sdkResult":"Successfully Installed chaincode on organization org1"}
```
Then use same steps to install chaincode "mycc" on org2's endorser peers.

### Instantiate Chaincodes
Go to localhost:4001/docs find collection __"Chaincode"__ and find __/chaincode/install__, there is an example request like following
```json
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
            "mspId": "Org1MSP"
          }
        }
      ],
      "policy": {
        "1-of": [
          {
            "signed-by": 0
          }
        ]
      }
    }
  },
  "user": {
    "enrollID": "orgAdmin",
    "enrollSecret": "87654321"
  }
}
```
This request means send a instantiate request to all org1 and org2's endorser peer to init chaincodes "mycc:v1"  with the args ["a","100","b","200"], the opt section means you need get org1's endorsement for invoke chaincode's function in the future, ref: http://hyperledger-fabric.readthedocs.io/en/latest/endorsement-policies.html

Intantiate request just need to be send one times, so you can choose org1 or org2 do this step.

### Invoke Chaincodes
Go to localhost:4001/docs find collection __"Chaincode"__ and find __/chaincode/invoke__, there is an example request like following
```json
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
}
```
This request means send a invoke request to all org1 and org2's endorser peer to endorse chaincodes "mycc"  with the args ["move","a","b","10"].Is any endorser peer's response is good, gateway will forward tx to orderer to order txs into a block. Response will be returned when the tx has been committed.

If everything work well, you should get following response.

```
{"sdkResult":"Aval = 90, Bval = 210\n"}
```
The content of sdkResult was defined in the chaincode.

You can try to use org2 to invoke the chaincode with different args.

### Invoke Chaincodes according the endorsemnet policy.
Go to localhost:4001/docs find collection __"Chaincode"__ and find __/chaincode/invokeE__, there is an example request like following
```json
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
}
```
This request means send a invoke request accroding to the mycc's chaincode endorsemnet policy, for example, we instantiated "mycc" with the policy that specified org1 need to enderse in the future, so behind this api, gateway will send tx to any org1's peer, if that peer is crashing for some reason, gateway will automatically send to others peer in org1. Until the endorsement policy was fullfilled, gateway will forward tx to order to order txs into a block. Response will be returned when the tx has been committed.

### Query Chaincodes
Go to localhost:4001/docs find collection __"Chaincode"__ and find __/chaincode/query__, there is an example request like following
```json
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
}
```
This request will send to all endorser peer in org1 then gateway will compare all responses, if all response are the same, gateway will just return one response, or it will return all response.

If anything work well, you should get such response

```
{"sdkResult":"90"}
```




# Deep Dive
To use this gateway, first, you have to config your network-config.json at __./network-config.json__, there are two section in it, network config and channel config.

### Network Config
In this session, you will see configuration like belowing.
```
 "network-config": {
        "orderer": {
            "url": "grpcs://localhost:7050",
            "server-hostname": "orderer.example.com",
            "tls_cacerts": "../artifacts/crypto-config/ordererOrganizations/example.com/orderers/orderer.example.com/tls/ca.crt"
        },
        "org1": {
            "name": "peerOrg1",
            "mspid": "Org1MSP",
            "ca": "https://localhost:7054",
            "peer1": {
                "requests": "grpcs://localhost:7051",
                "events": "grpcs://localhost:7053",
                "server-hostname": "peer0.org1.example.com",
                "tls_cacerts": "../artifacts/crypto-config/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt"
            },
            "peer2": {
                "requests": "grpcs://localhost:7056",
                "events": "grpcs://localhost:7058",
                "server-hostname": "peer1.org1.example.com",
                "tls_cacerts": "../artifacts/crypto-config/peerOrganizations/org1.example.com/peers/peer1.org1.example.com/tls/ca.crt"
            },
            "admin": {
                "key": "../artifacts/crypto-config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/keystore/",
                "cert": "../artifacts/crypto-config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/signcerts"
            }
        },
        "org2": {
            "name": "peerOrg2",
            "mspid": "Org2MSP",
            "ca": "https://localhost:8054",
            "peer1": {
                "requests": "grpcs://localhost:8051",
                "events": "grpcs://localhost:8053",
                "server-hostname": "peer0.org2.example.com",
                "tls_cacerts": "../artifacts/crypto-config/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt"
            },
            "peer2": {
                "requests": "grpcs://localhost:8056",
                "events": "grpcs://localhost:8058",
                "server-hostname": "peer1.org2.example.com",
                "tls_cacerts": "../artifacts/crypto-config/peerOrganizations/org2.example.com/peers/peer1.org2.example.com/tls/ca.crt"
            },
            "admin": {
                "key": "../artifacts/crypto-config/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp/keystore/",
                "cert": "../artifacts/crypto-config/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp/signcerts"
            }
        }
...
    }
```
Please remeber put your __crypto material__, generated by cryptogen tool, in the __./artifacts/crypto-config/__ folder. You need to point your cert and keys for the application to sign your request and send to Fabric network.

### Channel Config
You will see another section in network-config.json like following.

```
"channelConfig": {
        "mychannel": {
            "orderers": [
                "orderer"
            ],
            "peers": {
                "org1": [{
                    "name": "peer1",
                    "type": "e"
                }, {
                    "name": "peer2",
                    "type": "e"
                }],
                "org2": [{
                    "name": "peer1",
                    "type": "e"
                }, {
                    "name": "peer2",
                    "type": "c"
                }]

            }
        }
    }
```
In above example, there is a channel named "mychanne", org1 and org2 have two peers join in it.
The "name" field  will map to the network-config's peer name. For exapmle, JSON
```
{
   "name": "peer1",
    "type": "e"
}
```
in the org1 array, will map to network config's JSON
```
 "peer1": {
                "requests": "grpcs://localhost:7051",
                "events": "grpcs://localhost:7053",
                "server-hostname": "peer0.org1.example.com",
                "tls_cacerts": "../artifacts/crypto-config/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt"
            },
```
The "type" field means the peer is "endorser" or "committer". This field will attect gateway's behavior when receiving some specific reqest such as install, instantiate and so on.

### Config.json
This section will explain all attribute in config.json

## orgName
Which organization the gateway represented, it will map to __network-config.json__ . For example, org2 will reflect to
```
"network-config": {
	...
	"org2": {
            "name": "peerOrg2",
            "mspid": "Org2MSP",
            "ca": "https://localhost:8054",
            "peer1": {
                "requests": "grpcs://localhost:8051",
                "events": "grpcs://localhost:8053",
                "server-hostname": "peer0.org2.example.com",
                "tls_cacerts": "../artifacts/crypto-config/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt"
            },
    ...
        },
```
### port
Port the gateway will listen on.

### keyValueStore
The folder store the key files.

### logPath
The folder store the logger file.

### eventWaitTime
The time a invoke or query will wait for tx to be accepted. (ms)

### ca/admin
The ID and password used to login fabric-ca. It should be same with the -b section (-b admin:adminpw) when setting up the fabric-ca docker.

### evenHub/retryTimes
This attribute will affect the retry times when a event need to be sent to other url.

### sotrage
We select Mongo DB for our storage now.

### monitor/enable
Is monitor module enabel, if true, the API collection of monitor can be used.

### monitor/interval
The interval monitor used to update its status.

### tlsEnable
If your Fabric network has turn on the TLS, you should set it true

### mode
If your Fabirc network set up with prod, it should be prod, or you can set it dev.

### logLevel
Standard value are "ERROR" "WARN" "INFO" "DEBUG"


### API LIST
Please refer to swagger/swagger.yaml or you can set up gateway then go to /docs to test all API.