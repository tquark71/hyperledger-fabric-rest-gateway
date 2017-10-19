var io;
var jwt = require('jsonwebtoken')
var config = require('./config')
var monitorHelper = require('./monitor/helper')


function init(server){
    let inIo = require('socket.io')(server);

    require('socketio-auth')(inIo, {
        authenticate: function (socket, data, callback) {
            console.log('socket start to auth')
          //get credentials sent by the client
          var token = data.token;
            jwt.verify(token,config.gateway.jwtSecret,(err,decoded)=>{
                if(err){
                    return callback(new Error('token unvaild'))
                }else{
                    let verify = monitorHelper.findUser(decoded.username)
                    if(verify){
                        return callback(null,true)
                    }else{
                        return callback(new Error('user not found'))
                    }
                }
            })

        }

      });
      io = inIo ;

}
  module.exports={
      init:init,
      getIo: ()=>{
          return io
      }
  }