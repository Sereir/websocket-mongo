const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();

// Middlewares globaux
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// En dev, le client React tourne sur Vite (5173) via proxy.
// En prod, on sert le build React (client/dist). On ne sert plus public/ par défaut.

// Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const messageRoutes = require('./routes/messages');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);

// ping
app.get('/health', (req, res) => {
    res.json({ ok: true, service: 'websocket-mongo', timestamp: new Date().toISOString() });
});

const auth = require('./middleware/auth');
const { getConversations } = require('./controllers/messageController');
app.get('/api/conversations', auth, getConversations);

const clientDist = path.join(__dirname, '../client/dist');
const clientIndex = path.join(clientDist, 'index.html');
if (fs.existsSync(clientDist) && fs.existsSync(clientIndex)) {
    app.use(express.static(clientDist));
    app.get(/^(?!\/api\/).*$/, (req, res) => {
        res.sendFile(clientIndex);
    });
}

app.use((req, res) => {
    res.status(404).json({ error: 'Not Found' });
});

module.exports = app;
