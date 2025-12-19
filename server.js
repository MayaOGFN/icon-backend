const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const crypto = require('crypto'); // For generating IDs
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const MONGODB_URI = "mongodb+srv://LunaDev32:avathomasy66@cluster0.koya5nx.mongodb.net/?appName=Cluster0";
mongoose.connect(MONGODB_URI).then(() => console.log("✅ DB Connected"));

const userSchema = new mongoose.Schema({
    username: { type: String, unique: true },
    playerId: { type: String, unique: true }, // The ID OGFN needs
    vbucks: { type: Number, default: 0 },
    lastClaimed: { type: Date, default: new Date(0) }
});
const User = mongoose.model('User', userSchema);

// --- REGISTER / LOGIN ROUTE ---
app.post('/api/auth', async (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).json({ message: "Username required" });

    try {
        let user = await User.findOne({ username });
        
        if (!user) {
            // REGISTER: Create new player with unique ID
            const randomId = crypto.randomBytes(2).toString('hex');
            const newPlayerId = `ICON_${randomId}`; 
            
            user = await User.create({ 
                username: username, 
                playerId: newPlayerId 
            });
            return res.json({ message: "Registered!", user });
        }
        
        // LOGIN: Return existing user
        res.json({ message: "Logged in!", user });
    } catch (err) { res.status(500).json({ message: "Server Error" }); }
});

// (Keep the /api/claim route from previous code here)

app.listen(3000, () => console.log("🚀 Server running on port 3000"));
