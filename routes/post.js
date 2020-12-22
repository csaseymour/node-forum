const express = require('express');
var moment = require('moment');
const Post = require('../models/post');
const { ensureAuthenticated } = require('../strategies/auth');
const router = express.Router();

router.get('/post', async function(req, res){
    Post.findById(req.query.id).lean()
        .populate('postedBy')
        .populate('comments.postedBy')
        .then((result) =>{
            result.createdAt = moment(result.createdAt).format('YYYY-MM-DD, h:mm a');
            var comments = result.comments;
            comments.reverse();
            result.comments.forEach(element => {
                var fomatted_date = moment(element.date).format('YYYY-MM-DD, h:mm a');
                element.date = fomatted_date;
            });
            res.render('post', {
                post: result
            });
        })
        .catch((err) =>{
            console.log(err);
        })
});

router.post('/newcomment', ensureAuthenticated, async function(req, res){
    Post.findById(req.query.id)
        .then((result) =>{
            var comment = {
                text: req.body.content,
                postedBy: req.user._id,
                date: Date.now()
            }
            result.comments.push(comment);
            result.save()
                .then((result) =>{
                    res.redirect(`/post/post?id=${req.query.id}`);
                })
                .catch((err) => console.log(err));
        })
        .catch((err) => console.log(err));
});

router.post('/newpost', ensureAuthenticated, async function(req, res){
    const post = new Post({
        title: req.body.title,
        content: req.body.content,
        catagory: req.query.catagory,
        postedBy: req.user._id
    });
    post.save()
    .then((result) =>{
        res.redirect('/');
    })
    .catch((err) =>{
        console.log(err);
    });
    res.redirect('/');
});

module.exports = router;