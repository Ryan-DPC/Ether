// ================================
// SMOOTH SCROLL
// ================================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// ================================
// NAVBAR SCROLL EFFECT
// ================================
const navbar = document.querySelector('.navbar');
let lastScroll = 0;

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;

    // Add shadow on scroll
    if (currentScroll > 50) {
        navbar.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.5)';
    } else {
        navbar.style.boxShadow = 'none';
    }

    // Hide/show navbar on scroll
    if (currentScroll > lastScroll && currentScroll > 100) {
        navbar.style.transform = 'translateY(-100%)';
    } else {
        navbar.style.transform = 'translateY(0)';
    }

    lastScroll = currentScroll;
});

// ================================
// INTERSECTION OBSERVER FOR ANIMATIONS
// ================================
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe all feature cards
document.querySelectorAll('.feature-card').forEach((card, index) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(50px)';
    card.style.transition = `all 0.6s ease ${index * 0.1}s`;
    observer.observe(card);
});

// Observe showcase sections
document.querySelectorAll('.showcase-content, .showcase-image').forEach(element => {
    element.style.opacity = '0';
    element.style.transform = 'translateY(30px)';
    element.style.transition = 'all 0.8s ease';
    observer.observe(element);
});

// ================================
// PARALLAX EFFECT ON SCROLL
// ================================
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const parallaxElements = document.querySelectorAll('.gradient-orb');

    parallaxElements.forEach((el, index) => {
        const speed = 0.5 + (index * 0.1);
        el.style.transform = `translateY(${scrolled * speed}px)`;
    });
});

// ================================
// BUTTON RIPPLE EFFECT
// ================================
document.querySelectorAll('.btn-primary, .btn-secondary').forEach(button => {
    button.addEventListener('click', function (e) {
        const rect = this.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const ripple = document.createElement('span');
        ripple.style.cssText = `
            position: absolute;
            width: 0;
            height: 0;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.5);
            transform: translate(-50%, -50%);
            pointer-events: none;
            animation: ripple 0.6s ease-out;
        `;
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';

        this.style.position = 'relative';
        this.style.overflow = 'hidden';
        this.appendChild(ripple);

        setTimeout(() => ripple.remove(), 600);
    });
});

// Add ripple animation
const style = document.createElement('style');
style.textContent = `
    @keyframes ripple {
        to {
            width: 300px;
            height: 300px;
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// ================================
// CURSOR GLOW EFFECT
// ================================
const cursorGlow = document.createElement('div');
cursorGlow.style.cssText = `
    position: fixed;
    width: 400px;
    height: 400px;
    background: radial-gradient(circle, rgba(0, 245, 255, 0.15) 0%, transparent 70%);
    pointer-events: none;
    z-index: 9999;
    transform: translate(-50%, -50%);
    transition: opacity 0.3s ease;
    opacity: 0;
`;
document.body.appendChild(cursorGlow);

document.addEventListener('mousemove', (e) => {
    cursorGlow.style.left = e.clientX + 'px';
    cursorGlow.style.top = e.clientY + 'px';
    cursorGlow.style.opacity = '1';
});

document.addEventListener('mouseleave', () => {
    cursorGlow.style.opacity = '0';
});

// ================================
// STATS COUNTER ANIMATION
// ================================
const animateCounter = (element, target) => {
    const duration = 2000;
    const start = 0;
    const increment = target / (duration / 16);
    let current = start;

    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            element.textContent = target;
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(current);
        }
    }, 16);
};

const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const numbers = entry.target.querySelectorAll('.stat-number');
            numbers.forEach(num => {
                const text = num.textContent;
                const value = parseInt(text.replace(/[^0-9]/g, ''));
                const suffix = text.replace(/[0-9]/g, '');

                if (value) {
                    let current = 0;
                    const increment = value / 50;
                    const timer = setInterval(() => {
                        current += increment;
                        if (current >= value) {
                            num.textContent = value + suffix;
                            clearInterval(timer);
                        } else {
                            num.textContent = Math.floor(current) + suffix;
                        }
                    }, 30);
                }
            });
            statsObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.5 });

const heroStats = document.querySelector('.hero-stats');
if (heroStats) {
    statsObserver.observe(heroStats);
}

// ================================
// TILT EFFECT ON CARDS
// ================================
document.querySelectorAll('.feature-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = (y - centerY) / 10;
        const rotateY = (centerX - x) / 10;

        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px)`;
    });

    card.addEventListener('mouseleave', () => {
        card.style.transform = '';
    });
});

// ================================
// DOWNLOAD BUTTON INTERACTION
// ================================
const downloadButtons = document.querySelectorAll('.btn-primary');
downloadButtons.forEach(btn => {
    if (btn.textContent.includes('Télécharger')) {
        btn.addEventListener('click', () => {
            // Show download notification
            showNotification('Téléchargement prêt !', 'Le setup.exe sera bientôt disponible.');
        });
    }
});

function showNotification(title, message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: rgba(15, 23, 42, 0.95);
        border: 1px solid rgba(0, 245, 255, 0.5);
        border-radius: 12px;
        padding: 20px;
        max-width: 300px;
        backdrop-filter: blur(10px);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;

    notification.innerHTML = `
        <div style="display: flex; align-items: start; gap: 12px;">
            <div style="flex-shrink: 0; width: 24px; height: 24px; background: linear-gradient(135deg, #00f5ff 0%, #9d00ff 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 7L6 10L11 4" stroke="#0a0e27" stroke-width="2" stroke-linecap="round"/>
                </svg>
            </div>
            <div>
                <div style="font-weight: 600; color: white; margin-bottom: 4px;">${title}</div>
                <div style="font-size: 0.875rem; color: #94a3b8;">${message}</div>
            </div>
        </div>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add notification animations
const notifStyle = document.createElement('style');
notifStyle.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(notifStyle);

// ================================
// LOADING ANIMATION
// ================================
window.addEventListener('load', () => {
    document.body.style.opacity = '0';
    setTimeout(() => {
        document.body.style.transition = 'opacity 0.5s ease';
        document.body.style.opacity = '1';
    }, 100);
});

// ================================
// CONSOLE EASTER EGG
// ================================
console.log(
    '%cEther Gaming Platform',
    'font-size: 24px; font-weight: bold; background: linear-gradient(135deg, #00f5ff 0%, #9d00ff 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;'
);
console.log(
    '%cLooking for something? 👀\nJoin our dev team: contact@ether.gg',
    'font-size: 14px; color: #00f5ff;'
);

console.log('%c🎮 Built with ❤️ by the Ether team', 'color: #9d00ff; font-size: 12px;');
