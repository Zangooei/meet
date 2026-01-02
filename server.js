
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const { ExpressPeerServer } = require('peer'); // Import PeerJS Server
const bcrypt = require('bcrypt');

const app = express();
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

app.use(express.static(path.join(__dirname, 'dist')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

if (!fs.existsSync('./uploads')) fs.mkdirSync('./uploads');

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, './uploads'),
    filename: (req, file, cb) => {
        const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(originalName);
        cb(null, uniqueSuffix + ext);
    }
});

const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" }, maxHttpBufferSize: 1e8 });

// function fileToDataImage(filePath) {
//     try {
//         const abs = path.join(__dirname, filePath);
//         const buffer = fs.readFileSync(abs);
//         const ext = path.extname(abs).substring(1);
//         return `data:image/${ext};base64,${buffer.toString('base64')}`;
//     } catch {
//         return null;
//     }
// }

function fileToDataImage(avatarUrl) {
    try {
        if (avatarUrl.startsWith('http')) return avatarUrl;
        const relativePath = avatarUrl.startsWith('/') ? avatarUrl.substring(1) : avatarUrl;
        const absPath = path.join(__dirname, relativePath);
        if (fs.existsSync(absPath)) {
            const buffer = fs.readFileSync(absPath);
            const ext = path.extname(absPath).substring(1) || 'png';
            return `data:image/${ext};base64,${buffer.toString('base64')}`;
        }
        return null;
    } catch (error) {
        console.error("Error converting file to Base64:", error);
        return null;
    }
}

// --- PeerJS Server Setup (CRITICAL FOR NEW VOICE SYSTEM) ---
const peerServer = ExpressPeerServer(server, {
    debug: true,
    path: '/'
});
app.use('/peerjs', peerServer);

// --- Database & Logic ---
const DB_FILE = './db.json';
const defaultDb = { users: [], channels: [{id: 101, name: 'عمومی', type: 'text'}, {id: 201, name: 'لابی', type: 'voice', users:[]}], messages: [], unreads: {} };
let db = { ...defaultDb };

if (fs.existsSync(DB_FILE)) {
    try { const loaded = JSON.parse(fs.readFileSync(DB_FILE)); db = { ...defaultDb, ...loaded }; if(!db.unreads) db.unreads={}; } catch (e) { console.error("DB Error", e); }
}
function saveDB() { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2)); }

// --- Routes ---
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No file" });
    const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
    res.json({ url: `/uploads/${req.file.filename}`, filename: originalName, mimetype: req.file.mimetype, size: req.file.size });
});

app.put('/api/users/profile', (req, res) => {
    const { userId, status, bio } = req.body;
    const user = db.users.find(u => u.id === userId);
    if (user) {
        if (status) user.status = status;
        if (typeof bio === 'string') user.bio = bio;
        saveDB();
        io.emit('user-update', { id: user.id, status: user.status, bio: user.bio });
    }
    res.json({ success: true });
});

app.get('/api/channels', (req, res) => {
    const userId = parseInt(req.query.userId);
    const visible = db.channels.filter(c => c.type !== 'dm' || (c.participants && c.participants.includes(userId)));
    const mapped = visible.map(c => {
        let count = 0;
        if (userId && (c.type === 'text' || c.type === 'dm')) count = db.unreads[`${userId}_${c.id}`] || 0;
        return { ...c, unreadCount: count };
    });
    res.json(mapped);
});

app.post('/api/dm', (req, res) => {
    const { myId, targetId } = req.body;
    let ch = db.channels.find(c => c.type === 'dm' && c.participants.includes(myId) && c.participants.includes(targetId));
    if (!ch) {
        const target = db.users.find(u => u.id === targetId);
        ch = { id: Date.now(), name: target ? target.username : 'PV', type: 'dm', participants: [myId, targetId], unreadCount: 0 };
        db.channels.push(ch); saveDB();
    }
    res.json(ch);
});

