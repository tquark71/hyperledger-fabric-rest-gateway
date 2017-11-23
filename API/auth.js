var router = require('./index')
var config = require('../config')
var log4js = require('log4js');
var logger = log4js.getLogger('API/auth');
var myOrgName = config.fabric.orgName;
var Dbs = require('../Db')
var hyUtil = require('../hyperledgerUtil');
const authRouterList = [{
    name: 'networkConfig',
    type: "obj"
}];


authRouterList.forEach((routerObj) => {
    router.use(`/${routerObj.name}*`, (req, res, next) => {
        logger.debug(`receive ${routerObj.name} request for auth`)
        if (routerObj.type == 'obj') {
            let user = req.body.user;
            hyUtil.user.matchUserDb(user.enrollID, user.enrollSecret).then((result) => {
                var userObj = hyUtil.user.getUser(user.enrollID)
                req.gUser = userObj;
                next();
            }).catch((e) => {
                req.gErr = e;
                req.gUser = null;
                next();
            })
        }

    })
})