var config = require('../config')
var util = require('util');
var path = require('path')
var client = require('./client')
var caClient
var hfc = require('fabric-client');
var User = require('fabric-client/lib/User.js');
var fs = require('fs')
//used for fs user data can be replace if we use runtime db in the future
var userDataPath = path.join(__dirname, "../Db", 'userData.json')
var getUserData = () => {
    let userData = fs.readFileSync(userDataPath)
    userData = JSON.parse(userData)
    return userData
}
var userData = getUserData()
var networkConfig = require('./networkConfig');
var ORGS = networkConfig.getNetworkConfig();
var Promise = require('bluebird')
var myOrgName = config.fabric.orgName
var mspid = ORGS[myOrgName].mspid
var fs = require('fs')
var log4js = require('log4js');
var logger = log4js.getLogger('util/user');
var gatewayEventHube = require('../gatewayEventHub');
var adminKeyWatcher;
var adminCertWatcher;
var cryptoConfigPath = config.gateway.cryptoConfigPath;
gatewayEventHube.on('n-org-revise', (reviseInfo) => {
    if (reviseInfo.orgName == myOrgName && reviseInfo.attribute == 'admin') {
        //turn off the original folder watcher;
        adminKeyWatcher.close();
        adminCertWatcher.close();
        enrollOrgAdmin(true).then((user) => {
            logger.debug('refresh org admin by change network-config admin success!');
            gatewayEventHube.emit('admin-changed');
        });
    }
})
logger.setLevel(config.gateway.logLevel);
var users = {}
var orgAdminEnrollID = "orgAdmin"
var caAdminEnrollID = "caAdmin"

function readAllFiles(dir) {
    var files = fs.readdirSync(dir);
    var certs = [];
    files.forEach((file_name) => {
        let file_path = path.join(dir, file_name);
        let data = fs.readFileSync(file_path);
        certs.push(data);
    });
    return certs;
}
var enrollOrgAdmin = function(forceRefresh) {
    logger.debug('start to enroll org admin')
    var keyPath

    keyPath = path.resolve(__dirname, '../', cryptoConfigPath, ORGS[myOrgName].admin.key);

    logger.debug('load org amdin key from ' + keyPath)
    var certPath = path.resolve(__dirname, '../', cryptoConfigPath, ORGS[myOrgName].admin.cert);
    logger.debug('load org amdin cert from ' + certPath)

    adminKeyWatcher = fs.watch(path.resolve(keyPath), () => {
        adminKeyWatcher.close();
        enrollOrgAdmin(true)
    })
    adminCertWatcher = fs.watch(path.resolve(certPath), () => {
        adminCertWatcher.close();
        enrollOrgAdmin(true)
    })
    return client.getUserContext(orgAdminEnrollID, true).then((user) => {
        if (forceRefresh) {
            user = null
        }
        if (user) {
            logger.info('get orgAdmin from presist')

            return Promise.resolve(user)
        } else {
            var admin = ORGS[myOrgName].admin;

            var keyPEM = readAllFiles(keyPath)[0]
            var certPEM = readAllFiles(certPath)[0];
            logger.debug('start to load certs and key for orgAdmin')
            return client.createUser({
                username: orgAdminEnrollID,
                mspid: mspid,
                cryptoContent: {
                    privateKeyPEM: keyPEM,
                    signedCertPEM: certPEM
                }
            })
        }
    }).then((orgAdmin) => {
        logger.info('orgAdmin enrolled success')
        users[orgAdminEnrollID] = orgAdmin
        orgAdmin.isOrgAdmin = true;

        return Promise.resolve(orgAdmin)
    })

};
var enrollCaAdmin = function() {
    var username = config.fabric.ca.admin.enrollmentID
    var password = config.fabric.ca.admin.enrollmentSecret
    var member;
    // clearing the user context before switching


    return client
        .getUserContext(config.fabric.ca.admin.enrollmentID, true)
        .then((user) => {
            if (user) {
                logger.info('Successfully loaded ca adminuser from persistence');
                users[caAdminEnrollID] = user;
                return user;
            } else {
                logger.debug("enroll CaAdmin start")
                // need to enroll it with CA server
                return caClient
                    .enroll({
                        enrollmentID: username,
                        enrollmentSecret: password
                    })
                    .then((message) => {
                        if (message && typeof message === 'string' && message.includes(
                                'Error:')) {
                            logger.error(username + ' enrollment failed' + message);
                            return Promise.reject(message);
                        }
                        logger.info('caAdmin enrolled successfully');

                        member = new User(username);
                        member._enrollmentSecret = password;
                        return member.setEnrollment(message.key, message.certificate, mspid);
                    })
                    .then(() => {
                        users[caAdminEnrollID] = member
                        member.isCaAdmin = true;

                        return client.setUserContext(member)

                    }).catch((err) => {
                    logger.error('Failed to enroll and persist user. Error: ' + err.stack ?
                        err.stack :
                        err);
                    return Promise.reject(err)
                });
            }
        });

};

