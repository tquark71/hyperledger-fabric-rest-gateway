var LocalStrategy = require('passport-local').Strategy;
var JwtStrategy = require('passport-jwt').Strategy;
var ExtractJwt = require('passport-jwt').ExtractJwt;
var UserDb = require('../userDb.json')
var config = require('../../config')
var jwtSecret = config.jwtSecret;
let jwtOpts = {};
jwtOpts.secretOrKey = jwtSecret;
jwtOpts.jwtFromRequest = ExtractJwt.fromAuthHeaderWithScheme('jwt');
console.log(jwtOpts)
module.exports = function(passport) {

    passport
        .serializeUser(function(user, done) {
            console.log('auth success2')
            done(null, user.username);
        });

    // used to deserialize the user
    passport.deserializeUser(function(userID, done) {
        done(null, UserDb[userID])
    });

    var strategy = new JwtStrategy(jwtOpts, function(jwt_payload, next) {
        console.log('payload received', jwt_payload);
        // usually this would be a database call:
        var user = UserDb[jwt_payload.username];
        console.log('find '+ user)
        if (user) {
          next(null, user);
        } else {
          next(null, false);
        }
      });
    passport.use(strategy);
    passport.use('local-login', new LocalStrategy({
        // by default, local strategy uses username and password, we will override with
        // email
        usernameField: 'username',
        passwordField: 'password',
        passReqToCallback: true // allows us to pass back the entire request to the callback
    }, function(req, userName, password, done) {
        // console.log(req); callback with email and password from our form find a user
        // whose email is the same as the forms email we are checking to see if the
        // user trying to login already exists console.log("hshs", userName);
        // console.log(password) console.log("inner stratgy " + userName + " and pwd is
        // " + password)
        user = UserDb[userName];
        if (user) {
            if (password == user.password) {
                console.log('auth success1')

                return done(null, user);
            } else {
                return done(null, false);
            }
        } else {

            return done(null, false);
        }

    }));

}