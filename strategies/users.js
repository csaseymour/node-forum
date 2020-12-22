const LocalStrategy = require('passport-local').Strategy;
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// load user model
const User = require('../models/user');

module.exports = function(passport){
    passport.use(
        new LocalStrategy({usernameField: 'username'}, (username, password, done) =>{
            User.findOne({username: username})
            .then(user =>{
                if(!user){
                    return done(null, false, {message: 'that username is not registered'});
                }

                bcrypt.compare(password, user.password, (err, isMatch) =>{
                    if(err) throw err;

                    if(isMatch){
                        return done(null, user);
                    }else{
                        return done(null, false, {message: 'password incorrect'});
                    }
                })
            })
            .catch(err => console.log(err));
        })
    );

    passport.serializeUser((user, done) =>{
        done(null, user.id);
    });
      
    passport.deserializeUser((id, done) =>{
        User.findById(id, (err, user) =>{
            done(err, user);
        });
    });
}