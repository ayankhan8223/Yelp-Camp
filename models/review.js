const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const reviewschema = new Schema({
    body: String,
    rating: Number,
    author: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    }
})
const review = mongoose.model('Review', reviewschema)

module.exports = review