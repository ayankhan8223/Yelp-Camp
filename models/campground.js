const mongoose = require('mongoose')
const Review = require('./review')
const Schema = mongoose.Schema;

const imageSchema = new Schema({
    url: String,
    filename: String
})
imageSchema.virtual('thumbnail').get(function() {
    return this.url.replace('/upload', '/upload/w_200')
})
const opts = { toJSON: { virtuals: true } };
const campgroundSchema = new Schema({
    title: String,
    geometry: {
        type: {
            type: String, // Don't do `{ location: { type: String } }`
            enum: ['Point'], // 'location.type' must be 'Point'
            required: true
        },
        coordinates: {
            type: [Number],
            required: true
        }
    },
    image: [imageSchema],
    price: Number,
    description: String,
    location: String,
    author: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    review: [{
        type: Schema.Types.ObjectId,
        ref: 'Review'

    }]
}, opts)


campgroundSchema.virtual('properties.popUpMarkup').get(function() {
    return `<strong><a href='/campground/${this._id}'>${this.title}</a></strong><p>`
})



campgroundSchema.post('findOneAndDelete', async(doc) => {
    if (doc) {
        await Review.deleteMany({
            _id: {
                $in: doc.review
            }


        })
    }
})
module.exports = mongoose.model('Campground', campgroundSchema)