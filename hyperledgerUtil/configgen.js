var config = require('../config');
var request = require("request")
var path = require('path')
var fs = require('fs')
var log4js = require('log4js');
var logger = log4js.getLogger('util/configgen');

var hfc = require('fabric-client');

logger.setLevel(config.gateway.logLevel);


const {Writable} = require('stream');
var exec = require('child_process').exec
var grpc = require('grpc');
var channelAPI = require('./channelAPI')
var configtxlatorUrl = "http://127.0.0.1:7059/"
var channelArtifactsPath = path.join(__dirname, "../artifacts/channel")
var cryptoConfigPath = path.join(__dirname, "../artifacts/crypto-config")
var configtxlatorI
class bufferStream extends Writable {
    constructor(options) {
        // Calls the stream.Writable() constructor
        super(options);
        // ...
        this.buffer = options.buffer
    }
    write(chunk, encoding, cb) {

        this.buffer.push(chunk)
    }
    getBuffer() {
        return Buffer.concat(this.buffer)
    }
}
var runConfigtxlator = () => {
    let configtxlatorPath = path.join(__dirname, '../gopath', 'src', 'configtxlator', 'configtxlator')
    let commend = configtxlatorPath + " start"
    var configtxlatorI = exec(commend, (err) => {
        if (err) {
            logger.warn(err)
        }
    })
}

process.on('beforExit', () => {
    try {
        configtxlatorI.kill()
    } catch (e) {}
})
runConfigtxlator()

var addOrgAndGetConfigUpdatePb = (channelName, userContext, mspID, type, provideMethod, opt) => {
    return getChannelConfigJsonBuffer(channelName, userContext).then((jsonBuffer) => {
        return extractConfigJson(jsonBuffer)
    }).then((configJson) => {

        let newMspConfig = makeNewMspConfig(provideMethod, type, mspID, opt)
        // console.log(newMspConfig)
        uConfigJson = makeUpdatedConfigJson(configJson, newMspConfig)
        // console.log(uConfigJson)
        return getConfigUpdatePbFromConfig(configJson, uConfigJson)
    })
}


var getChannelConfigJsonBuffer = (channelName, userContext, writePath) => {
    return channelAPI.getChannelConfig(channelName, userContext).then((configPbBuff) => {
        return postToConfigtxlator('decode', 'common.ConfigEnvelope', configPbBuff, writePath)
    })
}

var extractConfigJson = (buffer) => {
    configEnvelopeJson = JSON.parse(buffer)
    configJson = configEnvelopeJson.config
    return Promise.resolve(configJson)
}
var makeUpdatedConfigJson = (configJson, mspConfig) => {
    let updatedConfigJson = JSON.parse(JSON.stringify(configJson))
    let mspID = mspConfig.values.MSP.value.config.name

    updatedConfigJson.channel_group.groups.Application.groups[mspID] = mspConfig
    return updatedConfigJson
}
var getConfigUpdatePbFromConfig = (oConfigJson, uConfigJson) => {
    var promiseArr = []
    let oPromise = turnConfigJsonToPb(oConfigJson)
    let uPromise = turnConfigJsonToPb(uConfigJson)
    promiseArr.push(oPromise)
    promiseArr.push(uPromise)
    return Promise.all(promiseArr).then((res) => {
        oConfigPb = res[0]
        uConfigPb = res[1]
        return postToConfigtxlator('compute', '', [oConfigPb, uConfigPb])
    }, (err) => {
        throw new Error('cant not get transfer config JSON to config.pb ' + err)
    })

}
var turnConfigJsonToPb = (configJson, writePath) => {

    return postToConfigtxlator("encode", "common.Config", new Buffer.from(JSON.stringify(configJson)), writePath)
}
var makeNewMspConfig = (provideMethod, type, mspID, opt) => {
    let mspPath = null
    var cacertStr = null
    var tlscacertStr = null
    var admincertStr = null
    var hashFamily = opt.hashFamily || "SHA2"
    var hashFunction = opt.hashFunction || "SHA256"
    var exampleMspConfig = JSON.parse(fs.readFileSync(path.join(cryptoConfigPath, 'mspConfigEx.json')))
    if (provideMethod == 'local') {
        var type = type
        if (type == 'peer') {
            mspPath = path.join(cryptoConfigPath, "peerOrganizations", opt.orgName, "msp")
        } else {
            mspPath = path.join(cryptoConfigPath, "ordererOrganizations", opt.orgName, "msp")
        }
        try {
            var cacertFile = fs.readdirSync(path.join(mspPath, "cacerts"))
            var cacertBuffer = fs.readFileSync(path.join(mspPath, "cacerts", cacertFile[0]))
            cacertStr = cacertBuffer.toString('base64')

            var tlscacertFile = fs.readdirSync(path.join(mspPath, "tlscacerts"))
            var tlscacertBuffer = fs.readFileSync(path.join(mspPath, "tlscacerts", tlscacertFile[0]))
            tlscacertStr = tlscacertBuffer.toString('base64')

            var admincertFile = fs.readdirSync(path.join(mspPath, 'admincerts'))
            var admincertBuffer = fs.readFileSync(path.join(mspPath, "admincerts", admincertFile[0]))
            admincertStr = admincertBuffer.toString('base64')
        } catch (e) {
            throw new Error('cant not load fs for ' + opt.orgName + e)
        }
    } else {
        if (opt.cacertStr && opt.tlscacertStr && opt.admincertStr) {
            cacertStr = opt.cacertStr
            tlscacertStr = opt.tlscacertStr
            admincertStr = opt.admincertStr
        } else {
            throw new Error('Missing cacertStr, tlscacertStr or admincertStr')
        }
    }
    if (!mspID) {
        throw new Error('Missing specify mspID')
    }
    exampleMspConfig.policies.Admins.policy.value.identities[0].principal.msp_identifier = mspID
    exampleMspConfig.policies.Readers.policy.value.identities[0].principal.msp_identifier = mspID
    exampleMspConfig.policies.Writers.policy.value.identities[0].principal.msp_identifier = mspID
    exampleMspConfig.values.MSP.value.config.admins[0] = admincertStr
    exampleMspConfig.values.MSP.value.config.root_certs[0] = cacertStr
    exampleMspConfig.values.MSP.value.config.tls_root_certs[0] = tlscacertStr
    exampleMspConfig.values.MSP.value.config.name = mspID
    exampleMspConfig.values.MSP.value.config.crypto_config.signature_hash_family = hashFamily
    exampleMspConfig.values.MSP.value.config.crypto_config.identity_identifier_hash_function = hashFunction
    return exampleMspConfig
}

