const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    username: String,
    password: String,
    email: String,
    status: String,
    points: Number
}, {timestamps: true});

const User = mongoose.model('User', userSchema);
module.exports = User;