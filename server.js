const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- DATA FOLDER & JSON SETUP ---
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
}
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Helper to get users from JSON
const getJSONUsers = () => {
    if (!fs.existsSync(USERS_FILE)) return [];
    try {
        const data = fs.readFileSync(USERS_FILE);
        return JSON.parse(data);
    } catch (e) { return []; }
};

// Helper to save user to JSON
const saveToJSON = (userData) => {
    const users = getJSONUsers();
    if (!users.find(u => u.email === userData.email)) {
        users.push(userData);
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    }
};

// --- DATABASE (For Launcher Auth) ---
const MONGODB_URI = "mongodb+srv://LunaDev32:avathomasy66@cluster0.koya5nx.mongodb.net/?appName=Cluster0";
mongoose.connect(MONGODB_URI)
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => console.error("❌ DB Error:", err));

const userSchema = new mongoose.Schema({
    username: { type: String, unique: true },
    email: { type: String, unique: true },
    password: { type: String },
    playerId: { type: String, unique: true },
    selectedServer: { type: String, default: "Auto" }
});
const User = mongoose.model('User', userSchema);

// --- HTML ROUTES ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public', 'register.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/shop', (req, res) => res.sendFile(path.join(__dirname, 'public', 'itemshop.html')));

// --- API ROUTES ---

// Unified Auth (Registration & Login)
app.post('/api/auth', async (req, res) => {
    const { email, password, username, type } = req.body;

    try {
        if (type === 'register') {
            // Check if user exists
            const existing = await User.findOne({ email });
            if (existing) return res.status(400).json({ message: "User already exists" });

            const randomId = crypto.randomBytes(2).toString('hex');
            const userData = {
                username,
                email,
                password,
                playerId: `ICON_${randomId}`,
                selectedServer: "Auto"
            };

            // Save to Mongo & JSON
            const newUser = await User.create(userData);
            saveToJSON(userData);

            return res.json({ message: "Registered!", user: newUser });
        } else {
            // Login Logic
            const user = await User.findOne({ email });
            if (user && user.password === password) {
                return res.json({ message: "Logged in!", user });
            }
            res.status(401).json({ message: "Invalid email or password" });
        }
    } catch (err) {
        res.status(500).json({ message: "Server Error" });
    }
});

// Update Server Settings
app.post('/api/settings/server', async (req, res) => {
    const { email, serverName } = req.body;
    try {
        await User.findOneAndUpdate({ email }, { selectedServer: serverName });
        // Update JSON file as well
        const users = getJSONUsers();
        const idx = users.findIndex(u => u.email === email);
        if (idx !== -1) {
            users[idx].server = serverName;
            fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
        }
        res.json({ message: "Server updated to " + serverName });
    } catch (err) { res.status(500).json({ message: "Failed to update server" }); }
});

// Shop Data
app.get('/shop.json', (req, res) => {
    res.json({
        featured: [{ name: "Renegade Raider", price: 1200, image: "https://fortnite-api.com/images/cosmetics/br/cid_028_athena_commando_f_renegade/icon.png" }],
        daily: [{ name: "Scythe", price: 800, image: "https://fortnite-api.com/images/cosmetics/br/pickaxe_id_015_halloween/icon.png" }]
    });
});

// --- SOCKET.IO CHAT ---
io.on('connection', (socket) => {
    console.log('👤 User connected to chat');

    socket.on('send_message', (data) => {
        // data looks like: { user: "Fynox", msg: "Hello!" }
        io.emit('receive_message', data); 
    });

    socket.on('disconnect', () => {
        console.log('👤 User disconnected');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Icon Server running on port ${PORT}`);
});
