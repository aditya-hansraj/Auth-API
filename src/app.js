const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const env = require('dotenv').config();
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const Strategy = require('passport-local');
const User = require('../models/apiModel');
const { fail } = require('assert');
const { error } = require('console');

const app = express();
const port = 3000;
const dbURI = process.env.MONGODB_CONNECTION_STRING;
const saltRounds = 10;

const localStrategy = new Strategy(async function verify(username, password, cb) {
    try {
        const user = await User.findOne({username: username});
        if(!user) {
            return cb(`User ${username} doesn't exist ! Signup first !`);
        }
        else {
            const authenticated = await bcrypt.compare(password, user.password);
            if(authenticated) {
                return cb(null, user);
            } else {
                return cb("Incorrect Password !", false);
            }
        }
    } catch (err) {
        console.log(err);
        return cb(err);
    }
});

app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(
    session({
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: true,
      cookie: {
        maxAge: 1000 * 60 * 60 * 24,
      }
    })
);
app.use(passport.initialize());
app.use(passport.session());
app.use(require('body-parser').json());
app.use(express.urlencoded({extended: true}));

mongoose.connect(dbURI).then((resullt) => {
    app.listen(port, () => {
        console.log(`Server running on http://localhost:${port}`);
    });
    console.log("Database Connected Successfully !");
}).catch(err => {
    console.log(err);
});

function formatResponse(success, data, message) {
    return {
        success: success,
        data: data,
        message: message
    };
}
function createActivity(activity, time) {
    return {
        activity : activity,
        time: time ? time : Date.now()
    }
}

app.get('/', (req, res) => {
    res.send('homepage');
});

app.get('/profile', (req, res) => {
    if(req.isAuthenticated()) {
        const user = req.user;
        User.updateOne(
            {username: user.username},
            {$set: {'lastActivity': createActivity('Viewed Profile')}
        }).then(result => {
            const userProfile = { 
                username: user.username ,
                lastActivity: user.lastActivity
            };
            const profileResponse = formatResponse(true, userProfile, "User profile retrieved successfully");
            console.log(profileResponse);
            res.status(200).json(profileResponse);
        }).catch(err => {
            const errorResponse = formatResponse(false, null, err);
            console.log(errorResponse);
            res.status(500).json(errorResponse);
        });
    } else {
        const unauthorizedResponse = formatResponse(false, null, "User not authenticated");
        res.status(401).json(unauthorizedResponse);
    }
});

/* ------------ review ------------------------ 
app.get('/profile/lastActivity', (req, res) => {
    if (req.isAuthenticated()) {
        const user = req.user;
        const lastActivity = user.lastActivity; 
        User.updateOne(
            {username: user.username},
            {$set: {'lastActivity': createActivity('Checked last activity')}}
        ).then(result => {})
        .catch(err => {
            res.status(500).json({ success: false, message: err });
        })
        res.status(200).json({ success: true, lastActivity: lastActivity });
    } else {
        res.status(401).json({ success: false, message: "User not authenticated" });
    }
});
----------------------------------------------*/
app.post('/signup', async (req, res) => {
    const user = new User(req.body);
    let result;
    const userExists = await User.findOne({username: user.username});
    if(!userExists) {
        const hashedPassword = await bcrypt.hash(user.password, saltRounds);
        user.password = hashedPassword;
        user.lastActivity = createActivity("Signed Up");
        result = await User.create(user);
        req.login(user, (err) => {
            if(err) {
                console.log(err);
                res.status(500).send(err);
            }
            const successMessage = formatResponse(true, { username: user.username }, "Signup successful");
            console.log(successMessage);
            res.status(200).json(successMessage);
        })
    }else {
        result = formatResponse(false, null, "User already exists !");
        res.status(409).json(result);
    }
});

app.post('/login', passport.authenticate("local"), (req, res) =>{
    const user = req.user;
    if (user) {
        User.updateOne(
            {username: user.username},
            {$set: {'lastActivity': createActivity('Logged In')}
        }).then(result => {
            const successMessage = formatResponse(true, { username: req.user.username }, "Login successful");
            console.log(successMessage);
            res.status(200).json(successMessage);
        }).catch(err => {
            const errorMessage = formatResponse(false, null, err);
            console.log(err);
            res.status(500).json(errorMessage);
        })
    } else {
        const failureMessage = formatResponse(false, null, "Authentication failed");
        console.log(failureMessage);
        res.status(401).json(failureMessage);
    }
});
/* ------------ review ------------------------ 
app.post('/profile/updateusername', async (req, res) => {
    if(req.isAuthenticated()) {
        const newUsername = req.body.newUsername;
        const password = req.body.password;
        const user = req.body.user;
        const userId = user._id;

        User.updateOne(
            {_id: userId},
            {$set: {'lastActivity': createActivity('Update username')}
        }).then(async result => {
            const invalidUsername = await User.findOne({username: newUsername});
            if(invalidUsername) {
                const failureMessage = formatResponse(false, null, 
                    `Someone already has the username ${newUsername}`
                );
                console.log(failureMessage);
                res.status(409).json(failureMessage);
            } else {
                const hashedPassword = user.password;
                const correctPassword = await bcrypt.compare(password, hashedPassword);
                if(correctPassword) {
                    User.updateOne(
                        {_id: userId},
                        {$set: {'username': newUsername}}
                    ).then(result => {
                        const successMessage = formatResponse(true, result, "username updated successfully");
                        console.log(successMessage);
                        res.status(200).json(successMessage);
                    }).catch(err => {
                        const errorMessage = formatResponse(false, null, err);
                        console.log(errorMessage);
                        res.status(500).json(errorMessage);
                    });
                } else {
                    const failureMessage = formatResponse(false, null, "Incorrect Password");
                    console.log(failureMessage);
                    res.status(401).json(failureMessage);
                }
            }
        }).catch(err => {
            const errorMessage = formatResponse(false, null, err);
            console.log(errorMessage);
            res.status(500).json(errorMessage);
        });
    } else {
        const failureMessage = formatResponse(false, null, "User not authenticated");
        console.log(failureMessage);
        res.status(401).json(failureMessage);
    }
});
----------------------------------------------*/
passport.use('local', localStrategy);
passport.serializeUser((user, cb) => {
    cb(null, user);
});
passport.deserializeUser((user, cb) => {
    cb(null, user);
});
app.use((req, res) => {
    res.status(404).send('404 page not found !');
});