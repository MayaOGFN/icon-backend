const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
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
    vbucks: { type: Number, default: 0 },
    lastClaimed: { type: Date, default: new Date(0) }
});
const User = mongoose.model('User', userSchema);

// --- ROUTES ---

// Simple Login/Signup
app.post('/api/login', async (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).json({ message: "Username required" });

    try {
        let user = await User.findOne({ username });
        if (!user) {
            user = await User.create({ username });
        }
        res.json(user);
    } catch (err) { res.status(500).json({ message: "DB Error" }); }
});

// Claim V-Bucks
app.post('/api/claim', async (req, res) => {
    const { username } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ message: "User not found" });

    const now = new Date();
    const cooldown = 2 * 60 * 60 * 1000;

    if (now - user.lastClaimed < cooldown) {
        const mins = Math.ceil((cooldown - (now - user.lastClaimed)) / 60000);
        return res.status(400).json({ message: `Try again in ${mins} minutes.` });
    }

    user.vbucks += 200;
    user.lastClaimed = now;
    await user.save();
    res.json({ message: "200 V-Bucks Added!", newBalance: user.vbucks });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
