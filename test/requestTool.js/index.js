var request = require('request')
var config = require('../../config')
var gatewayAddressMap = {
    org1: "http://localhost:4001",
    org2: "http://localhost:4002",
    org3: "http://localhost:4003"
}
module.exports.sendToGateway = function (orgName, router, body) {
    return new Promise((rs, rj) => {
        request.post({
            url: gatewayAddressMap[orgName] + router,
            body: body,
            json: true
        }, (err, resp, body) => {
            if (err) {
                console.log('got error')
                rj(err.toString())
            } else {
                if (resp.statusCode != 200) {
                    console.log('reject')
                    if (body.sdkResult) {
                        console.log(body.sdkResult)
                        rj(body.sdkResult)
                    } else {
                        console.log(body)
                        rj(body)
                    }
                } else {
                    console.log(body)
                    rs(body.sdkResult)
                }
            }
        })
    })
}
