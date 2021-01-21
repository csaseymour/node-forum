const express = require('express');
const User = require('../models/user');
const Messages = require('../models/messages');
const flash = require('connect-flash');
const bcrypt = require('bcryptjs');
const passport = require('passport');
const multer  = require('multer')
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
    await User.find({_id: id})
        .lean()
        .then((result) =>{
            res.render('user', {
                member: result[0]
            });
        });
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

router.get('/message', async (req, res) =>{
    await Messages.findOne({_id: req.query.id})
        .lean()
        .populate('user1')
        .populate('user2')
        .populate('messages.user')
        .then((result) =>{
            Promise.all(result.messages.map(async(element) =>{
                if(element.user._id.toString() == req.user._id){
                    element.me = true;
                }else{
                    element.me = false;
                }
            }));
            res.render('message',{
                message: result
            });
        })
        .catch(err => console.log(err))
})

router.get('/messages', async (req, res) =>{
    var users = await  getUsers();
    var result = await getMessages(req.user._id);
    res.render('messages', {
        messages: result,
        users: users
    })
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

router.post('/message', (req, res) =>{
    var em = req.app.get('notEvent');
    var userid;
    if(req.query.id){
        userid = req.query.id;
    }else{
        userid = req.body.id;
    }
    if(req.body.messageid){
        Messages.findOne({_id: req.body.messageid})
            .populate('user1')
            .populate('user2')
            .then((result) =>{
                msg = {
                    user: req.user._id,
                    message: req.body.message
                }
                result.messages.push(msg);
                result.save();
                if(result.user1._id.toString() == req.user._id.toString()){
                    notify(result.user2._id, {notificationType: "message from", message: req.user.username});
                    em.emit('toast', {messageid: req.body.messageid, id: result.user2._id, nType: "new message", message: result.user2.username});
                }else{
                    notify(result.user1._id, {notificationType: "message from", message: req.user.username});
                    em.emit('toast', {messageid: req.body.messageid, id: result.user1._id, nType: "new message", message: result.user1.username});
                }
                res.redirect('/user/message?id=' + req.body.messageid);
            })
            .catch(err => console.log(err));
    }else{
        msg = {
            user: req.user._id,
            message: req.body.message
        }
        Messages.findOne({user1: req.user._id, user2: userid})
            .then((result) =>{
                if(result){
                    //messages already exist
                    result.messages.push(msg);
                    result.save();
                    notify(userid, {notificationType: "message from", message: req.user.username});
                    em.emit('toast', {messageid: result._id, id: userid, message: "new message"});
                    res.render('messages');
                }else{
                    Messages.findOne({user1: userid, user2: req.user._id})
                        .then((result) =>{
                            if(result){
                                //messages already exist
                                result.messages.push(msg);
                                result.save();
                                notify(userid, {notificationType: "message from", message: req.user.username});
                                res.render('messages');
                            }else{
                                //need to create new message
                                const message = new Messages({
                                    user1: userid,
                                    user2: req.user._id,
                                    messages: [
                                        {
                                            user: req.user._id,
                                            message: req.body.message
                                        }
                                    ]
                                });
                                message.save()
                                    .then((result) =>{
                                        notify(userid, {notificationType: "message from", message: req.user.username});
                                    })
                                    .catch(err => console.log(err));
                                res.render('messages');
                            }
                        })
                        .catch(err => console.log(err));
                    }
            }) 
            .catch(err => console.log(err)); 
    }
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

async function getMessages(id){
    var messages = [];
    await Messages.find({ $or:[{user1: id}, {user2: id}]})
        .lean()
        .populate('user1')
        .populate('user2')
        .then((result) =>{  
            Promise.all(result.map( async(element) =>{
                if(element.user1._id.toString() == id.toString()){
                    var msg = {
                        id: element._id,
                        user: element.user2.username
                    }
                    messages.push(msg);
                }else{
                    var msg = {
                        id: element._id,
                        user: element.user1.username
                    }
                    messages.push(msg);
                }
            }));
        })
        .catch(err => console.log(err));
    return messages;
}

async function notify(id, note){
    await User.findOne({_id: id})
        .then((result) =>{
            result.notification.unread = true;
            result.notification.notifications.push(note);
            result.save();
        })
        .catch(err => console.log(err));
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