# Ether

## 1. Présentation du Projet

**Ether** est une plateforme moderne de distribution de jeux vidéo et un réseau social intégré pour les joueurs. Conçue pour offrir une expérience fluide et immersive, elle combine les fonctionnalités d'un marketplace de jeux avec des outils sociaux en temps réel.

### Fonctionnalités Clés :

*   **Marketplace & Boutique** : Achetez et vendez des jeux. Les développeurs peuvent publier leurs créations et les joueurs peuvent revendre leurs copies numériques (système de propriété unique).
*   **Bibliothèque de Jeux** : Gérez votre collection, installez et lancez vos jeux directement depuis l'application.
*   **Social & Communauté** :
    *   **Système d'amis** : Ajoutez des amis, voyez leur statut en ligne/en jeu.
    *   **Chat en temps réel** : Discutez avec vos amis via une messagerie instantanée réactive.
    *   **Lobbies** : Créez des salons pour jouer ensemble ou discuter.
    *   **Notifications** : Soyez alerté en direct des demandes d'amis, des invitations et des transactions.
*   **Économie** : Gestion de portefeuille multi-devises (CHF, EUR, etc.) et transactions sécurisées.
*   **Architecture** : Système robuste basé sur des micro-services (Backend API, Serveur WebSocket dédié) utilisant MongoDB et Redis pour la performance.

---

## 2. Mise en place de l'application

Ce projet utilise **Docker** pour simplifier l'installation et garantir un environnement de développement cohérent.

### Prérequis
*   [Docker Desktop](https://www.docker.com/products/docker-desktop/) installé et lancé.
*   Git pour cloner le projet.

### Installation

1.  **Configuration de l'environnement**
    Assurez-vous d'avoir un fichier `.env` à la racine du projet contenant toutes les variables nécessaires (Ports, URIs Base de données, Clés API Cloudinary, Secrets JWT, etc.).
    *Si un fichier `env.example` est fourni, vous pouvez le copier en `.env` et le remplir.*

2.  **Lancement de l'Infrastructure & Backend**
    Démarrez les services (Base de données, Redis, WebSocket) et l'API Backend :
    ```bash
    docker-compose -f docker-compose.infra.yml up -d
    docker-compose -f docker-compose.app.yml up -d --build
    ```

3.  **Génération du Token Service (Si Problème)**
    Pour que le backend puisse se connecter au serveur WebSocket central, un token d'authentification est requis.
    *   Assurez-vous que les conteneurs sont lancés (étape 2).
    *   Générez le token via Docker (pas besoin d'installer Node.js localement) :
        ```bash
        docker-compose -f docker-compose.app.yml exec backend node src/scripts/generate-service-token.js
        ```
        *Note : Si le fichier n'est pas trouvé, vérifiez le chemin ou utilisez : `docker-compose -f docker-compose.app.yml exec backend node /app/src/scripts/generate-service-token.js` selon votre Dockerfile.*
        
        **Alternative (si le backend ne tourne pas encore)** :
        ```bash
        docker-compose -f docker-compose.app.yml run --rm backend node src/scripts/generate-service-token.js
        ```
    *   Copiez le token généré.
    *   Ajoutez-le dans votre fichier `.env` :
        ```env
        WS_CENTRAL_TOKEN=votre_token_ici
        ```
    *   Redémarrez le backend : `docker-compose -f docker-compose.app.yml restart backend`

3.  **Application Desktop (Frontend)**
    Le frontend est une application Electron (Desktop).
    *   **Développement local** :
        ```bash
        cd frontend
        npm install
        npm run electron:dev
        ```
    *   **Production (Build)** :
        Le projet est configuré avec **GitHub Actions** pour générer automatiquement l'exécutable Windows (`.exe`) à chaque push sur la branche principale.
        Vous pouvez récupérer l'installateur dans les "Artifacts" de l'action GitHub.

### Accès

Une fois les conteneurs démarrés :

*   **Backend (API)** : [http://localhost:3001](http://localhost:3001)
*   **Serveur WebSocket** : [http://localhost:3002](http://localhost:3002)

### Commandes Utiles

*   **Arrêter tous les services** :
    ```bash
    docker-compose -f docker-compose.app.yml down
    docker-compose -f docker-compose.infra.yml down
    ```
*   **Voir les logs** :
    ```bash
    docker logs -f ether_backend  # Pour le backend
    docker logs -f ether_frontend # Pour le frontend
    docker logs -f ether_server   # Pour le serveur WebSocket
    ```