var postToConfigtxlator = (type, msgType, fileSourcesPath, writePath) => {
    return new Promise((rs, rj) => {
        let binaryData = null
        let oConfigPb = null
        let uConfigPb = null
        let toolName = null
        let formData = null
        if (type == 'compute') {
            msgType = 'update-from-configs'
            toolName = 'configtxlator'
            if (fileSourcesPath.length != 2) {
                return rj("error update compute source num");
            }
            if (fileSourcesPath[0].length < 50) {
                try {
                    oConfigPb = fs.readFileSync(fileSourcesPath[0])
                    uConfigPb = fs.readFileSync(fileSourcesPath[1])
                } catch (e) {
                    throw new Error('can not load files from ' + fileSourcesPath)
                }

            } else {
                oConfigPb = fileSourcesPath[0]
                uConfigPb = fileSourcesPath[1]
            }
            formData = {
                "original": {
                    value: oConfigPb,
                    options: {
                        "filename": "original"
                    }
                },
                "updated": {
                    value: uConfigPb,
                    options: {
                        "filename": "updated"
                    }
                },
                "channel": "mychannel"
            }
        } else {
            if (typeof fileSourcesPath == 'string') {
                try {
                    binaryData = fs.readFileSync(fileSourcesPath)

                } catch (e) {
                    throw new Error('can not load files from ' + fileSourcesPath)
                }
            } else {
                binaryData = fileSourcesPath
            }
            toolName = 'protolator'
        }
        let url = configtxlatorUrl + toolName + '/' + type + '/' + msgType
        if (type == 'decode') {
            var req = request.post(url, {
                body: binaryData
            }, (err, httpResponse, body) => {
                if (err) {
                    rj(err)
                }
                if (writePath) {
                    fs.writeFileSync(writePath, body)
                }
                rs(body)
            })
        } else {
            var bs = new bufferStream({
                buffer: []
            })
            var buffer = []
            request.post(url, {
                body: binaryData,
                formData: formData
            }).on('response', (respon) => {
            }).pipe(bs).on('finish', () => {
                if (writePath) {
                    fs.writeFileSync(writePath, bs.getBuffer())
                }
                rs(bs.getBuffer())
            })
        }

    })


}
module.exports = {
    getChannelConfigJsonBuffer: getChannelConfigJsonBuffer,
    extractConfigJson: extractConfigJson,
    makeNewMspConfig: makeNewMspConfig,
    addOrgAndGetConfigUpdatePb: addOrgAndGetConfigUpdatePb
}