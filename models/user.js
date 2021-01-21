const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    username: String,
    password: String,
    email: String,
    status: String,
    points: Number,
    level: Number,
    chatcolor: String,
    notification: {
        unread: Boolean,
        notifications:[
            {
                notificationType: String,
                message: String
            }
        ]
    }
}, {timestamps: true});

const User = mongoose.model('User', userSchema);
module.exports = User;