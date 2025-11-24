# Guide de Déploiement

## 1. Staging
- Déployer sur un VPS (DigitalOcean, AWS, etc.)
- Installer Docker & Docker Compose
- Cloner le repo
- Configurer `.env`
- Lancer `docker-compose up -d`

## 2. Production
- Utiliser un reverse proxy (Nginx) avec SSL (Let's Encrypt)
- Configurer un firewall (UFW)
- Utiliser des services managés pour la DB (MongoDB Atlas, Redis Cloud) si possible
