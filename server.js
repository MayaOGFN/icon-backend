const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const crypto = require('crypto');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- DATABASE ---
const MONGODB_URI = "mongodb+srv://LunaDev32:avathomasy66@cluster0.koya5nx.mongodb.net/?appName=Cluster0";
mongoose.connect(MONGODB_URI)
    .then(() => console.log("✅ Database Connected"))
    .catch(err => console.error("❌ DB Error:", err));

const userSchema = new mongoose.Schema({
    username: { type: String, unique: true },
    email: { type: String, unique: true },
    playerId: { type: String, unique: true },
    vbucks: { type: Number, default: 0 },
    lastClaimed: { type: Date, default: new Date(0) }
});
const User = mongoose.model('User', userSchema);

// --- HTML PAGE ROUTING ---
// These fix the "Cannot GET" errors by pointing URLs to your files
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public', 'register.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/shop', (req, res) => res.sendFile(path.join(__dirname, 'public', 'itemshop.html')));

// --- API ROUTES ---

// Auth Route (Used by Web and Launcher)
app.post('/api/auth', async (req, res) => {
    const { email, username } = req.body;
    try {
        let user = await User.findOne({ $or: [{ email: email }, { username: username }] });
        
        if (!user && username) { // Registration Logic
            const randomId = crypto.randomBytes(2).toString('hex');
            user = await User.create({ 
                username: username, 
                email: email,
                playerId: `ICON_${randomId}` 
            });
            return res.json({ message: "Registered!", user });
        }
        
        if (user) return res.json({ message: "Logged in!", user });
        res.status(404).json({ message: "User not found" });
    } catch (err) { res.status(500).json({ message: "Server Error" }); }
});

// Shop JSON Endpoint
app.get('/shop.json', (req, res) => {
    // Replace this with your actual shop data or require('./shop.json')
    res.json({
        featured: [
            { name: "Renegade Raider", price: 1200, image: "https://fortnite-api.com/images/cosmetics/br/cid_028_athena_commando_f_renegade/icon.png" }
        ],
        daily: [
            { name: "Scythe", price: 800, image: "https://fortnite-api.com/images/cosmetics/br/pickaxe_id_015_halloween/icon.png" }
        ]
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
