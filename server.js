require('dotenv').config();
const fs = require('fs');
const https = require('https');
const WebSocket = require('ws');
const connectDB = require('./mongodb_connect'); // Import MongoDB connection
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

// Load SSL certificates
const options = {
    key: fs.readFileSync('./key.pem'),
    cert: fs.readFileSync('./cert.pem')
};


// Connect to MongoDB
connectDB().then(() => {
    const db = mongoose.connection;
    const usersCollection = db.collection("users");
    const messagesCollection = db.collection("messages");

    // Create an HTTPS server
    const httpsServer = https.createServer(options);
    httpsServer.listen(8080, () => {
        console.log('Secure WebSocket server running on wss://192.168.1.25:8080');
    });

    // Create WebSocket server over HTTPS
    const wss = new WebSocket.Server({ server: httpsServer });

    const clients = new Map();

    wss.on('connection', (ws) => {
        console.log("New client connected");

        ws.on('message', async (message) => {
            try {
                const msgObj = JSON.parse(message);

                if (msgObj.type === 'signup') {
                    await handleSignup(ws, msgObj);
                    return;
                }

                if (msgObj.type === 'login') {
                    await handleLogin(ws, msgObj);
                    return;
                }

                await handleMessage(ws, msgObj);
            } catch (error) {
                console.error("Error processing message:", error);
            }
        });

        ws.on('close', () => {
            const username = clients.get(ws);
            console.log(`${username || 'A client'} disconnected`);
            clients.delete(ws);
        });
    });

    async function handleSignup(ws, msgObj) {
        const existingUser = await usersCollection.findOne({ username: msgObj.username });
        if (existingUser) {
            ws.send(JSON.stringify({ error: "Username already taken." }));
            return;
        }

        const hashedPassword = await bcrypt.hash(msgObj.password, 10);
        await usersCollection.insertOne({ username: msgObj.username, password: hashedPassword });

        ws.send(JSON.stringify({ status: "success", message: "Signup successful. Please log in." }));
    }

    async function handleLogin(ws, msgObj) {
        const user = await usersCollection.findOne({ username: msgObj.username });
        if (!user || !(await bcrypt.compare(msgObj.password, user.password))) {
            ws.send(JSON.stringify({ error: "Invalid username or password." }));
            return;
        }

        clients.set(ws, msgObj.username);
        console.log(`${msgObj.username} logged in`);
        ws.send(JSON.stringify({ status: "success", message: "Login successful." }));

        // Send chat history to the user
        const chatHistory = await messagesCollection.find().sort({ timestamp: -1 }).limit(10).toArray();
        chatHistory.reverse().forEach(msg => ws.send(JSON.stringify(msg)));
    }

    function sanitizeInput(input) {
        return input.replace(/[&<>"'`]/g, (char) => {
            const charMap = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;',
                '`': '&#96;'
            };
            return charMap[char];
        });
    }

    async function handleMessage(ws, msgObj) {
        if (!clients.has(ws)) {
            ws.send(JSON.stringify({ error: "You must log in first." }));
            return;
        }

        const username = clients.get(ws);
        const now = new Date();
        msgObj.timestamp = now.toISOString();
        msgObj.sender = username;
        msgObj.message = sanitizeInput(msgObj.message); // Sanitize message before storing

        await messagesCollection.insertOne(msgObj); // Store in MongoDB

        broadcast(msgObj); // Broadcast to other users
    }

    function broadcast(message) {
        const msgString = JSON.stringify(message);
        clients.forEach((clientUsername, client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(msgString);
            }
        });
    }
}).catch(err => {
    console.error('Failed to connect to MongoDB', err);
});

