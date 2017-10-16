require('./mongo')
var fs = require('fs');
var path = require('path');
let methods = fs.readdirSync(path.join(__dirname, 'method'))
methods.forEach((methodName) => {
    if (path.extname(methodName) == '.js') {
        let methodModule = require('./method/' + methodName);
        let exportName = methodName.replace('.js', 'Method');
        module.exports[exportName] = methodModule;
    }
})