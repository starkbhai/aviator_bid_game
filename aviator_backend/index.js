const express = require("express");
const cors = require("cors");
const http = require("http");
const WebSocket = require("ws");
const aviatorSocket = require("./sockets/aviatorSocket");




const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Aviator backend running 🚀");
});

const PORT = process.env.PORT || 7002;

// 🔹 Create HTTP server explicitly
const server = http.createServer(app);

// 🔹 Attach WebSocket server
const wsServer = new WebSocket.Server({
  server,
  perMessageDeflate: false, // better for games
});

// 🔹 Attach Aviator socket logic
aviatorSocket(wsServer);

// 🔹 Start server
server.listen(PORT, () => {
  console.log(`Server running → http://localhost:${PORT}`);
});
