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
const events = require('events');
//Models to use
const Post = require('./models/post');
const User = require('./models/user');
//Routes to use
const userRoute = require('./routes/user');
const postRoute = require('./routes/post');
//Setup passport
const passport = require('passport');
require('./strategies/users')(passport);
//=================================================


//app setup================================================================
const publicPath = path.join(__filename, '../assets');
const app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var sessionStore = new MongoStore({mongooseConnection: mongoose.connection});
//express-session middleware===============================================
app.use(session({
    secret: 'appleteasers',
    store: sessionStore,
    resave: true,
    saveUninitialized: false,
    expires: new Date(Date.now() + 3600000)
}));

//Passport middleware
app.use(passport.initialize());
app.use(passport.session());
//connect flash
app.use(flash());
//setup template engine Handlebars
app.engine('handlebars', exphbs());
app.set('view engine', 'handlebars');
app.use('/', express.static(publicPath));
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}));
var notEvent = new events.EventEmitter();
app.set('notEvent', notEvent);
//global vars middleware
app.use(async(req, res, next) =>{
    res.locals.login_error = req.flash('error');
    res.locals.register_errors = req.flash('register_errors');
    res.locals.error_messages = req.flash('error_messages');
    res.locals.reset_errors = req.flash('reset_errors');
    if(req.user){
        await User.findOne({_id: req.user._id})
            .lean()
            .then((result) =>{
                res.locals.user = result;
            })
            .catch(err => console.log(err));    
    }
    next();
});

//set routes
app.use('/user', userRoute);
app.use('/post', postRoute);
//==========================================================================


//connect to the database=================
mongoose.connect('mongodb://localhost:27017/mydb', {useNewUrlParser: true, useUnifiedTopology: true})
    .then((result) => console.log('connected to db'));
//========================================


//connect socket.io to passport
io.use(passportSocketIo.authorize({
    key: 'connect.sid',
    secret: 'appleteasers',
    store: sessionStore,
    passport: passport,
    cookieParser: cookieParser
}));

//index===================================
app.get('/', async function(req, res){
    var data = await getCategories();
    data.sort((a,b) => (a.category > b.category) ? 1 : ((b.category > a.category) ? -1 : 0));
    res.render('index', {categories: data });
});
//helper function
async function getCategories(){
    var categories = ["General", "Technology", "Graphics", "TVShows", "Suggestions", "Help"];
    var categoriesToSend = [];
    await Promise.all(categories.map(async (c) =>{
        await Post.find({category: c}).lean()
            .sort({createdAt: -1})
            .populate('postedBy')
            .populate('comments.postedBy')
            .then((result) =>{
                if(result.length > 0){
                    data = {
                        category: c,
                        id: result[0]['_id'],
                        title: result[0]['title'],
                        threads: result.length
                    }
                    result.sort(function(a, b){
                        return new Date(b.updatedAt) - new Date(a.updatedAt);
                    });
                    if(result[0]['comments'].length > 0){
                        var latestreply = {
                            id: result[0]['_id'],
                            username: result[0]['comments'][result[0]['comments'].length - 1]['postedBy']['username']
                        }
                        data.latestreply = latestreply;
                    }else{
                        data.latestreply = {id: result[0]['_id'], username: "idk"};
                    }
                }else{
                    data = {
                        category: c,
                        id: "0",
                        title: "Empty",
                        threads: 0
                    }
                }
                //we need to find the latest reply in this catagory.
                categoriesToSend.push(data);
            })
            .catch(err => console.log(err));
    }));
    return categoriesToSend;
}
//=======================================


//socket.io stuff goes here==========================================
var messagebuffer = []; //keep old messages for when a user connects
var onlineusers = [];
var usersid = {};

notEvent.on('toast', (data) =>{
    console.log('new toast made');
    console.log(usersid[data.id.toString()]);
    io.to(usersid[data.id.toString()].toString()).emit('toast', data);
    io.to(usersid[data.id.toString()].toString()).emit('notification-add', data);
});

io.on('connection', (socket) => {
    if (onlineusers.includes(socket.request.user.username)){
        //do nothing
    }else{
        onlineusers.push(socket.request.user.username);
        usersid[socket.request.user._id] = socket.id;
    }
    socket.emit('messagebuffer', {messages: messagebuffer});
    socket.emit('users', {users: onlineusers});
    socket.broadcast.emit('users', {users: onlineusers});

    socket.on('chat message', (msg) =>{
        message = {username: socket.request.user.username, message: msg, color: socket.request.user.chatcolor};
        messagebuffer.push(message);
        socket.emit('message-in', message);
        socket.broadcast.emit('message-in', message);
    });

    socket.on('disconnect', ()=>{
        onlineusers = onlineusers.filter(e => e !== socket.request.user.username);
        socket.broadcast.emit('users', {users: onlineusers});
    });

    socket.on('notification', ()=>{
        User.findOne({_id: socket.request.user._id})
            .then((result) =>{
                result.notification.unread = false;
                result.save();
            })
            .catch(err => console.log(err));
    });

    socket.on('not-remove', (data)=>{
        User.findOne({_id: socket.request.user._id})
            .then((result) =>{
                result.notification.notifications.pull({_id: data});
                result.save();
            })
            .catch(err => console.log(err));
    });
});
//====================================================================



//run app================================
const PORT = process.env.PORT || 80;
http.listen(PORT, () => {
    console.log('listening on *:' + PORT);
});