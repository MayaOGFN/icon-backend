const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- DATA FOLDER & JSON SETUP ---
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
const USERS_FILE = path.join(DATA_DIR, 'users.json');

const getJSONUsers = () => {
    if (!fs.existsSync(USERS_FILE)) return [];
    try {
        return JSON.parse(fs.readFileSync(USERS_FILE));
    } catch (e) { return []; }
};

const saveToJSON = (userData) => {
    const users = getJSONUsers();
    if (!users.find(u => u.email === userData.email)) {
        users.push(userData);
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    }
};

// --- DATABASE ---
const MONGODB_URI = "mongodb+srv://LunaDev32:avathomasy66@cluster0.koya5nx.mongodb.net/?appName=Cluster0";
mongoose.connect(MONGODB_URI).then(() => console.log("✅ DB Connected"));

const userSchema = new mongoose.Schema({
    username: { type: String, unique: true },
    email: { type: String, unique: true },
    password: { type: String },
    playerId: { type: String, unique: true },
    selectedServer: { type: String, default: "Auto" }
});
const User = mongoose.model('User', userSchema);

// --- ROUTES ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public', 'register.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));

app.post('/api/auth', async (req, res) => {
    const { email, password, username, type } = req.body;
    try {
        if (type === 'register') {
            const existing = await User.findOne({ email });
            if (existing) return res.status(400).json({ message: "User exists" });

            const userData = {
                username, email, password,
                playerId: `ICON_${crypto.randomBytes(2).toString('hex')}`,
                selectedServer: "Auto"
            };
            const newUser = await User.create(userData);
            saveToJSON(userData);
            return res.json({ message: "Registered!", user: newUser });
        } else {
            const user = await User.findOne({ email });
            if (user && user.password === password) return res.json({ message: "Logged in!", user });
            res.status(401).json({ message: "Invalid email or password" });
        }
    } catch (err) { res.status(500).json({ message: "Server Error" }); }
});

app.post('/api/settings/server', async (req, res) => {
    const { email, serverName } = req.body;
    try {
        await User.findOneAndUpdate({ email }, { selectedServer: serverName });
        const users = getJSONUsers();
        const idx = users.findIndex(u => u.email === email);
        if (idx !== -1) {
            users[idx].selectedServer = serverName;
            fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
        }
        res.json({ message: "Server updated" });
    } catch (err) { res.status(500).send(); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server on ${PORT}`));
