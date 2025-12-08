# Ether Website

Site web officiel pour télécharger et découvrir la plateforme Ether.

## 🎨 Design

Le site utilise un design moderne et cyberpunk avec :

- **Glassmorphism** : Effets de verre flou sur les cartes
- **Gradients dynamiques** : Couleurs vibrantes (#00f5ff → #9d00ff)
- **Animations fluides** : Parallax, tilt cards, particles
- **Responsive** : Compatible mobile, tablette et desktop

## 📁 Structure

```
web/
├── index.html      # Page principale
├── styles.css      # Styles CSS complets
├── script.js       # Animations JavaScript
└── README.md       # Ce fichier
```

## 🚀 Lancement Local

1. Ouvrir simplement `index.html` dans un navigateur
2. Ou utiliser un serveur local :

```bash
# Python
python -m http.server 8000

# Node.js
npx serve

# VS Code
# Installer "Live Server" extension et cliquer "Go Live"
```

Puis visiter : `http://localhost:8000`

## ✨ Fonctionnalités

### Sections
- **Hero** : Section d'accueil avec call-to-action principal
- **Features** : Grille de 6 fonctionnalités clés
- **Showcase** : Présentation de l'interface
- **Download** : Appel à l'action téléchargement
- **Footer** : Liens et informations

### Interactions
- Smooth scroll au clic sur ancres
- Navbar animée au scroll
- Cards avec effet tilt 3D
- Boutons avec effet ripple
- Compteurs animés (stats)
- Cursor glow effect
- Parallax sur orbes gradient

## 🎨 Palette de Couleurs

```css
--primary: #00f5ff      /* Cyan électrique */
--secondary: #9d00ff    /* Violet néon */
--accent: #ff006e       /* Rose vif */
--bg-dark: #0a0e27      /* Bleu très sombre */
--bg-darker: #050816    /* Quasi noir */
```

## 📝 TODO (Implémentation Future)

- [ ] Connecter le bouton download à l'API backend
- [ ] Ajouter détection OS automatique (Windows/macOS/Linux)
- [ ] Intégrer analytics (Google Analytics/Plausible)
- [ ] Ajouter page FAQ
- [ ] Ajouter page Changelog
- [ ] Form de newsletter
- [ ] Intégration Discord widget
- [ ] Screenshots réels de l'app
- [ ] Vidéo démo autoplay
- [ ] Dark/Light mode toggle (optionnel)

## 🛠️ Technologies

- **HTML5** : Structure sémantique
- **CSS3** : Animations, gradients, glassmorphism
- **JavaScript (Vanilla)** : Interactions sans framework
- **Google Fonts** :
  - Inter (texte)
  - Orbitron (titres)

## 📱 Responsive Breakpoints

- Desktop : > 968px
- Tablet : 640px - 968px
- Mobile : < 640px

## 🌐 Déploiement

### GitHub Pages
```bash
# Push le dossier web/
git add web/
git commit -m "Add Ether website"
git push

# Activer GitHub Pages dans Settings → Pages
# Source: main branch, /web folder
```

### Netlify / Vercel
```bash
# Drag & drop le dossier web/
# Ou connecter le repo GitHub
```

### Custom Domain
Configuration DNS :
```
A     @       192.0.2.1
CNAME www     username.github.io
```

## 📄 License

MIT License - Ether Team © 2025
