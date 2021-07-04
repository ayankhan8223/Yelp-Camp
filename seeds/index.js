const mongoose = require('mongoose');
const cities = require('./cities');
const { places, descriptors } = require('./seedHelpers')
    // const cities = require('./seeds/cities')
const Campground = require('../models/campground.js')


mongoose.connect('mongodb://localhost:27017/yelp-camp', { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true });
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
    console.log('database connected')
});

const sample = array => array[Math.floor(Math.random() * array.length)];

const seedDB = async() => {
    await Campground.deleteMany({});
    for (let i = 0; i < 500; i++) {
        const random = Math.floor(Math.random() * 1000);
        const price = Math.floor(Math.random() * 20) + 10;
        const camp = new Campground({
            author: '60c892cd70d4a660f00da978',
            location: `${cities[random].city},${cities[random].state}`,
            title: `${sample(descriptors)},${sample(places)}`,
            image: [{

                    url: 'https://res.cloudinary.com/dgwj4ybds/image/upload/v1624216515/yelpcamp/gmk1kqyq4ko5zanuzfu9.jpg',
                    filename: 'yelpcamp/gmk1kqyq4ko5zanuzfu9'
                },
                {

                    url: 'https://res.cloudinary.com/dgwj4ybds/image/upload/v1624216526/yelpcamp/u8h1spe93giubx9rvfsp.jpg',
                    filename: 'yelpcamp/u8h1spe93giubx9rvfsp'
                }
            ],
            description: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Excepturi, delectus beatae nemo tempora ex eius exercitationem laudantium? Eum excepturi, consequatur velit consequuntur fugit blanditiis impedit. Modi dolores fuga velit facilis!',
            price: price,
            geometry: {
                type: 'Point',
                coordinates: [
                    cities[random].longitude,
                    cities[random].latitude,
                ]
            }
        })
        await camp.save();
        console.log(camp)
    }

}
seedDB();