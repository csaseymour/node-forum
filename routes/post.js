const express = require('express');
var moment = require('moment');
const multer  = require('multer')
const Post = require('../models/post');
const { ensureAuthenticated } = require('../strategies/auth');
const router = express.Router();

//GET'S =================================================
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
            res.render('post', {post: result});
        })
        .catch((err) =>{
            console.log(err);
        })
});

router.get('/category', async function(req, res){
    var category = req.query.category;
    await Post.find({category: category})
            .lean()
            .populate("postedBy")
            .sort({createdAt: -1})
            .then((result) =>{
                result.forEach(element => {
                    var fomatted_date = moment(element.createdAt).format('YYYY-MM-DD, h:mm a');
                    element.createdAt = fomatted_date;
                });
                res.render('category', {
                    category: category,
                    posts: result
                });
            })
            .catch(err => console.log(err));
});
//POST'S =================================================
router.post('/newcomment', ensureAuthenticated, (req, res) =>{
    if(req.body.content){
        if(req.body.content.length > 0){
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
        }else{
            req.flash('error_messages', {msg: "can't post nothing...sorry bud"});
            res.redirect(`/post/post?id=${req.query.id}`);
        }
    }else{
        req.flash('error_messages', {msg: "can't post nothing...sorry bud"});
        res.redirect(`/post/post?id=${req.query.id}`);
    }
});

router.post('/newpost', ensureAuthenticated, async function(req, res){
    console.log('new post');
    let errors = [];
    const post = new Post({
        title: req.body.title,
        content: req.body.content,
        category: req.query.category,
        postedBy: req.user._id
    });
    if(post.content.length > 2000){
        errors.push({msg: "content is over 2000 characters"});
    }
    if(post.title.length > 50){
        errors.push({msg: "title is over 50 characters"});
    }
    if(errors.length > 0){
        req.flash('error_messages', errors)
        res.redirect('/post/category?category=' + req.query.category);
    }else{
        post.save()
        .then((result) =>{
            console.log(result);
            res.redirect('/post/post?id=' + result._id);
        })
        .catch((err) =>{
            console.log(err);
        });
    }
    
});

module.exports = router;