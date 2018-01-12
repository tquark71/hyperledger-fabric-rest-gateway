var request = require('request')
var config = require('../../config')
var gatewayAddressMap = {
    org1: "http://localhost:4001",
    org2: "http://localhost:4002",
    org3: "http://localhost:4003",


}
module.exports.sendToGateway = function(orgIndex, router, body) {
    return new Promise((rs, rj) => {
        request.post({
            url: gatewayAddressMap[orgIndex] + router,
            body: body,
            json: true
        }, (err, resp, body) => {
            if (err) {
                rj(err.toString())
            } else {
                if (resp.statusCode != 200) {
                    console.log('reject')
                    if (body.sdkResult) {
                        rj(body.sdkResult)
                    } else {
                        rj(body)
                    }
                } else {
                    rs(body.sdkResult)
                }
            }
        })
    })
}
