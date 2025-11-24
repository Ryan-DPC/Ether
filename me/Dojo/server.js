// === Duel Dojo - Serveur principal ===
import express from "express";
import { WebSocketServer } from "ws";
import http from "http";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = 3000;

// Servir les fichiers du dossier public
app.use(express.static("public"));

let players = [];

wss.on("connection", (ws) => {
  console.log("👤 Nouveau joueur connecté");
  players.push(ws);

  ws.on("message", (data) => {
    const msg = JSON.parse(data);
    // 🔁 Broadcast à tous les autres joueurs
    players.forEach((p) => {
      if (p !== ws && p.readyState === p.OPEN) {
        p.send(JSON.stringify(msg));
      }
    });
  });

  ws.on("close", () => {
    players = players.filter((p) => p !== ws);
    console.log("❌ Joueur déconnecté");
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Serveur Duel Dojo lancé sur http://localhost:${PORT}`);
});