app.post('/api/channels/:id/read', (req, res) => {
    if (req.body.userId) { db.unreads[`${req.body.userId}_${req.params.id}`] = 0; saveDB(); }
    res.json({ success: true });
});

app.post('/api/auth/register', (req, res) => {
    const { username, password, avatar } = req.body;
    if (db.users.find(u => u.username === username)) {
        return res.status(400).json({ message: "Duplicate" });
    }
    let avatarPath = avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;
    if (avatar && avatar.startsWith('data:image')) {
        try {
            const base64Data = avatar.replace(/^data:image\/\w+;base64,/, "");
            const buffer = Buffer.from(base64Data, 'base64');
            const fileName = `avatar-${Date.now()}-${Math.round(Math.random() * 1E9)}.png`;
            const fullPath = path.join(__dirname, 'uploads', fileName);
            fs.writeFileSync(fullPath, buffer);
            avatarPath = `/uploads/${fileName}`;
        } catch (err) {
            console.error("Error saving avatar Base64:", err);
        }
    }
    const u = { 
        id: Date.now(), 
        username, 
        password: bcrypt.hashSync(password, 8), 
        avatar: avatarPath, 
        status: 'online', 
        bio: '' 
    };
    db.users.push(u); 
    saveDB();
    res.json({ user: { ...u, password: '' }, token: 'jwt-' + u.id });
});
// app.post('/api/auth/register', (req, res) => {
//     const { username, password, avatar } = req.body;
//     if (db.users.find(u => u.username === username)) return res.status(400).json({ message: "Duplicate" });
//     const u = { id: Date.now(), username, password: bcrypt.hashSync(password, 8), avatar: avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`, status: 'online', bio: '' };
//     db.users.push(u); saveDB();
//     res.json({ user: { ...u, password: '' }, token: 'jwt-' + u.id });
// });
// app.post('/api/auth/register', (req, res) => {
//     const { username, password, avatarPath } = req.body;

//     if (db.users.find(u => u.username === username))
//         return res.status(400).json({ message: "Duplicate" });

//     const u = {
//         id: Date.now(),
//         username,
//         password: bcrypt.hashSync(password, 8),
//         avatar: avatarPath || null, // 👈 فقط path
//         status: 'online',
//         bio: ''
//     };

//     db.users.push(u);
//     saveDB();

//     const { password: _, ...safeUser } = u;
//     res.json({ user: safeUser, token: 'jwt-' + u.id });
// });

app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    const u = db.users.find(u => u.username === username);
    if (!u || !bcrypt.compareSync(password, u.password)) return res.status(401).json({ message: "Invalid" });
    res.json({ user: { ...u, password: '' }, token: 'jwt-' + u.id });
});

app.get('/api/users', (req, res) => res.json(db.users.map(u => ({ id: u.id, username: u.username, avatar: u.avatar, status: u.status, bio: u.bio }))));
// app.get('/api/users', (req, res) => {
//     const users = db.users.map(u => ({
//         id: u.id,
//         username: u.username,
//         status: u.status,
//         bio: u.bio,
//         avatar: u.avatar ? fileToDataImage(u.avatar) : null
//     }));

//     res.json(users);
// });

app.get('/api/messages/:id', (req, res) => res.json(db.messages.filter(m => m.channelId == req.params.id)));

app.post('/api/messages', (req, res) => {
    const { content, channelId, userId, attachment, replyToId } = req.body;
    let replyToMsg = undefined;
    if (replyToId) replyToMsg = db.messages.find(m => m.id === replyToId);
    const msg = { id: Date.now(), content, channelId, userId, attachment, replyTo: replyToMsg, createdAt: new Date().toISOString() };
    db.messages.push(msg);
    if(db.messages.length > 500) db.messages = db.messages.slice(-500);
    
    db.users.forEach(u => {
        if (String(u.id) !== String(userId)) {
            const ch = db.channels.find(c => c.id == channelId);
            if (ch && (ch.type === 'text' || (ch.type === 'dm' && ch.participants.includes(u.id)))) {
                db.unreads[`${u.id}_${channelId}`] = (db.unreads[`${u.id}_${channelId}`] || 0) + 1;
            }
        }
    });
    saveDB();
    io.to(`text-${channelId}`).emit('new-message', msg);
    const ch = db.channels.find(c => c.id == channelId);
    if (ch?.type === 'dm') io.emit('dm-update', { participants: ch.participants, channelId });
    res.json(msg);
});

