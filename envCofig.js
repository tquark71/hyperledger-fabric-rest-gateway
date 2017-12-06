

function replaceByEnv(configs, paramParentArray = []) {
    var env = process.env
    for (let config in configs) {

        let childParamParentArray = JSON.parse(JSON.stringify(paramParentArray))
        childParamParentArray.push(config)
        if (typeof configs[config] == 'object' && !Array.isArray(configs[config])) {
            replaceByEnv(configs[config], childParamParentArray)
        } else {
            let envName = ""
            for (let paramString of paramParentArray) {
                envName += paramString.toUpperCase()
                envName += "_"
            }
            envName += config.toUpperCase()
            if (env[envName]) {
                if (env[envName] == "true") {
                    configs[config] = true
                } else if (env[envName] == "false") {
                    configs[config] = false

                } else {
                    configs[config] = env[envName]
                }
            }
        }
    }
}
module.exports = replaceByEnv