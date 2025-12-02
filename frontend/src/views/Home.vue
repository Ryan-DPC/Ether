<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useGameStore } from '../stores/gameStore'
import { useRouter } from 'vue-router'
import defaultGameImg from '@/assets/images/default-game.png'
import heroBg from '@/assets/images/hero-bg.jpg'

const router = useRouter()
const gameStore = useGameStore()
const searchQuery = ref('')
const activeCategory = ref('trending')

// Carousel State
const currentSlide = ref(0)
const slides = [
  {
    id: 1,
    title: 'ETHER CHESS:\nSTRATEGY EVOLVED',
    desc: 'Master the board in this futuristic take on the classic game. Ranked matches available now.',
    image: heroBg,
    badge: 'FEATURED'
  },
  {
    id: 2,
    title: 'CYBER LEGENDS:\nARENA',
    desc: 'Join the ultimate battle for supremacy in the neon-soaked arena.',
    image: defaultGameImg, // Placeholder, ideally different
    badge: 'NEW SEASON'
  },
  {
    id: 3,
    title: 'NEON RACER:\nOVERDRIVE',
    desc: 'High-speed racing through the digital cityscape. Customize your ride.',
    image: defaultGameImg, // Placeholder
    badge: 'EARLY ACCESS'
  }
]

let slideInterval: any = null

const nextSlide = () => {
  currentSlide.value = (currentSlide.value + 1) % slides.length
}

const goToGameDetails = (gameId: string) => {
  router.push({ name: 'game-details', params: { id: gameId } })
}

const prevSlide = () => {
  currentSlide.value = (currentSlide.value - 1 + slides.length) % slides.length
}

const setSlide = (index: number) => {
  currentSlide.value = index
}

onMounted(async () => {
  await gameStore.fetchHomeData()
  slideInterval = setInterval(nextSlide, 5000)
})

onUnmounted(() => {
  if (slideInterval) clearInterval(slideInterval)
})

const categories = [
  { id: 'trending', name: 'Trending', icon: 'fas fa-fire' },
  { id: 'new', name: 'New Releases', icon: 'fas fa-rocket' },
  { id: 'top', name: 'Top Rated', icon: 'fas fa-star' },
  { id: 'rpg', name: 'RPG', icon: 'fas fa-dungeon' },
  { id: 'strategy', name: 'Strategy', icon: 'fas fa-chess' }
]
</script>

<template>
  <div class="home-container">
    <!-- Ambient Background -->
    <div class="bg-glow pink-glow"></div>
    <div class="bg-glow cyan-glow"></div>

    <div class="scroll-content">
      
      <!-- Centered Content Wrapper -->
      <div class="centered-wrapper">
        <!-- Hero Carousel Section -->
        <section class="hero-section">
          <div class="carousel-container">
            <div class="carousel-track" :style="{ transform: `translateX(-${currentSlide * 100}%)` }">
              <div v-for="slide in slides" :key="slide.id" class="hero-card">
                <div class="hero-bg" :style="{ backgroundImage: `url(${slide.image})` }"></div>
                <div class="hero-overlay"></div>
                <div class="hero-content">
                  <div class="hero-text">
                    <div class="badge">{{ slide.badge }}</div>
                    <h1>{{ slide.title }}</h1>
                    <p>{{ slide.desc }}</p>
                    <div class="hero-actions">
                      <button class="btn-neon btn-play">PLAY NOW</button>
                      <button class="btn-glass">WATCH TRAILER</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Carousel Controls -->
            <button class="carousel-nav prev" @click="prevSlide"><i class="fas fa-chevron-left"></i></button>
            <button class="carousel-nav next" @click="nextSlide"><i class="fas fa-chevron-right"></i></button>
            
          </div>
          
          <div class="carousel-dots">
            <button 
              v-for="(slide, index) in slides" 
              :key="slide.id" 
              class="dot" 
              :class="{ active: currentSlide === index }"
              @click="setSlide(index)"
            ></button>
          </div>
        </section>

        <!-- Discover Section -->
        <section class="discover-section">
          <div class="section-header">
            <h2>DISCOVER</h2>
          </div>

          <!-- Search & Filter -->
          <div class="filter-bar">
            <div class="search-wrapper">
              <i class="fas fa-search search-icon"></i>
              <input v-model="searchQuery" type="text" placeholder="Search games..." class="search-input">
            </div>
            
            <div class="categories-row">
              <button 
                v-for="cat in categories" 
                :key="cat.id"
                class="cat-pill"
                :class="{ active: activeCategory === cat.id }"
                @click="activeCategory = cat.id"
              >
                <i :class="cat.icon"></i> {{ cat.name }}
              </button>
            </div>
          </div>
        </section>
      </div>
      <!-- End Centered Wrapper -->

      <!-- Featured Games Grid (Full Width / Separate) -->
      <section class="games-grid-section">
        <div class="section-title">
          <i class="fas fa-gamepad"></i> FEATURED GAMES
        </div>
        
        <div class="games-grid">
          <div v-for="game in gameStore.featuredGames" :key="game._id" class="game-card-neon">
            <div class="card-image">
              <img :src="game.image_url || defaultGameImg" alt="Game">
              <div class="card-overlay">
                <button class="btn-view" @click="goToGameDetails(game.id)">VIEW DETAILS</button>
              </div>
            </div>
            <div class="card-info">
              <h3>{{ game.game_name }}</h3>
              <div class="card-meta">
                <span class="genre">{{ game.genre || 'Action' }}</span>
                <span class="price" v-if="game.price > 0">{{ game.price }} CHF</span>
                <span class="price free" v-else>FREE</span>
              </div>
            </div>
          </div>
          
          <!-- Fallback if no games -->
          <template v-if="gameStore.featuredGames.length === 0">
             <div class="game-card-neon" v-for="i in 4" :key="i">
                <div class="card-image">
                    <img :src="defaultGameImg" class="placeholder-img">
                    <div class="card-overlay"><button class="btn-view">VIEW DETAILS</button></div>
                </div>
                <div class="card-info">
                    <h3>Ether Game {{ i }}</h3>
                    <div class="card-meta"><span class="genre">Indie</span> <span class="price free">FREE</span></div>
                </div>
             </div>
          </template>
        </div>
      </section>

    </div>
  </div>
