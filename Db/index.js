var Db
var config = require('../config')
Db = require('./' + config.gateway.storage.type)

module.exports = Db