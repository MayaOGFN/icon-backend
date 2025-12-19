require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const session = require('express-session');

const app = express();
app.use(express.json());

// --- MONGODB CONNECTION ---
// Make sure 0.0.0.0/0 is whitelisted in MongoDB Atlas!
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log("✅ Connected to MongoDB Atlas"))
    .catch(err => console.error("❌ MongoDB Error:", err));

// --- USER SCHEMA ---
const userSchema = new mongoose.Schema({
    discordId: String,
    username: String,
    email: String,
    vbucks: { type: Number, default: 0 },
    lastClaimed: { type: Date, default: new Date(0) } // Initialized to long ago
});
const User = mongoose.model('User', userSchema);

// --- DISCORD OAUTH SETUP ---
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => User.findById(id, (err, user) => done(err, user)));

passport.use(new DiscordStrategy({
    clientID: process.env.1451508740493934725,
    clientSecret: process.env.aPdQ4Ya8DUEnrHkJp-5fyGFPoYAaGhkq,
    callbackURL: "https://icon-backend-9chw.onrender.com/auth/discord/callback",
    scope: ['identify', 'email']
}, async (accessToken, refreshToken, profile, done) => {
    try {
        let user = await User.findOne({ discordId: profile.id });
        if (!user) {
            user = await User.create({
                discordId: profile.id,
                username: profile.username,
                email: profile.email,
                vbucks: 0
            });
        }
        return done(null, user);
    } catch (err) {
        return done(err, null);
    }
}));

app.use(session({ secret: 'project_icon_secret', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

// --- AUTH ROUTES ---
app.get('/auth/discord', passport.authenticate('discord'));
app.get('/auth/discord/callback', passport.authenticate('discord', {
    failureRedirect: '/'
}), (req, res) => res.redirect('/dashboard')); // Redirect to your HTML dashboard

// --- V-BUCKS CLAIM ROUTE (2 HOUR COOLDOWN) ---
app.post('/api/claim', async (req, res) => {
    // In a real app, use req.user.id from session
    const { email } = req.body; 
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ message: "User not found" });

    const now = new Date();
    const cooldown = 2 * 60 * 60 * 1000; // 2 hours in ms
    const timePassed = now - new Date(user.lastClaimed);

    if (timePassed < cooldown) {
        const timeLeft = cooldown - timePassed;
        const minutes = Math.ceil(timeLeft / (1000 * 60));
        return res.status(400).json({ 
            message: `Too soon! Try again in ${minutes} minutes.` 
        });
    }

    user.vbucks += 200;
    user.lastClaimed = now;
    await user.save();

    res.json({ message: "Success! 200 V-Bucks added.", newBalance: user.vbucks });
});

// --- SHOP DATA ROUTE ---
app.get('/code/shop', (req, res) => {
    // Your shop.json logic here
    res.sendFile(__dirname + '/shop.json');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
});
