//Require Modules==================================
const express = require('express');
const exphbs = require('express-handlebars');
const path = require('path');
const mongoose = require('mongoose');
const bodyParser = require('body-parser')
const flash = require('connect-flash');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const passportSocketIo = require('passport.socketio');
const cookieParser = require('cookie-parser');
var moment = require('moment');
//Models to use
const Post = require('./models/post');
//Routes to use
const userRoute = require('./routes/user');
const postRoute = require('./routes/post');
const passport = require('passport');
require('./strategies/users')(passport);
//================================================

const publicPath = path.join(__filename, '../assets');

//app setup================================================================
const app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var sessionStore = new MongoStore({mongooseConnection: mongoose.connection});
//express-session middleware
app.use(session({
    secret: 'appleteasers',
    store: sessionStore,
    resave: true,
    saveUninitialized: true
}));

//Passport middleware
app.use(passport.initialize());
app.use(passport.session());
//connect flash
app.use(flash());
app.engine('handlebars', exphbs());
app.set('view engine', 'handlebars');
app.use('/', express.static(publicPath));
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}));
//global vars
app.use(async(req, res, next) =>{
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    res.locals.success = req.flash('success');
    if(req.user){
        var user = {
            _id: req.user._id,
            username: req.user.username
        }
        res.locals.user = user;
    }
    await Post.find().lean()
        .populate('postedBy')
        .sort({createdAt: -1})
        .limit(5)
        .then((result) =>{
            result.forEach(element => {
                var fomatted_date = moment(element.createdAt).format('YYYY-MM-DD, h:mm a');
                element.createdAt = fomatted_date;
            });
            res.locals.latestPosts = result;
        })
        .catch((err) => console.log(err));
    next();
});
app.use('/user', userRoute);
app.use('/post', postRoute);
//==========================================================================


//connect to the database=================
mongoose.connect('mongodb://localhost:27017/mydb', {useNewUrlParser: true, useUnifiedTopology: true})
    .then((result) => console.log('connected to db'));
//========================================

io.use(passportSocketIo.authorize({
    key: 'connect.sid',
    secret: 'appleteasers',
    store: sessionStore,
    passport: passport,
    cookieParser: cookieParser
  }));

//index===================================
app.get('/', async function(req, res){
    var catagory = "General";
    if(req.query.catagory){
        catagory = req.query.catagory;
    }
    var catagorys = ["General", "Technology", "Graphics", "TVShows"];
    catagorys = catagorys.filter(e => e !== catagory);
    Post.find({catagory: catagory}).lean()
        .sort({createdAt: -1})
        .populate('postedBy')
        .then((result) =>{
            result.forEach(element => {
                var fomatted_date = moment(element.createdAt).format('YYYY-MM-DD, h:mm a');
                element.createdAt = fomatted_date;
            });
            res.render('index', { layout: 'new',
                posts: result,
                catagory: catagory,
                catagorys: catagorys
            });
        })
        .catch((err) =>{
            console.log(err);
        });
});
//=======================================
var messagebuffer = []; //keep old messages for when a user connects
var onlineusers = [];
io.on('connection', (socket) => {
    if (onlineusers.includes(socket.request.user.username)){
        //do nothing
    }else{
        onlineusers.push(socket.request.user.username);
    }
    console.log(socket.request.user.username);
    console.log('connected user');
    socket.emit('messagebuffer', {messages: messagebuffer});
    socket.emit('onlineusers', {users: onlineusers});
    socket.broadcast.emit('onlineusers', {users: onlineusers});

    socket.on('chat message', (msg) =>{
        message = {username: socket.request.user.username, message: msg};
        messagebuffer.push(message);
        socket.emit('message-in', {username: socket.request.user.username, message: msg});
        socket.broadcast.emit('message-in', {username: socket.request.user.username, message: msg});
    });

    socket.on('disconnect', ()=>{
        onlineusers = onlineusers.filter(e => e !== socket.request.user.username);
        socket.broadcast.emit('onlineusers', {users: onlineusers});
    });
});
//run app================================
const PORT = process.env.PORT || 80;
//app.listen(PORT, () => console.log(`server is running on port ${PORT}`));

http.listen(PORT, () => {
    console.log('listening on *:' + PORT);
});