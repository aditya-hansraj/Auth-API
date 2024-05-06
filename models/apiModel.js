const mongoose = require('mongoose');
const { type } = require('os');
const Schema = mongoose.Schema;

const apiSchema = new Schema({
    username: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    lastActivity : {
        activity : {
            type: String
        },
        time: {
            type: Date,
            default: Date.now
        }
    }
});

const User = mongoose.model('AuthApi', apiSchema);
module.exports = User;