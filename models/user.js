const mongoose = require('mongoose')
const Schema = mongoose.Schema;
const passportLocalMongoose = require('passport-local-mongoose')

const userschema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true
    }
})
userschema.plugin(passportLocalMongoose) //username and password schema are hidden under this plugin

module.exports = mongoose.model('User', userschema)