# 🎮 Stick Fighting Arena

Un jeu de combat pixel art rapide avec support multijoueur local et en ligne, intégré au magasin de jeux Ether!

## 🎯 Fonctionnalités

- **Style Pixel Art**: Graphiques rétro minimalistes avec effets modernes
- **Armes Multiples**: Épée (mêlée), Arc, et Pistolet
- **Power-ups**: Boost de vitesse, Boule de feu, et Bouclier
- **Deux Modes de Jeu**:
  - 🎮 Local 1v1 (même clavier)
  - 🌐 En ligne 1v1 (via serveur Ether)
- **Maps Simples**: Plateformes et arènes pour combat stratégique
- **Gameplay Fluide**: Contrôles réactifs et effets de particules

## 🕹️ Contrôles

### Joueur 1
- **Mouvement**: W, A, S, D
- **Attaque Mêlée**: ESPACE
- **Tirer**: SHIFT
- **Changer d'Arme**: Q

### Joueur 2
- **Mouvement**: Flèches Directionnelles
- **Attaque Mêlée**: ENTRÉE
- **Tirer**: SHIFT Droite
- **Changer d'Arme**: /

## 🚀 Démarrage

### Jeu Local (Aucune Installation Requise)
Ouvrez simplement le serveur Ether backend et accédez au jeu!

### Configuration Multijoueur en Ligne

Le jeu est intégré au serveur Ether backend. Pour jouer en ligne:

1. **Démarrer le serveur backend Ether**:
```bash
cd backend
npm start
```

2. **Accéder au jeu**:
Naviguez vers `http://localhost:5000` et ouvrez Stick Arena

3. **Jouer**:
- Choisissez "ONLINE MATCH" pour le matchmaking automatique
- Ou "LOCAL 1v1" pour le multijoueur local

## 🎮 Comment Jouer

1. Choisissez **LOCAL 1v1** pour le multijoueur même-clavier
2. Ou choisissez **ONLINE MATCH** pour le matchmaking en ligne
3. Utilisez vos contrôles pour bouger et attaquer
4. Collectez les power-ups pour obtenir des avantages
5. Le premier à vaincre l'adversaire gagne le round!

## 💎 Power-ups

- ⚡ **Jaune (Vitesse)**: Bouge plus vite pendant un temps limité
- 🔥 **Rouge (Boule de feu)**: Inflige le double de dégâts en mêlée
- 🛡️ **Bleu (Bouclier)**: Prend 50% de dégâts en moins

## 🏗️ Architecture Technique

### Intégration Backend

Le jeu est intégré dans l'architecture feature-based d'Ether:

```
backend/src/features/stick-arena/
├── stick-arena.routes.js   # Routes Express pour servir le jeu
└── stick-arena.socket.js   # Socket.io handlers pour le multijoueur
```

### Socket.io Events

**Client → Server:**
- `stick-arena:join` - Rejoindre l'arène
- `stick-arena:findMatch` - Lancer le matchmaking
- `stick-arena:playerUpdate` - Synchroniser l'état du joueur
- `stick-arena:shoot` - Tirer un projectile
- `stick-arena:melee` - Attaque mêlée
- `stick-arena:playerDamaged` - Événement de dégâts
- `stick-arena:roundEnd` - Fin de round

**Server → Client:**
- `stick-arena:joined` - Confirmation de connexion
- `stick-arena:waiting` - En attente d'adversaire
- `stick-arena:matchFound` - Match trouvé
- `stick-arena:gameState` - État du jeu synchronisé
- `stick-arena:projectileCreated` - Nouveau projectile
- `stick-arena:playerMelee` - Attaque mêlée de l'adversaire
- `stick-arena:opponentDisconnected` - Déconnexion de l'adversaire

## 🛠️ Stack Technique

- **Frontend**: JavaScript Vanilla, HTML5 Canvas, CSS3
- **Backend**: Node.js intégré au serveur Ether
- **Temps Réel**: Socket.io
- **Style**: CSS3 avec gradients et animations

## 📝 Améliorations Futures

- [ ] Authentification via système Ether
- [ ] Classement et statistiques
- [ ] Plus d'armes et power-ups
- [ ] Maps additionnelles
- [ ] Effets sonores et musique
- [ ] Mode tournoi
- [ ] Adversaires IA

## 🎨 Design

Le jeu présente une esthétique pixel art inspirée du cyberpunk avec:
- Effets néon lumineux
- Arrière-plans en dégradé fluides
- Systèmes de particules pour les impacts
- Animations dynamiques

## 🔗 Intégration Ether

Ce jeu fait partie de l'écosystème Ether et peut être étendu pour:
- Utiliser l'authentification Ether pour les matchs en ligne
- Sauvegarder les statistiques dans la base de données Ether
- S'intégrer avec le système d'amis pour inviter des joueurs
- Utiliser Docker pour le déploiement

Profitez du combat! ⚔️
