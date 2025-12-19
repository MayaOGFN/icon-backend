require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const session = require('express-session');
const path = require('path');

const app = express();
app.use(express.json());

// --- CONFIGURATION ---
const CLIENT_ID = '1451508740493934725';
const CLIENT_SECRET = 'aPdQ4Ya8DUEnrHkJp-5fyGFPoYAaGhkq';
const REDIRECT_URI = 'https://icon-backend-9chw.onrender.com/auth/discord/callback';

// FIXED: Correct MongoDB URL (No brackets around password)
const MONGODB_URI = "mongodb+srv://LunaDev32:avathomasy66@cluster0.koya5nx.mongodb.net/?appName=Cluster0";

// --- DATABASE CONNECTION ---
mongoose.connect(MONGODB_URI)
    .then(() => console.log("✅ Successfully connected to Cluster0"))
    .catch(err => console.error("❌ MongoDB Error: Check your IP Whitelist on Atlas!", err));

// --- USER MODEL ---
const userSchema = new mongoose.Schema({
    discordId: String,
    username: String,
    email: String,
    vbucks: { type: Number, default: 0 },
    lastClaimed: { type: Date, default: new Date(0) }
});
const User = mongoose.model('User', userSchema);

// --- AUTH & SESSION SETUP ---
app.use(session({
    secret: 'project_icon_super_secret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 60000 * 60 * 24 } // 1 day
}));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) { done(err, null); }
});

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
    } catch (err) { return done(err, null); }
}));

// --- ROUTES ---

// Discord Auth Initial
app.get('/auth/discord', passport.authenticate('discord'));

// Discord Callback (Valid HTML + JSON Page)
app.get('/auth/discord/callback', 
    passport.authenticate('discord', { failureRedirect: '/' }), 
    (req, res) => {
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Success | Project Icon</title>
                <style>
                    body { background: #050505; color: white; font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                    .card { background: #111; padding: 40px; border-radius: 15px; border: 1px solid #333; text-align: center; }
                    .json { background: #000; padding: 10px; color: #00ff00; font-family: monospace; font-size: 12px; margin-top: 15px; text-align: left; }
                </style>
            </head>
            <body>
                <div class="card">
                    <h1 style="color:#007bff">AUTHENTICATED</h1>
                    <p>Welcome back, ${req.user.username}!</p>
                    <div class="json">
                        {
                            "user": "${req.user.username}",
                            "vbucks": ${req.user.vbucks},
                            "status": "Ready"
                        }
                    </div>
                    <p style="font-size: 12px; color: #666;">Redirecting to Dashboard...</p>
                    <script>setTimeout(() => { window.location.href = "/?auth=true"; }, 2500);</script>
                </div>
            </body>
            </html>
        `);
    }
);

// Claim V-Bucks Route
app.post('/api/claim', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Please log in first!" });

    const user = await User.findById(req.user.id);
    const now = new Date();
    const cooldown = 2 * 60 * 60 * 1000; // 2 hours

    if (now - user.lastClaimed < cooldown) {
        const remaining = Math.ceil((cooldown - (now - user.lastClaimed)) / 60000);
        return res.status(400).json({ message: \`Wait \${remaining} minutes before claiming again!\` });
    }

    user.vbucks += 200;
    user.lastClaimed = now;
    await user.save();
    res.json({ message: "200 V-Bucks added!", newBalance: user.vbucks });
});

// User Info API
app.get('/api/me', (req, res) => {
    if (req.isAuthenticated()) return res.json(req.user);
    res.status(401).json({ message: "Unauthorized" });
});

// Logout
app.get('/logout', (req, res) => {
    req.logout(() => res.redirect('/'));
});

// Static Files
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(\`🚀 Server active on port \${PORT}\`));
