const express = require('express');
const User = require('../models/user');
const Messages = require('../models/messages');
const flash = require('connect-flash');
const bcrypt = require('bcryptjs');
const passport = require('passport');
const multer  = require('multer');
const { ensureAuthenticated } = require('../strategies/auth');
var nodemailer = require('nodemailer');
var router = express.Router();
var profilePicture = multer.diskStorage(
    {
        destination: './assets/profile_pictures/',
        filename: function ( req, file, cb ) {
            //req.body is empty...
            //How could I get the new_file_name property sent from client here?
            cb( null, req.user._id+ ".png");
        }
    }
);
var upload = multer( { storage: profilePicture } );
var resetCodes = {};

var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'nodeforums@gmail.com',
      pass: 'Greent1256'
    }
  });

//GET'S============================================
router.get('/user', async (req, res) =>{
    var id = req.query.id;
    await User.findOne({_id: id})
        .lean()
        .then((result) =>{
            res.render('user', {
                member: result
            });
        });
});

router.get('/messages', async (req, res) =>{
    //lets find all the messages the user has
    var messages;
    var message;
    var messageid;
    if(req.query.id){
        messageid = req.query.id.toString();
        await Messages.findOne({_id: req.query.id})
            .populate('messages.user')
            .lean()
            .then((result) =>{
                if(result){
                    message = result.messages
                }
            })
            .catch(err => console.log(err));
    }
    var messages;
    await Messages.find({$or:[{user1: req.user._id}, {user2: req.user._id}]})
        .populate('user1')
        .populate('user2')
        .lean()
        .then((result) =>{
            if(result){
                messages = result;
            }else{
                res.render('messages');
            }
        })
        .catch(err => console.log(err));
    await Promise.all(messages.map(async(message) =>{
        //we have to cast the userid to a string otherwise the condition will always return false for some reason...
        if(message.user1._id.toString() == req.user._id.toString()){
            message.user = message.user2;
        }else{
            message.user = message.user1;
        }
    }));
    if(messageid){
        await Promise.all(messages.map(async (message) =>{
            if(message._id.toString() == messageid.toString()){
                message.active = true;
            } 
        }));
    }
    res.render('messages', {messages: messages, message: message, messageid: messageid});
});

router.get('/', function(req, res){
    res.render('user');
});

router.get('/members', async function(req, res){
    var users = await getUsers();
    res.render('members', {
        users: users
    });
});

router.get('/logout', (req, res) =>{
    req.logOut();
    res.redirect('/');
});

router.get('/rules', (req, res) =>{
    res.render('rules');
});

router.get('/dashboard', ensureAuthenticated, (req, res) =>{
    res.render('dashboard');
});

