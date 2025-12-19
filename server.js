require('dotenv')require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const session = require('express-session');
const path = require('path');

const app = express();

// --- CONFIGURATION ---
const CLIENT_ID = '1451508740493934725';
const CLIENT_SECRET = 'aPdQ4Ya8DUEnrHkJp-5fyGFPoYAaGhkq';
const REDIRECT_URI = 'https://icon-backend-9chw.onrender.com/auth/discord/callback';
const MONGODB_URI = process.env.MONGODB_URI; // Set this in Render Dashboard!

// --- DATABASE SETUP ---
mongoose.connect(MONGODB_URI)
    .then(() => console.log("✅ Database Connected"))
    .catch(err => console.error("❌ Database Connection Error:", err));

const userSchema = new mongoose.Schema({
    discordId: String,
    username: String,
    email: String,
    vbucks: { type: Number, default: 0 },
    lastClaimed: { type: Date, default: new Date(0) }
});
const User = mongoose.model('User', userSchema);

// --- PASSPORT / SESSION SETUP ---
app.use(session({
    secret: 'icon_launcher_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 60000 * 60 * 24 } // 24 hours
}));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

// --- DISCORD STRATEGY ---
passport.use(new DiscordStrategy({
    clientID: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    callbackURL: REDIRECT_URI,
    scope: ['identify', 'email', 'guilds.join']
}, async (accessToken, refreshToken, profile, done) => {
    try {
        let user = await User.findOne({ discordId: profile.id });
        if (!user) {
            user = await User.create({
                discordId: profile.id,
                username: profile.username,
                email: profile.email
            });
        }
        return done(null, user);
    } catch (err) {
        return done(err, null);
    }
}));

// --- ROUTES ---

// Middleware to check if user is logged in
const checkAuth = (req, res, next) => {
    if (req.isAuthenticated()) return next();
    res.redirect('/');
};

// Discord Login
app.get('/auth/discord', passport.authenticate('discord'));

// Discord Callback
app.get('/auth/discord/callback', 
    passport.authenticate('discord', { failureRedirect: '/' }), 
    (req, res) => {
        // Redirect to index with user info in URL for the UI to catch
        res.redirect(`/?auth=true&user=${encodeURIComponent(req.user.username)}&vbucks=${req.user.vbucks}`);
    }
);

// Claim V-Bucks Route
app.post('/api/claim', checkAuth, async (req, res) => {
    const user = await User.findById(req.user.id);
    const now = new Date();
    const cooldown = 2 * 60 * 60 * 1000; // 2 hours

    if (now - user.lastClaimed < cooldown) {
        const remainingMs = cooldown - (now - user.lastClaimed);
        const minutes = Math.ceil(remainingMs / 60000);
        return res.status(400).json({ message: `Cooldown! Try again in ${minutes} minutes.` });
    }

    user.vbucks += 200;
    user.lastClaimed = now;
    await user.save();

    res.json({ message: "200 V-Bucks Claimed!", newBalance: user.vbucks });
});

// Logout
app.get('/logout', (req, res) => {
    req.logout(() => res.redirect('/'));
});

// Serve Static Files (Make sure your index.html is in a folder named 'public')
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Project Icon Backend running on port ${PORT}`));
