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

// --- DATABASE CONNECTION ---
// Using your exact provided MongoDB URL (password updated to remove brackets)
const MONGODB_URI = "mongodb+srv://LunaDev32:avathomasy66@cluster0.koya5nx.mongodb.net/?appName=Cluster0";

mongoose.connect(MONGODB_URI)
    .then(() => console.log("✅ Database Connected to Cluster0"))
    .catch(err => console.error("❌ DB Error: Check your IP Whitelist on Atlas!", err));

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
    secret: 'icon_secret_key_123',
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
    } catch (err) {
        done(err, null);
    }
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
    } catch (err) {
        return done(err, null);
    }
}));

// --- ROUTES ---

// 1. Start Discord Login
app.get('/auth/discord', passport.authenticate('discord'));

// 2. The Callback (Valid HTML + JSON Page)
app.get('/auth/discord/callback', 
    passport.authenticate('discord', { failureRedirect: '/' }), 
    (req, res) => {
        // We use backticks (`) here so ${} variables work correctly
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Project Icon | Authenticated</title>
                <style>
                    body { background: #050505; color: white; font-family: 'Segoe UI', sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                    .card { background: #111; padding: 40px; border-radius: 20px; border: 1px solid #333; text-align: center; max-width: 400px; }
                    .json { background: #000; padding: 15px; border-radius: 10px; color: #00ff00; font-family: monospace; text-align: left; margin-top: 20px; font-size: 12px; }
                    .btn { background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 20px; }
                </style>
            </head>
            <body>
                <div class="card">
                    <h1 style="color:#007bff">AUTHENTICATED</h1>
                    <p>Welcome, <strong>${req.user.username}</strong>!</p>
                    <div class="json">
                        {
                            "status": "success",
                            "user": "${req.user.username}",
                            "vbucks": ${req.user.vbucks},
                            "id": "${req.user.discordId}"
                        }
                    </div>
                    <a href="/?auth=true" class="btn">Go to Dashboard</a>
                    <script>
                        setTimeout(() => { window.location.href = "/?auth=true"; }, 3000);
                    </script>
                </div>
            </body>
            </html>
        `);
    }
);

// 3. V-Bucks Claim Route
app.post('/api/claim', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not logged in" });
    
    const user = await User.findById(req.user.id);
    const now = new Date();
    const cooldown = 2 * 60 * 60 * 1000; // 2 hours

    if (now - user.lastClaimed < cooldown) {
        const diff = cooldown - (now - user.lastClaimed);
        const mins = Math.ceil(diff / 60000);
        return res.status(400).json({ message: \`Try again in \${mins} minutes.\` });
    }

    user.vbucks += 200;
    user.lastClaimed = now;
    await user.save();
    res.json({ message: "200 V-Bucks Claimed!", newBalance: user.vbucks });
});

// Serve Static Files
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(\`🚀 Server running on port \${PORT}\`));
