var userDB = require('./schema').userDB

var insertUser = (user) => {
    return userDB.create(user)
}

var updateUser = (user) => {
    var username = user.username
    return userDB.findOneAndUpdate({
        username: username
    }, user)
}

var removeUser = (condition) => {
    return userDB.remove(condition)
}
var getUserByUserName = (username) => {
    return userDB.findOne({
        username: username
    })
}
var getUsers = (condition) => {
    return userDB.find(condition)
}
module.exports = {
    insertUser: insertUser,
    updateUser: updateUser,
    removeUser: removeUser,
    getUsers: getUsers
}