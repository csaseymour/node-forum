const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const conversationsSchema = new Schema({
    user1: {
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User'
    },
    user2: {
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User'
    },
    messages: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        message: String,
        date: Date
    }]
});

const Conversations = mongoose.model('Conversations', conversationsSchema);
module.exports = Conversations;