# Ether — Guide de démarrage local

Pré-requis:
- Docker & Docker Compose
- Node.js 18+ (optionnel local)
- Git

Lancement rapide:
1. Copier `.env.example` → `.env` et remplir les clés.
2. Se placer dans `/infrastructure` :
   ```bash
   docker-compose up --build
   ```

Frontend:
Ouvrir `/frontend` et faire `npm install` puis `npm run dev`

Backend:
(si non docker) `/backend` `npm install` `npm run dev`

WS:
(si non docker) `/server` `npm install` `npm run dev`

Ports par défaut:
Backend API: http://localhost:3000
WebSocket: ws://localhost:4000
MongoDB: 27017
Redis: 6379
