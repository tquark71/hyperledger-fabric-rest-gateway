var Moment = require("moment")
var log4js = require('log4js');
var logger = log4js.getLogger('requestPlugin');
var Promise = require('bluebird')
var pluginList = {
    instantiate: [() => {
        return Promise.resolve()
    }],
    invoke: [() => {
        return Promise.resolve()
    }],
    query: [() => {
        return Promise.resolve()
    }],
    upgrade: [() => {
        return Promise.resolve()
    }],
    install: [() => {
        return Promise.resolve()
    }],
    queryHistory: [() => {
        return Promise.resolve()
    }]
}
var individualPluginList = {}

function setPlugin(type, func) {
    // logger.debug('setPlugin %s', type)
    pluginList[type].push(func)
    // logger.debug(pluginList)
}

function getPluginAndProcess(type, request, opt) {
    // logger.debug('start ProcessPlugin %s', type)
    return new Promise((rs, rj) => {
        if (opt && opt.pluginList) {
            // logger.debug("request have opt plugnlist")
            return Promise.each(opt.pluginList, (plugnListName) => {
                return individualPluginList[plugnListName](request)
            }).then(() => {
                rs()
            }).catch((e) => {
                logger.warn(e)
                rs()
            })
        } else {
            rs()
        }
    }).then(() => {
        // logger.debug('finish opt request process')
        // logger.debug(request)
        return Promise.each(pluginList[type], (plunginFunc) => {
            // logger.debug(plunginFunc)
            return plunginFunc(request).then(() => {
                // logger.debug(request)
            })
        })
    })

}
/*
 add some useful plungin so we can reuse in the future
*/
individualPluginList['transferTime'] = function(request) {
    return new Promise((rs, rj) => {
        // Transfer some field in the request
    })
}
individualPluginList['addTime'] = function(request) {
    return new Promise((rs, rj) => {
        // logger.debug('execute addTime')
        request.args.unshift(getTime())
        rs()
    })
}

function getTime() {
    return Moment().format("YYYYMMDDHHmmss")
}


module.exports = {
    setPlugin: setPlugin,
    getPluginAndProcess: getPluginAndProcess,
    individualPluginList: individualPluginList
}