/* eslint consistent-return:0 */
var hyperledgerUtil = require('./hyperledgerUtil')
var fs = require('fs')
var fx = require('mkdir-recursive')
var session = require('express-session')
var passport = require('passport');
require('./monitor/passportConfig/passportStragy')(passport);
require('./custermize')
var config = require('./config')
var path = require('path')
var logPath = path.join(config.logPath, config.orgName)
fx.mkdirSync(logPath);
var https = require('https');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
process.env.GOPATH = path.resolve(__dirname, './gopath')
var swaggerTools = require('swagger-tools');
var jsyaml = require('js-yaml');
var options = {
    swaggerUi: path.join(__dirname, './swagger.json'),
    controllers: path.resolve(__dirname, './swagger', 'controllers'),
    useStubs: process.env.NODE_ENV === 'development' // Conditionally turn on stubs (mock mode)
};
var spec = fs.readFileSync(path.join(__dirname, './swagger/swagger.yaml'), 'utf8');
var swaggerDoc = jsyaml.safeLoad(spec);
swaggerDoc.host = config.swagger.hostName + ':' + config.port;
if (config.tlsOptions.tlsEnable) {
    swaggerDoc.schemes = ['https']
}
var log4js = require('log4js');
var logger = log4js.getLogger('app');
const express = require('express');
log4js.configure({
    appenders: [{
        type: 'console'
    }, {
        type: "dateFile",
        pattern: "yyyy-MM-dd.log",
        alwaysIncludePattern: true,
        filename: path.join(logPath, config.orgName + "-getageway-")
    }],
    replaceConsole: true
});
logger.setLevel(config.logLevel);

const resolve = require('path').resolve;
const app = express();
var server = require('http').createServer(app);
require('./io').init(server);
var monitor = require('./monitor')
var API = require('./API')

swaggerTools.initializeMiddleware(swaggerDoc, function(middleware) {
    // Start the server

    app.use(bodyParser());
    app.use((req, res, next) => {
        for (let content in req.body) {
            if (req.body[content].type && req.body[content].type == 'Buffer') {
                req.body[content] = new Buffer.from(req.body[content].data);
            }
        }
        next();
    })
    app.use(cookieParser());
    app.use(session({
        key: config.orgName + 'cookie',
        secret: '123456789',
        cookie: {
            maxAge: 60 * 60 * 1000
        }
    }));

    app.use(passport.initialize());
    app.use(passport.authenticate('session'));
    app.use('*', function(req, res, next) {
        logger.info('get requst ' + req.baseUrl);
        logger.debug('request body ' + JSON.stringify(req.body));
        next()
    });
    app.use(API);

    // Interpret Swagger resources and attach metadata to request - must be first in swagger-tools middleware chain
    app.use(middleware.swaggerMetadata());

    // Validate Swagger requests
    app.use(middleware.swaggerValidator());

    // Route validated requests to appropriate controller
    app.use(middleware.swaggerRouter(options));

    // Serve the Swagger documents and Swagger UI

    app.use(middleware.swaggerUi());
    app.use(express.static('public'));

    // setup(app, {
    //     outputPath: resolve(process.cwd(), 'build'),
    //     publicPath: '/',
    // });


    var port = config.port;
    let tlsOptions = config.tlsOptions;
    if (tlsOptions.tlsEnable) {
        try {
            var privateKey = fs.readFileSync(path.join(__dirname, "ssl", config.tlsOptions.keyFile));
            var cert = fs.readFileSync(path.join(__dirname, "ssl", config.tlsOptions.certFile));
            https.createServer({
                key: privateKey,
                cert: cert
            }, app).listen(port)

        } catch (e) {
            throw new Error("Set up SSL failed :" + e.toString());
            process.exit(0)
        }
    } else {
        server.listen(port);
    // app.listen(port);
    }
    hyperledgerUtil.init().then(() => {
        if (config.monitor.enabled) {
            monitor.initDB()
        }
    })
    // hyperledgerUtil.user.userInit().then(() => {
    //     let admin = hyperledgerUtil.user.getOrgAdmin()

    //     hyperledgerUtil.eventHub.resumeEventHubFromEventDbForUrl(admin)
    //     if (config.monitor.enabled) {
    //         monitor.initDB()
    //     }
    // })

});

