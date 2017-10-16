var Db
var config = require('../config')
Db = require('./' + config.storage.type)

module.exports = Db