var registarUser = (username, enrollmentSecret) => {
    var member;

    return matchUserDb(username, enrollmentSecret).then(() => {
        return client.getUserContext(username, true)
    }, (err) => {
        return Promise.reject(err)
    }).then((user) => {
        if (user && user.isEnrolled()) {
            logger.info('Successfully loaded member' + username + 'from persistence');
            return enrollmentSecret
        } else {

            return getAdminUser().then(function(adminUserObj) {
                member = adminUserObj;

                return caClient.register({
                    enrollmentID: username,
                    enrollmentSecret: enrollmentSecret,
                    affiliation: myOrgName + '.department1'
                }, member);
            }).then((secret) => {
                userData[username] = secret
                return secret
            }, (err) => {
                logger.error(username + ' failed to register ' + err);
                return Promise.reject(err)

            })
        }
    })

}
var enrollUser = (enrollID, enrollmentSecret) => {
    return matchUserDb(enrollID, enrollmentSecret)
        .then(() => {
            return client
                .getUserContext(enrollID, true)
        }).then((user) => {
        if (user && user.isEnrolled()) {
            logger.info('Successfully loaded member from persistence');
            return user;
        } else {

            return caClient
                .enroll({
                    enrollmentID: enrollID,
                    enrollmentSecret: enrollmentSecret
                })
                .then((message) => {
                    if (message && typeof message === 'string' && message.includes('Error:')) {
                        logger.error(enrollID + ' enrollment failed ' + message);
                        return message;
                    }
                    logger.info(enrollID + ' enrolled successfully');

                    member = new User(enrollID);
                    member._enrollmentSecret = enrollmentSecret;
                    return member.setEnrollment(message.key, message.certificate, ORGS[myOrgName].mspid);
                })
                .then(() => {
                    client.setUserContext(member);
                    return member;
                }, (err) => {
                    logger.error(util.format('%s enroll failed: %s', enrollID, err.stack ?
                        err.stack :
                        err));
                    return Promise.reject(err)
                })
        }
    })
}

var registerAndEnrollUser = function(userName, password, adminUserContext) {
    var enrollmentSecret = null;
    if (userData[userName]) {
        if (userData[userName] == password) {
            return client.getUserContext(userName, true).then((user) => {
                if (user && user.isEnrolled()) {
                    users[userName] = user
                    return util.format("user %s is register and can be used now", userName)
                } else {
                    return innerRegisterAndEnrollMethod(userName, password, adminUserContext).then((member) => {
                        userData[userName] = password
                        updateUserData()
                        return util.format("user %s is register and can be used now", userName)
                    })
                }

            })
            throw new Error("The user has been register and you input wrong pass word")
        }
    } else {
        return innerRegisterAndEnrollMethod(userName, password, adminUserContext).then((member) => {
            userData[userName] = password
            updateUserData()
            return util.format("user %s is register and can be used now", userName)
        })

    }

}


