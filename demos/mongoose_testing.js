const Post = require('./models/post');
const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/mydb', {useNewUrlParser: true, useUnifiedTopology: true})
    .then((result) => console.log('connected to db'));

const post = new Post({
    title: 'new post',
    content: 'Some content for my new post system',
    user: 2
});

post.save()
    .then((result) =>{
        console.log(result);
    })
    .catch((err) =>{
        console.log(err);
    });