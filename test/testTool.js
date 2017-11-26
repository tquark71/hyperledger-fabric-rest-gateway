module.exports.delay = (s) => {
    return new Promise((rs, rj) => {
        setTimeout(() => {
            rs("OK")
        }, s)
    })
}