const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

const app = express();

// --- CONFIGURATION ---
// 1. Use the port Render gives us, or 4000 locally
const PORT = process.env.PORT || 4000;

// 2. MONGODB CONNECTION STRING
// IMPORTANT: Replace <password> with your actual password (no brackets < >)
const MONGO_URI = "mongodb+srv://LunaDev32:<avathomasy66>@cluster0.koya5nx.mongodb.net/?appName=Cluster0";

// Connect to MongoDB
mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ SUCCESS: Connected to MongoDB Atlas!"))
    .catch(err => console.error("❌ DATABASE ERROR: Check your password/IP whitelist!", err.message));

// 3. DATABASE MODEL (User Account)
const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

// --- MIDDLEWARE ---
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Serve the 'public' folder for the website
app.use(express.static(path.join(__dirname, 'public')));

// --- WEBSITE ROUTES ---

// Homepage
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Register Logic (Saves to MongoDB)
app.post('/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.send("<h1>Error</h1><p>Email already registered.</p><a href='/register.html'>Try again</a>");
        }

        const newUser = new User({ email, password });
        await newUser.save();
        
        console.log(`New user registered: ${email}`);
        res.send("<h1>Success!</h1><p>Account created for " + email + ". You can now login in the launcher.</p><a href='/'>Go Home</a>");
    } catch (err) {
        console.error(err);
        res.status(500).send("Server error during registration.");
    }
});

// --- LAUNCHER API ROUTES ---

// News API
app.get('/news', (req, res) => {
    res.json([
        {
            title: "Project Icon Live",
            body: "The backend is officially connected to MongoDB Atlas. Your accounts are now permanent!",
            author: "Luna",
            image: "https://i.imgur.com/83p73mS.png"
        }
    ]);
});

// Shop API (Reads from data/shop.json)
app.get('/shop', (req, res) => {
    const shopPath = path.join(__dirname, 'data', 'shop.json');
    try {
        if (fs.existsSync(shopPath)) {
            const rawData = fs.readFileSync(shopPath, 'utf8');
            res.json(JSON.parse(rawData));
        } else {
            res.json({ featured: [], daily: [] });
        }
    } catch (err) {
        res.status(500).json({ error: "Could not read shop file" });
    }
});

// --- START SERVER ---
app.listen(PORT, '0.0.0.0', () => {
    console.log(`-----------------------------------------`);
    console.log(`Project Icon Server running on Port: ${PORT}`);
    console.log(`URL: https://icon-backend-xz9o.onrender.com`);
    console.log(`-----------------------------------------`);
});