var innerRegisterAndEnrollMethod = (userName, password, adminUserContext) => {
    let enrollmentSecret = password;
    logger.debug('innerRegisterAndEnrollMethod')
    return caClient.register({
        enrollmentID: userName,
        enrollmentSecret: password,
        affiliation: 'org1'
    }, adminUserContext).then((secret) => {
        enrollmentSecret = secret;
        logger.info(userName + ' registered successfully');
        return caClient.enroll({
            enrollmentID: userName,
            enrollmentSecret: secret
        })
    }, (err) => {
        if (err.message.indexOf('already registered') > -1) {
            return caClient.enroll({
                enrollmentID: userName,
                enrollmentSecret: userData[userName]
            });
        }
        logger.error(userName + ' failed to register : ' + err);
        return Promise.reject(err)
    //return 'Failed to register '+username+'. Error: ' + err.stack ? err.stack : err;
    }).then((message) => {
        if (message && typeof message === 'string' && message.includes(
                'Error:')) {
            logger.error(userName + ' enrollment failed ' + err);
            return Promise.reject(message);
        }
        logger.info(userName + ' enrolled successfully');
        member = new User(userName);
        member.setCryptoSuite(client.getCryptoSuite())
        member._enrollmentSecret = enrollmentSecret;
        return member.setEnrollment(message.key, message.certificate, mspid);
    }).then(() => {
        client.setUserContext(member, false);
        users[userName] = member

        return member;
    })
}
var getRegisteredUsersync = function(username) {

    var member;
    var enrollmentSecret = null;
    let nowUser = username
    return client.getUserContext(nowUser, true).then((user) => {
        if (user && user.isEnrolled()) {
            users[nowUser] = user
            logger.info('Successfully loaded member ' + username + ' from persistence');
            return user;
        } else {
            logger.debug('%s start to register', username)
            member = users[caAdminEnrollID];
            return innerRegisterAndEnrollMethod(username, userData[username], member).catch((e) => {
                return "fail but try next userObj"
            })
        }
    })
};




var matchUserDb = (enrollmentID, enrollmentSecret) => {

    if (userData[enrollmentID] && enrollmentSecret === userData[enrollmentID]) {
        return Promise.resolve("ID secret pass")
    } else {
        logger.error("failed to match " + enrollmentID + 'and its ernollSecret')
        return Promise.reject('Auth Failed')
    }
}

var userInit = () => {
    caClient = require('./ca')
    logger.info('start to init user objs')

    adminPromise = [enrollCaAdmin().then(() => {
        return enrollOrgAdmin()
    })]

    return Promise.all(adminPromise).then(
        () => {
            logger.debug('finish get two admin obj')
            registarAndEnrollPromise = []
            let userNameList = Object.keys(userData)

            return Promise.each(userNameList, (userName) => {
                if (userName != caAdminEnrollID && userName != orgAdminEnrollID) {
                    return getRegisteredUsersync(userName)
                }
                return Promise.resolve()
            })
        }, (err) => {
            logger.warn('fail to get two admin obj but try to get user obj')
            registarAndEnrollPromise = []
            let userNameList = Object.keys(userData)

            return Promise.each(userNameList, (userName) => {
                if (userName != caAdminEnrollID && userName != orgAdminEnrollID) {
                    return getRegisteredUsersync(userName)
                }
                return Promise.resolve()

            })
        }
    )
}
var getUser = (userName) => {
    logger.debug('start to get ' + userName + 'userobj')
    if (users[userName]) {
        return users[userName]
    } else {
        logger.error('can not get ' + userName + 'userContext')
        throw new Error("get a undefined user, plz enroll the user first")
    }
}
var getUserNameList = () => {
    return Object.keys(users)
}
var getOrgAdmin = () => {
    return getUser(orgAdminEnrollID)
}
var getAdminUser = () => {
    return getUser(caAdminEnrollID)
}

var updateUserData = () => {

    fs.writeFileSync(userDataPath, JSON.stringify(userData))

}
module.exports = {
    getOrgAdmin: getOrgAdmin,
    caAdminEnrollID: caAdminEnrollID,
    getAdminUser: getAdminUser,
    orgAdminEnrollID: orgAdminEnrollID,
    registerAndEnrollUser: registerAndEnrollUser,
    userInit: userInit,
    getUser: getUser,
    matchUserDb: matchUserDb,
    getUserNameList: getUserNameList
}