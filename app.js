if (process.env.NODE_ENV !== 'production') { //(process.env.NODE_ENV is just an environment variable that is just usally development or production .we have been running in development this whole time 

    require('dotenv').config()
}


const express = require('express')
const app = express()
const path = require('path')
const mongoose = require('mongoose');
const ejsmate = require('ejs-mate')
const joi = require('joi')
const session = require('express-session')
const flash = require('connect-flash')
const { campgroundschema, reviewschema } = require('./joiValidation.js')
const catchAsync = require('./utility/catchAsync')
const ExpressError = require('./utility/expresserror')
const methodoverride = require('method-override')
const Campground = require('./models/campground');
const Review = require('./models/review')
const passport = require('passport')
const LocalStrategy = require('passport-local')
const User = require('./models/user')
const multer = require('multer')
const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const mapBoxToken = process.env.MAPBOX_TOKEN;
const geocoder = mbxGeocoding({ accessToken: mapBoxToken })
const { storage } = require('./cloudinary config')
const upload = multer({ storage })
const mongoSanitize = require('express-mongo-sanitize');
const helmet = require("helmet");
const MongoStore = require('connect-mongo');

const dburl = process.env.DB_URL || 'mongodb://localhost:27017/yelp-camp'

// const urlDB = process.env.DB_URL;
// 'mongodb://localhost:27017/yelp-camp'

mongoose.connect(dburl, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true, useFindAndModify: false });
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
    console.log('database connected')
});
app.engine('ejs', ejsmate)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'))
app.use(express.urlencoded({ extended: true }))
app.use(methodoverride('_method'))
app.use(express.static('public'))
app.use(mongoSanitize());
app.use(helmet({ contentSecurityPolicy: false })); //he jite bhi css or javascript file ke lie h 

const secret = process.env.SECRET || 'this should be better secret'
const store = new MongoStore({
    mongoUrl: dburl,
    secret: secret,
    touchAfter: 24 * 60 * 60
})
store.on("error", function(e) {
    console.log("sessions error", e)
})
const sessionconfig = {
    store: store,
    secret: secret,
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        // secure: true,
        expire: Date.now() + 100 * 60 * 60 * 24 * 7,
        maxAge: 100 * 60 * 60 * 24 * 7
    }
}

app.use(session(sessionconfig))
app.use(flash())

app.use(passport.initialize())
app.use(passport.session())
passport.use(new LocalStrategy(User.authenticate()))
passport.serializeUser(User.serializeUser()) //store in the session
passport.deserializeUser(User.deserializeUser()) //unstore in the session
app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    next()
})




///joi validation for campground
const validatecampground = (req, res, next) => {

        const { error } = campgroundschema.validate(req.body)
        if (error) {
            const msg = error.details.map(el => el.message).join(',')
            throw new ExpressError(msg, 400)
        } else {
            next()
        }
    }
    //joi validation for rating
const validatereview = (req, res, next) => {

    const { error } = reviewschema.validate(req.body)
    if (error) {
        const msg = error.details.map(el => el.message).join(',')
        throw new ExpressError(msg, 400)
    } else {
        next()
    }
}



//user routes
app.get('/register', (req, res) => {
    res.render('auth/register', { messages: req.flash('error') })
})
app.post('/register', catchAsync(async(req, res) => {
    try {
        const { username, email, password } = req.body;
        const user = new User({ username: username, email: email })
        const registeredUser = await User.register(user, password)
        req.login(registeredUser, function(err) {
            if (err) { return next(err); }
            return req.flash('success', 'welcome to the yelpcamp')
            res.redirect('/campground')
        });
        req.flash('success', 'welcome to the yelpcamp')
        res.redirect('/campground')
    } catch (e) {
        req.flash('error', e.message)
        res.redirect('/register')



    }
}))
app.get('/login', (req, res) => {
    res.render('auth/login', { messages: req.flash('error') })
})
app.post('/login', passport.authenticate('local', { failureFlash: true, failureRedirect: '/login' }), (req, res) => {

    try {
        req.flash('success', 'welcome back')
        const redirectUrl = req.session.returnto || '/campground'; //if there is no returnto route in the session then it is redirect to campground
        res.redirect(redirectUrl)
    } catch (e) {
        req.flash('error', e.message)
        res.redirect('/login')
    }

})
app.get('/logout', (req, res) => {
    req.logout();
    req.flash('success', 'goodbye')
    res.redirect('/campground')
})