app.put('/api/messages/:id', (req, res) => {
    const { content } = req.body;
    const msg = db.messages.find(m => m.id == req.params.id);
    if (msg) { msg.content = content; msg.isEdited = true; saveDB(); io.to(`text-${msg.channelId}`).emit('message-edited', msg); }
    res.json({ success: true });
});

app.delete('/api/messages/:id', (req, res) => {
    const index = db.messages.findIndex(m => m.id == req.params.id);
    if (index !== -1) { const msg = db.messages[index]; db.messages.splice(index, 1); saveDB(); io.to(`text-${msg.channelId}`).emit('message-deleted', msg.id); }
    res.json({ success: true });
});

app.get(/.*/, (req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));

// --- Socket Logic (Updated for PeerJS) ---
const voiceRooms = {}; // { roomId: [ { socketId, peerId, user... } ] }

io.on('connection', (socket) => {
    socket.on('join-text', (cid) => socket.join(`text-${cid}`));

    // When user joins voice (New Logic)
    socket.on('join-voice', ({ channelId, user, peerId, isMuted, isDeafened }) => {
        const roomId = channelId.toString();
        socket.join(`voice-${roomId}`);
        
        // Remove user from other rooms if present
        for (const r in voiceRooms) {
            voiceRooms[r] = voiceRooms[r].filter(u => u.socketId !== socket.id);
        }

        if (!voiceRooms[roomId]) voiceRooms[roomId] = [];
        
        const newUser = { 
            socketId: socket.id, 
            peerId, // PeerJS ID is critical here
            id: user.id, 
            username: user.username, 
            avatar: user.avatar,
            isMuted: isMuted || false,
            isDeafened: isDeafened || false
        };

        voiceRooms[roomId].push(newUser);

        // Send updated list to everyone in room
        io.to(`voice-${roomId}`).emit('voice-update', { channelId: Number(roomId), users: voiceRooms[roomId] });
        
        // Notify others that a new peer connected (so they can call them)
        socket.to(`voice-${roomId}`).emit('user-connected', peerId);
    });

    socket.on('leave-voice', () => {
        for (const roomId in voiceRooms) {
            const user = voiceRooms[roomId].find(u => u.socketId === socket.id);
            if (user) {
                voiceRooms[roomId] = voiceRooms[roomId].filter(u => u.socketId !== socket.id);
                io.to(`voice-${roomId}`).emit('voice-update', { channelId: Number(roomId), users: voiceRooms[roomId] });
                io.to(`voice-${roomId}`).emit('user-disconnected', user.peerId);
            }
        }
    });

    socket.on('disconnect', () => {
        for (const roomId in voiceRooms) {
            const user = voiceRooms[roomId].find(u => u.socketId === socket.id);
            if (user) {
                voiceRooms[roomId] = voiceRooms[roomId].filter(u => u.socketId !== socket.id);
                io.to(`voice-${roomId}`).emit('voice-update', { channelId: Number(roomId), users: voiceRooms[roomId] });
                io.to(`voice-${roomId}`).emit('user-disconnected', user.peerId);
            }
        }
    });
    
    // Sync mute/deafen state
    socket.on('user-toggle-state', (state) => {
        for (const roomId in voiceRooms) {
            const user = voiceRooms[roomId].find(u => u.socketId === socket.id);
            if (user) {
                Object.assign(user, state);
                io.to(`voice-${roomId}`).emit('voice-update', { channelId: Number(roomId), users: voiceRooms[roomId] });
            }
        }
    });
});

server.listen(3000, () => console.log('Server running on 3000 with PeerJS Support'));