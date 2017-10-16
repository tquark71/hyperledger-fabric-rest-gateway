
exports.verifyUser=(username,password)=>{
    let userDb = require('./userDb');
    if(userDb[username]&&userDb[username].password == password){
        return true;
    }else{
        return false
    }

}


exports.findUser =(username)=>{
    let userDb = require('./userDb');
    if(userDb[username]){
        return true;
    }else{
        return false
    }

}