//camp routes
app.get('/campground', async(req, res) => {
    const Camp = await Campground.find({});
    res.render('campgrounds/index', { Camp, msg: req.flash('success') })

})
app.get('/campground/new', (req, res) => {
    if (!req.isAuthenticated()) {
        req.session.returnto = req.originalUrl
        req.flash('error', "you must be signed in")
        return res.redirect('/login')
    }
    res.render('campgrounds/new')
})
app.post('/campground', upload.array("image"), validatecampground, catchAsync(async(req, res, next) => {

        if (!req.isAuthenticated()) {
            req.session.returnto = req.originalUrl //isme user ne plhle route pe jo hit kra tha login hone se plhe us route ko save kr rakha h
            req.flash('error', "you must be signed in")
            return res.redirect('/login')
        }
        const geodata = await geocoder.forwardGeocode({
                query: req.body.location,
                limit: 1
            })
            .send()
        const camp = new Campground(req.body)
        camp.geometry = geodata.body.features[0].geometry
        camp.image = req.files.map(f => ({ url: f.path, filename: f.filename }))
        camp.author = req.user._id
        await camp.save()
        console.log(camp)
        req.flash('success', 'you made a new campground')
        res.redirect(`/campground/${camp._id}`)

    }))
    // app.post('/campground', upload.single("image"), function(req, res, next) {
    //     res.send('hello there')
    //     console.log(req.file, req.body) //res.send(does not support multiple things)


// })


app.get('/campground/:id', catchAsync(async(req, res) => {
    const { id } = req.params;
    const camp = await Campground.findById(id).populate({
        path: 'review',
        populate: {
            path: 'author'
        }
    }).populate('author')

    // req.user contain all the detail of the current user
    res.render('campgrounds/show', { camp, msg: req.flash('success'), msgs: req.flash('error') })

}))
app.get('/campground/:id/edit', catchAsync(async(req, res) => {
    if (!req.isAuthenticated()) {
        req.session.returnto = req.originalUrl
        req.flash('error', "you must be signed in")
        return res.redirect('/login')
    }
    const { id } = req.params;
    const camp = await Campground.findById(id)

    res.render('campgrounds/edit', { camp })

}))
app.put('/campground/:id', upload.array("image"), validatecampground, catchAsync(async(req, res) => {

    if (!req.isAuthenticated()) {
        req.session.returnto = req.originalUrl
        req.flash('error', "you must be signed in")
        return res.redirect('/login')
    }
    const { id } = req.params;

    const camp = await Campground.findById(id)
    if (!camp.author.equals(req.user._id)) { //original author or current user author me check krega
        req.flash('error', 'you dont have permission to do it')
        return res.redirect(`/campground/${id}`)
    }
    const camps = await Campground.findByIdAndUpdate(id, req.body)
    const img = req.files.map(f => ({ url: f.path, filename: f.filename })) //req.files me jo file upload krte he or is code me req.files ke array me se hm path ot url extract krege
    camps.image.push(...img) //ye existing image me or image dalne ke liye he
    await camps.save()
    if (req.body.deleteimages) {
        await camps.updateOne({ $pull: { image: { filename: { $in: req.body.deleteimages } } } })
        console.log(camps)
    }
    req.flash('success', 'you successfully edit the campground')
    res.redirect(`/campground/${camp._id}`)

}))
app.delete('/campground/:id', catchAsync(async(req, res) => {
    if (!req.isAuthenticated()) {
        req.session.returnto = req.originalUrl
        req.flash('error', "you must be signed in")
        return res.redirect('/login')

    }
    const { id } = req.params;
    const camp = await Campground.findByIdAndDelete(id)
    req.flash('success', 'you successfully deleted a campground')
    res.redirect('/campground')
}))








//review routes
app.post('/campground/:id/reviews', validatereview, catchAsync(async(req, res) => {
    if (!req.isAuthenticated()) {
        req.session.returnto = req.originalUrl //isme user ne plhle route pe jo hit kra tha login hone se plhe us route ko save kr rakha h
        req.flash('error', "you must be signed in")
        return res.redirect('/login')
    }


    const { id } = req.params;
    const camp = await Campground.findById(id)
    const review = new Review(req.body)
    review.author = req.user._id
    camp.review.push(review)
    review.save()
    camp.save()
    req.flash('success', 'you created a review')
    res.redirect(`/campground/${camp._id}`)

}))
app.delete('/campground/:id/review/:reviewId', catchAsync(async(req, res) => {

    const { reviewId, id } = req.params;
    const camp = await Campground.findByIdAndUpdate(id, { $pull: { review: reviewId } })
    const review = await Review.findByIdAndDelete(reviewId)
    req.flash('success', 'successfully deleted a review')
    res.redirect(`/campground/${id}`)

}))
// app.get('/home', (req, res) => {
//     res.render('campgrounds/home')

// })

app.all('*', (req, res) => {
    res.render('campgrounds/home')
   
})
app.use((err, req, res, next) => {
    const { message = 'something went wrong', statuscode = 400 } = err
    res.render('error', { err })
})
const port = process.env.PORT || 27017;


app.listen(port, () => {
    console.log(`serving on port ${port}`)
})