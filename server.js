const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs'); // Added for users.json handling
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const USERS_FILE = path.join(__dirname, 'users.json');

// --- DATABASE ---
const MONGODB_URI = "mongodb+srv://LunaDev32:avathomasy66@cluster0.koya5nx.mongodb.net/?appName=Cluster0";
mongoose.connect(MONGODB_URI)
    .then(() => console.log("✅ Database Connected"))
    .catch(err => console.error("❌ DB Error:", err));

const userSchema = new mongoose.Schema({
    username: { type: String, unique: true },
    email: { type: String, unique: true },
    password: { type: String }, // Storing password for validation
    playerId: { type: String, unique: true },
    vbucks: { type: Number, default: 0 }
});
const User = mongoose.model('User', userSchema);

// --- HELPER: Save to users.json ---
const saveToJSON = (userData) => {
    let users = [];
    if (fs.existsSync(USERS_FILE)) {
        users = JSON.parse(fs.readFileSync(USERS_FILE));
    }
    // Check if user already exists in JSON to prevent duplicates
    if (!users.find(u => u.email === userData.email)) {
        users.push(userData);
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    }
};

// --- ROUTES ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public', 'register.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));

// --- AUTH & VALIDATION ---
app.post('/api/auth', async (req, res) => {
    const { email, username, password } = req.body;

    try {
        // 1. Check for existing user
        let user = await User.findOne({ email: email });

        // 2. REGISTRATION logic
        if (!user && username && password) {
            const randomId = crypto.randomBytes(2).toString('hex');
            const newUser = { 
                username, 
                email, 
                password, // Note: In production, you should hash this!
                playerId: `ICON_${randomId}` 
            };

            // Save to MongoDB
            user = await User.create(newUser);
            
            // Save to users.json
            saveToJSON(newUser);

            return res.json({ message: "Registered Successfully!", user });
        }

        // 3. LOGIN / VALIDATION logic
        if (user) {
            if (user.password === password) {
                return res.json({ message: "Login Validated!", user });
            } else {
                return res.status(401).json({ message: "Invalid Password" });
            }
        }

        res.status(404).json({ message: "User not found" });
    } catch (err) {
        res.status(500).json({ message: "Server Error" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
