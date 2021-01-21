const mongoose = require('mongoose');
const mongooseDateFormat = require('mongoose-date-format');
const Schema = mongoose.Schema;

const postSchema = new Schema({
    title: String,
    content: String,
    category: String,
    views: Number,
    postedBy: {
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User'
    },
    comments: [{
        text: String,
        postedBy:{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        date: Date
    }],
    recentreply: String
}, {timestamps: true});
postSchema.plugin(mongooseDateFormat);
const Post = mongoose.model('Post', postSchema);
module.exports = Post;