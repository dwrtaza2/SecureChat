SecureChat User Guide




Introduction


SecureChat is a WebSocket-based chat application that provides real-time communication with secure authentication using hashed passwords. This guide walks you through the steps to install and set up SecureChat on your local machine and client machine as well.
1. Prerequisites


Ensure you have the following installed before proceeding:
Node.js (version 16 or higher)
MongoDB Atals and account
OpenSSL (for generating SSL certificates)

2. Cloning the Repository


To get started, clone the SecureChat repository from GitHub:
   git clone 
   cd SecureChat

3. Install Dependencies


Run the following command inside the project directory:
    npm install dotenv
    npm install mongoose
    npm install bcryptjs crypto-js

4. Generate SSL Certificates


Run this command in the project directory to generate a self-signed certificate:
openssl req -nodes -new -x509 -keyout key.pem -out cert.pem
You'll be prompted to enter information like Country Name, State, Organization Name, and Common Name (CN). For local testing, you can leave most fields blank and just press Enter.
Make sure that both cert.pem and key.pem are in the project folder.

Transporting SSL Certificates:
For now we are using usb for cert.pem.


5. Configure Environment Variables


Create a .env file or use the reference file and put .env instead of .txt in the root directory and set up the following :
Go to MongoDB Atlas and sign up.
Click Create a Cluster and select the free tier.
Choose a cloud provider and region.
Click Create Database and set up a database named SecureChatDB.
Navigate to Database Access, create a new user, and set a password.
Navigate to Network Access, add your IP or allow all (0.0.0.0/0 for testing).
Copy the MongoDB Connection String and modify it in the .env file:

 MONGO_URI=mongodb+srv://USERNAME:PASSWORD@your-cluster.mongodb.net/SecureChatDB?retryWrites=true&w=majority
Replace USERNAME and PASSWORD with your MongoDB credentials.


For ease of usability, I will include our database Username and Password to you on Canvas, not here on GitHub



6. Start the Server


To start the WebSocket server, run:
node server.js
If everything is set up correctly, you should see:
MongoDB connected  
Secure WebSocket server running on wss://192.168.1.25:8080


7. Running the Client


Open client.html in a web browser to connect to the chat server just drag it from your VsCode or text editor to the web browser. Or (Recommended) download the html file and open it in the web browser where the certificate is located.  If running locally, ensure your browser allows wss:// connections


8. Troubleshooting

If the MongoDB connection fails, check that your URI in .env is correct.
If the server does not start, ensure port 8080 is available.
If the client doesn’t connect, verify WebSocket and TLS certificates. The certificate locations are quite sensitive, you must ensure you download the certificate is where you try to connect.
9. Future Improvements
Implement message encryption for end-to-end security.
Improve UI/UX for a better chat experience.
The ability to transfer certificates more effectively

Sources: 

https://npmjs.com/package/ws
https://www.cloudflare.com/learning/ssl/what-is-ssl/
https://openai.com/index/chatgpt/