router.get('/passwordreset', async (req, res) =>{
    res.render('passwordreset');
});
//POST'S============================================================
router.post('/register', async function(req, res){
    var {username, password, password2, email} = req.body;
    username = username.toLowerCase();
    let errors = [];

    //check if all fields have been filled
    if(!username || !password || !password2 || !email){
        errors.push({msg: 'please fill in all fields!'});
    }

    //check password match
    if(password !== password2){
        errors.push({msg: 'passwords do not match'});
    }

    //check password length
    if(password.length < 6){
        errors.push({msg: 'please make sure password is longer then 6 characters'});
    }

    //check the email
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if(!emailRegex.test(email)){
        errors.push({msg: 'please ensure you entered a valid email'});
    }

    if(errors.length > 0){
        req.flash('register_errors', errors);
        res.redirect('/');
    }else{
        User.findOne({
            email: email
        })
        .then((user) =>{
            if(user){
                //email already in use
                errors.push({msg: 'Email already in use'});
                req.flash('register_errors', errors);
                res.redirect('/');
            }else{
                User.findOne({
                    username: username
                })
                .then((user) =>{
                    //username already in use
                    if(user){
                        errors.push({msg: 'Username already in use'});
                        req.flash('register_errors', errors);
                        res.redirect('/');
                    }else{
                        //hash password
                        bcrypt.genSalt(10, (err, salt) => 
                            bcrypt.hash(password, salt, (err, hash) =>{
                                if(err) throw err;
                                var passwordHashed = hash;
                                var user = new User({
                                    username: username,
                                    password: passwordHashed,
                                    email: email,
                                    level: 0
                                });
                                user.save()
                                .then(user =>{
                                    var mailOptions = {
                                        from: 'nodeforums@gmail.com',
                                        to: email,
                                        subject: 'nodeforumns',
                                        text: 'Welcome to nodeforums! Please enjoy ur stay'
                                    };
                                    transporter.sendMail(mailOptions, function(error, info){
                                        if (error) {
                                          console.log(error);
                                        } else {
                                          console.log('Email sent: ' + info.response);
                                        }
                                    });
                                    console.log(`new user created! ${user}`);
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
    console.log('login attempt')
    passport.authenticate('local', {
        successRedirect: '/',
        failureRedirect: '/',
        failureFlash: true,
        successFlash: true
    })(req, res, next);
});

router.post('/upload', ensureAuthenticated, upload.single('file'), (req, res) =>{
    res.redirect('/user/dashboard')
});

router.post('/settings', (req, res) =>{
    User.findOne({_id: req.user._id})
        .then((result) =>{
            result.chatcolor = req.body.color;
            result.save()
                .then((result) =>{
                    res.redirect('/');
                })
                .catch(err => console.log(err));
        })
        .catch(err => console.log(err));
});

router.post('/passwordcode', async(req, res) =>{
    var errors = [];
    var {email, code, password1, password2} = req.body;
    if(resetCodes[email] == code){
        //make sure the new password is valid
        if(password1 != password2){
            errors.push({msg: "passwords do not match!"});
        }
        if(password1.length < 6){
            errors.push({msg: 'please make sure password is longer then 6 characters'});
        }
    }else{
        errors.push({msg: 'incorrect code'});
    }
    if(errors.length > 0){
        res.render('passwordreset', {
            errors: errors,
            data: email
        });
    }else{
        await User.findOne({email: email})
            .then((result) =>{
                bcrypt.genSalt(10, (err, salt) => {
                    bcrypt.hash(password1, salt, (err, hash) =>{
                        if(err) throw err;
                        var passwordHashed = hash;
                        result.password = passwordHashed;
                        result.save();
                    });
                });
            })
            .catch(err => console.log(err));
        res.redirect('/');
    }
});

router.post('/passwordreset', async (req, res) =>{
    var errors = [];
    var code = await makecode(6);
    User.findOne({email: req.body.email})
        .then((result) =>{
            if(result){
                resetCodes[req.body.email] = code;
                //let's send the code for the reset
                var mailOptions = {
                    from: 'nodeforums@gmail.com',
                    to: req.body.email,
                    subject: 'PASSWORD RESET CODE',
                    text: 'password reset code is ' + code 
                };
                transporter.sendMail(mailOptions, function(error, info){
                    if (error) {
                      console.log(error);
                    }
                });
                res.render('passwordreset', {data: req.body.email});
            }else{
                errors.push({msg: "Email is not associated with any accounts on our record"});
                res.render('passwordreset', {errors: errors});
            }
        })
        .catch(err => console.log(err));
});

router.post('/updateuser', async (req, res) =>{
    const {username, status} = req.body;
    errors = [];
    //set username to lowercase
    username.toLowerCase()
    if(username.length < 2){
        errors.push({msg: "username needs to be at least 2 characters long"});
    }
    if(username.length > 12){
        errors.push({msg: "username cannot be larger then 12 characters"});
    }
    if(/[^a-zA-Z0-9]/.test(username)) {
        errors.push({msg: "username cannot contain any special characters!"});
    }
    if(status.length > 50){
        errors.push({msg: "status cannot be longer then 50 characters"});
    }
    if(errors.length > 0){
        req.flash("error_messages", errors);
        res.redirect('/user/dashboard');
    }else{
        User.findOne({_id: req.user._id})
            .then((result) =>{
                result.username = username;
                result.status = status;
                result.save();
                req.flash('success_message', {msg: "User Settings have been updated!"});
                res.redirect('/user/dashboard');
            })
            .catch(err => console.log(err));
    }
    
});

router.post('/message', async (req, res) =>{
    if(req.query.id){
        await Messages.findOne({_id: req.query.id})
            .then((result) =>{
                if(result){
                    var msg = {
                        user: req.user._id,
                        message: req.body.message,
                        date: Date.now()
                    }
                    result.messages.push(msg);
                    result.save()
                        .then((result) =>{
                            res.redirect('/user/messages?id=' + req.query.id);
                        })
                        .catch(err => console.log(err));
                }else{
                    res.redirect('/user/message');
                }
            })
            .catch(err => console.log(err));
    }else{
        res.redirect('/user/messages');
    }
});

router.post('/usermessage', async (req, res) =>{
    var userid = req.query.id;
    var messageid;
    await Messages.findOne({$or:[{$and:[{user1:req.user._id}, {user2:userid}]}, {$and:[{user1:userid}, {user2:req.user._id}]}]})
        .then((result) =>{
            if(result){
                //we have a conversation already
                var msg = {
                    user: req.user._id,
                    message: req.body.message,
                    date: Date.now()
                }
                result.messages.push(msg);
                result.save()
                    .then((result) =>{
                        console.log(result);
                        messageid = result._id.toString();
                    })
                    .catch(err => console.log(err));
            }else{
                //we don't have a converstation yet so we have to make a new one now.
                var conversation = new Messages({
                    user1: req.user._id,
                    user2: userid,
                    messages: []
                });
                var msg = {
                    user: req.user._id,
                    message: req.body.message,
                    date: Date.now()
                }
                conversation.messages.push(msg);
                conversation.save()
                    .then((result) =>{
                        console.log(result);
                        messageid = result._id.toString();
                    })
                    .catch(err => console.log(err));
            }
        })
        .catch(err => console.log(err));
    res.redirect("/user/messages");
});


//helper functions
async function getUsers(){
    var users = [];
    await User.find()
        .lean()
        .then((result) =>{
            Promise.all(result.map(async (element) => {
                var user = {
                    id: element._id,
                    username: element.username
                }
                users.push(user);
            }));
        })
        .catch(err => console.log(err));
    return users;
}

async function makecode(length) {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
       result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

module.exports = router;