</template>

<style scoped>
/* Variables */
:root {
  --neon-pink: #ff7eb3;
  --neon-cyan: #7afcff;
  --glass-bg: rgba(30, 25, 40, 0.6);
  --text-main: #ffffff;
  --text-dim: #b0b9c3;
}

.home-container {
  height: 100%;
  width: 100%;
  position: relative;
  overflow: hidden;
  background-color: transparent; /* Use global background */
  color: white;
}

/* Local glows removed in favor of global MainLayout glows */

.scroll-content {
  height: 100%;
  overflow-y: auto;
  padding: 30px;
  position: relative;
  z-index: 1;
}
.scroll-content::-webkit-scrollbar { width: 6px; }
.scroll-content::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }

/* Centered Wrapper */
.centered-wrapper {
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

/* Hero Section & Carousel */
.hero-section { margin-bottom: 50px; }

.carousel-container {
  position: relative;
  height: 450px;
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 20px 50px rgba(0,0,0,0.5);
  border: 1px solid rgba(255,255,255,0.1);
}

.carousel-track {
  display: flex;
  height: 100%;
  transition: transform 0.5s ease-in-out;
}

.hero-card {
  min-width: 100%;
  position: relative;
  height: 100%;
}

.hero-bg {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  background-size: cover; background-position: center;
}

.hero-overlay {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  background: linear-gradient(90deg, rgba(18,12,24,0.95) 0%, rgba(18,12,24,0.6) 50%, transparent 100%);
}

.hero-content {
  position: relative; z-index: 2;
  height: 100%;
  display: flex;
  align-items: center;
  padding: 40px 60px; /* Reduced vertical padding */
}

.hero-text { max-width: 600px; }

.badge {
  background: linear-gradient(45deg, #ff7eb3, #ff758c);
  color: white;
  display: inline-block; padding: 6px 16px;
  border-radius: 20px; font-weight: 800; font-size: 0.8rem;
  margin-bottom: 16px; /* Reduced margin */
  letter-spacing: 1px;
  box-shadow: 0 4px 15px rgba(255, 118, 136, 0.4);
}

.hero-text h1 {
  font-size: 3rem; /* Reduced from 4rem */
  line-height: 1.1; 
  margin: 0 0 16px 0; /* Reduced margin */
  font-weight: 900;
  text-transform: uppercase;
  white-space: pre-line;
  background: linear-gradient(to right, #fff, #b0b9c3);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 0 20px rgba(255,255,255,0.1));
}

.hero-text p { 
  font-size: 1.1rem; 
  color: #b0b9c3; 
  margin-bottom: 30px; /* Reduced from 40px */
  line-height: 1.5; 
  max-width: 450px; 
}

.hero-actions { display: flex; gap: 16px; }

.btn-neon {
  background: #ff7eb3; color: white;
  border: none; padding: 16px 40px;
  border-radius: 12px; font-weight: 800;
  box-shadow: 0 0 20px rgba(255, 126, 179, 0.4);
  cursor: pointer; transition: all 0.3s;
  text-transform: uppercase; letter-spacing: 1px;
}
.btn-neon:hover { transform: translateY(-2px); box-shadow: 0 0 40px rgba(255, 126, 179, 0.6); }

.btn-glass {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.2);
  color: white; padding: 16px 40px;
  border-radius: 12px; font-weight: 700;
  cursor: pointer; transition: all 0.3s;
  backdrop-filter: blur(10px);
  text-transform: uppercase; letter-spacing: 1px;
}
.btn-glass:hover { background: rgba(255,255,255,0.15); border-color: white; }

/* Carousel Controls */
.carousel-nav {
  position: absolute; top: 50%; transform: translateY(-50%);
  background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1);
  color: white; width: 40px; height: 40px; border-radius: 50%;
  cursor: pointer; z-index: 10; display: flex; align-items: center; justify-content: center;
  transition: all 0.3s ease;
  opacity: 0;
  transform: translateY(-50%) scale(0.9);
}
.carousel-container:hover .carousel-nav {
  opacity: 1;
  transform: translateY(-50%) scale(1);
}
.carousel-nav:hover { background: #ff7eb3; border-color: #ff7eb3; transform: translateY(-50%) scale(1.1) !important; }
.carousel-nav.prev { left: 20px; }
.carousel-nav.next { right: 20px; }

.carousel-dots {
  display: flex; 
  gap: 10px; 
  justify-content: center;
  margin-top: 20px;
}
.dot {
  width: 10px; height: 10px; border-radius: 50%;
  background: rgba(255,255,255,0.3); border: none; cursor: pointer;
  transition: all 0.3s;
}
.dot.active { background: #ff7eb3; transform: scale(1.2); box-shadow: 0 0 10px #ff7eb3; }

/* Discover Section */
.discover-section { 
  margin-bottom: 40px; 
  display: flex;
  flex-direction: column;
  align-items: center; /* Center everything in this section */
  text-align: center;
}

.section-header { 
  margin-bottom: 24px; 
  width: 100%;
  display: flex;
  justify-content: center;
}
.section-header h2 {
  font-size: 1.5rem; letter-spacing: 2px; margin: 0;
  color: white; font-weight: 700;
}

.filter-bar {
  display: flex; 
  flex-direction: column; /* Stack search and filters */
  gap: 20px; 
  align-items: stretch; /* Stretch children to match width */
  width: fit-content; /* Width determined by content (filters) */
  max-width: 100%; /* Ensure it doesn't overflow on small screens */
  margin: 0 auto; /* Center the whole block */
}

.search-wrapper {
  position: relative;
  width: 100%; /* Match the width of the filters */
}

.search-input {
  width: 100%;
  padding: 14px 45px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  color: white; font-size: 1rem;
  transition: all 0.3s;
}
.search-input:focus {
  outline: none; border-color: #7afcff;
  background: rgba(255,255,255,0.1);
  box-shadow: 0 0 20px rgba(122, 252, 255, 0.1);
}

.search-icon { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: #b0b9c3; }

.categories-row { 
  display: flex; 
  gap: 10px; 
  flex-wrap: wrap; 
  justify-content: center; /* Center the pills */
}

.cat-pill {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  color: #b0b9c3;
  padding: 10px 20px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex; align-items: center; gap: 8px; font-weight: 600;
}

.cat-pill:hover, .cat-pill.active {
  background: rgba(122, 252, 255, 0.1);
  border-color: #7afcff;
  color: #7afcff;
  box-shadow: 0 0 15px rgba(122, 252, 255, 0.1);
}

/* Games Grid */
.games-grid-section { margin-bottom: 50px; }

.section-title { 
    font-size: 1.2rem; font-weight: 700;
    display: flex; align-items: center; gap: 10px; color: #b0b9c3;
    margin-bottom: 24px;
}

.games-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
  /* If user wants grid full width, we don't constrain it. 
     If they want it aligned with the rest but "except the grid" meant something else...
     I'll leave it unconstrained here, but maybe add padding if it touches edges too much.
     The parent .scroll-content has 30px padding.
  */
}

.game-card-neon {
  background: rgba(30, 25, 40, 0.6);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.3s;
  position: relative;
  display: flex; flex-direction: column;
}

.game-card-neon:hover {
  transform: translateY(-8px);
  border-color: rgba(255,255,255,0.2);
  box-shadow: 0 10px 30px rgba(0,0,0,0.3);
}

.card-image {
  height: 180px;
  position: relative;
  overflow: hidden;
}

.card-image img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s; }
.game-card-neon:hover .card-image img { transform: scale(1.1); }

.card-overlay {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(18,12,24,0.8);
  display: flex; align-items: center; justify-content: center;
  opacity: 0; transition: opacity 0.3s;
  backdrop-filter: blur(2px);
}
.game-card-neon:hover .card-overlay { opacity: 1; }

.btn-view {
  background: transparent;
  border: 1px solid #7afcff; color: #7afcff;
  padding: 10px 24px; border-radius: 30px;
  font-weight: 700; cursor: pointer;
  transition: all 0.3s;
}
.btn-view:hover { background: #7afcff; color: #120c18; box-shadow: 0 0 20px rgba(122, 252, 255, 0.4); }

.card-info { padding: 20px; flex: 1; display: flex; flex-direction: column; }
.card-info h3 { margin: 0 0 10px 0; font-size: 1.1rem; color: white; }

.card-meta { 
    display: flex; justify-content: space-between; align-items: center; 
    margin-top: auto; 
}
.genre { 
    font-size: 0.8rem; color: #b0b9c3; 
    background: rgba(255,255,255,0.05); padding: 4px 10px; border-radius: 6px;
}
.price { color: #7afcff; font-weight: 700; }
.price.free { color: #ff7eb3; }

</style>
