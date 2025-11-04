const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const app = require('./app');
const { initSocket } = require('./socket/handlers');

dotenv.config();

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

async function start() {
    try {
        if (!MONGODB_URI) {
            console.warn('[WARN] MONGODB_URI non défini. Définissez MONGODB_URI dans .env');
        } else {
            await mongoose.connect(MONGODB_URI, {
            });
            console.log('[DB] Connecté à MongoDB');
        }

        const server = http.createServer(app);
        const io = new Server(server, {
            cors: { origin: '*' },
        });

        initSocket(io);

        server.listen(PORT, () => {
            console.log(`Serveur démarré sur http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error('Erreur de démarrage:', err);
        process.exit(1);
    }
}

if (require.main === module) {
    start();
}

module.exports = { start };
