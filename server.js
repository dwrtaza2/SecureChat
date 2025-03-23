// ============================
// SecureChat v2 - server.js (with user list support)
// ============================

const fs = require('fs');
const https = require('https');
const path = require('path');
const express = require('express');
const WebSocket = require('ws');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const { decryptMessage, encryptMessage, generateRSAKeys, encryptAESKeyWithRSA, decryptAESKeyWithRSA } = require('./utils/cryptoUtils');
const bruteForce = require('./utils/bruteForceTracker');
const connectDB = require('./mongodb_connect');
const User = require('./models/User');

dotenv.config();
connectDB();

const app = express();
const PORT = 8080;

// SSL Config
const server = https.createServer({
  key: fs.readFileSync(path.join(__dirname, 'ssl/key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'ssl/cert.pem'))
}, app);

// Serve static files (like client.html)
app.use(express.static(path.join(__dirname, 'public')));

// WebSocket Server
const wss = new WebSocket.Server({ server });

// Active connections with metadata
const clients = new Map();

wss.on('connection', (ws) => {
  console.log('✅ New WebSocket connection');

  ws.on('message', async (data) => {
    try {
      const msg = JSON.parse(data);

      // ========== SIGNUP ==========
      if (msg.type === 'signup') {
        if (!msg.username || !msg.password) {
          ws.send(JSON.stringify({ type: 'error', message: 'Username and password are required.' }));
          return;
        }

        const existing = await User.findOne({ username: msg.username });
        if (existing) {
          ws.send(JSON.stringify({ type: 'error', message: 'User already exists.' }));
          return;
        }

        const hash = await bcrypt.hash(msg.password, 10);
        const newUser = new User({ username: msg.username, passwordHash: hash });
        await newUser.save();

        ws.send(JSON.stringify({ type: 'success', message: 'Signup successful.' }));
        return;
      }

      // ========== LOGIN ==========
      if (msg.type === 'login') {
        if (!msg.username || !msg.password) {
          ws.send(JSON.stringify({ type: 'error', message: 'Username and password are required.' }));
          return;
        }

        const user = await User.findOne({ username: msg.username });
        if (!user || !(await bcrypt.compare(msg.password, user.passwordHash))) {
          ws.send(JSON.stringify({ type: 'error', message: 'Invalid username or password.' }));
          return;
        }

        ws.username = msg.username;

        // Fetch all other users except the logged-in user
        const allUsers = await User.find({ username: { $ne: msg.username } }).select('username -_id');
        const usernames = allUsers.map(u => u.username);

        console.log("Sending user list:", usernames);

        ws.send(JSON.stringify({
            type: 'login-success',
            message: 'Login successful.',
            users: usernames
        }));
      }

      // ========== AES Key Exchange ==========
      if (msg.type === 'aes-key') {
        const client = clients.get(ws);
        const decryptedAESKey = decryptAESKeyWithRSA(msg.encryptedKey, client.rsaPrivateKey);
        client.aesKey = decryptedAESKey;
        return;
      }

      // ========== ENCRYPTED MESSAGE ==========
      if (msg.type === 'chat') {
        const sender = clients.get(ws);
        if (!sender || !sender.aesKey) return;

        const plainText = decryptMessage(msg.encryptedMessage, sender.aesKey);
        const logLine = `[${new Date().toLocaleTimeString()}] ${sender.username}: ${plainText}\n`;
        logChat(sender.username, msg.recipient, logLine);

        for (let client of wss.clients) {
          const recipient = clients.get(client);
          if (recipient && recipient.username === msg.recipient && recipient.aesKey && client.readyState === WebSocket.OPEN) {
            const reEncrypted = encryptMessage(plainText, recipient.aesKey);
            client.send(JSON.stringify({ type: 'chat', from: sender.username, encryptedMessage: reEncrypted }));
          }
        }
      }

    } catch (err) {
      console.error('❌ Error:', err);
      ws.send(JSON.stringify({ type: 'error', message: 'Internal server error.' }));
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log('🔌 Client disconnected');
  });
});

// Logging Function
function logChat(user1, user2, message) {
  const sorted = [user1, user2].sort();
  const filename = `${sorted[0]}_${sorted[1]}_${new Date().toISOString().split('T')[0]}.txt`;
  const filePath = path.join(__dirname, 'logs', filename);
  fs.appendFileSync(filePath, message);
}

server.listen(PORT, () => {
  console.log(`🚀 SecureChat Server running at https://localhost:${PORT}`);
});