const express = require('express');
const User = require('../models/user');
const flash = require('connect-flash');
const bcrypt = require('bcryptjs');
const passport = require('passport');
const multer  = require('multer')
const { ensureAuthenticated } = require('../strategies/auth');
var router = express.Router();


var storage = multer.diskStorage(
    {
        destination: './assets/profile_pictures/',
        filename: function ( req, file, cb ) {
            //req.body is empty...
            //How could I get the new_file_name property sent from client here?
            cb( null, req.user._id+ ".png");
        }
    }
);

var upload = multer( { storage: storage } );

router.get('/', function(req, res){
    res.render('user');
});

router.get('/register', function(req, res){
    res.render('register');
});

router.post('/register', async function(req, res){
    const {username, password, password2, email} = req.body;
    let errors = [];

    //check if all fields have been filled
    if(!username || !password || !password2 || !email){
        errors.push({msg: 'please fill in all fields!'});
    }

    //check password match
    if(password !== password2){
        errors.push({msg: 'passwords does not match'});
    }

    //check password length
    if(password.length < 6){
        errors.push({msg: 'please make sure password is longer then 6 characters'});
    }

    if(errors.length > 0){
        res.render('register', {
            errors,
            username,
            password,
            password2,
            email
        });
    }else{
        User.findOne({
            email: email
        })
        .then((user) =>{
            if(user){
                //email already in use
                errors.push({msg: 'Email already in use'});
                res.render('register', {
                    errors,
                    username,
                    password,
                    password2,
                    email
                });
            }else{
                User.findOne({
                    username: username
                })
                .then((user) =>{
                    //username already in use
                    if(user){
                        errors.push({msg: 'Username already in use'});
                        res.render('register', {
                            errors,
                            username,
                            password,
                            password2,
                            email
                        });
                    }else{
                        //hash password
                        bcrypt.genSalt(10, (err, salt) => 
                            bcrypt.hash(password, salt, (err, hash) =>{
                                if(err) throw err;
                                var passwordHashed = hash;
                                var user = new User({
                                    username: username,
                                    password: passwordHashed,
                                    email: email
                                });
                                user.save()
                                .then(user =>{
                                    console.log(`new user created! ${user}`);
                                    req.flash('success_msg', 'You are now registered and can login!');
                                    res.redirect('/');
                                })
                                .catch(err =>{
                                    console.log(err);
                                });
                            })
                        );  
                    }
                })
                .catch((error) =>{
                    console.log(error);
                });
            }
        })
        .catch((error) =>{
            console.log(error);
        });
    }
});

router.post('/login', (req, res, next) =>{
    passport.authenticate('local', {
        successRedirect: '/',
        failureRedirect: '/',
        failureFlash: true,
        successFlash: true
    })(req, res, next);
});

router.get('/logout', (req, res) =>{
    req.logOut();
    res.redirect('/');
});

router.get('/dashboard', ensureAuthenticated, (req, res) =>{
    res.render('dashboard');
});

router.post('/upload', ensureAuthenticated, upload.single('file'), (req, res) =>{
    res.redirect('/user/dashboard')
});
module.exports = router;