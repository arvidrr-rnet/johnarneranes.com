/**
 * JOHN ARNE RÅNES - Main JavaScript
 * Site-wide functionality and utilities
 * 
 * VEDLIKEHOLDSGUIDE:
 * - Scroll-animasjoner håndteres automatisk via .reveal klassen
 * - Mobil-navigasjon toggle er automatisk
 */

// Wait for DOM
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initScrollAnimations();
    initEmailProtection();
    initSmoothScroll();
});

/**
 * Mobile Navigation Toggle
 */
function initNavigation() {
    const toggle = document.querySelector('.nav__toggle');
    const navLinks = document.querySelector('.nav__links');
    
    if (toggle && navLinks) {
        toggle.addEventListener('click', () => {
            const isOpen = navLinks.classList.toggle('nav__links--open');
            toggle.setAttribute('aria-expanded', isOpen);
            toggle.innerHTML = isOpen ? '✕' : '☰';
            
            // Prevent body scroll when menu is open
            document.body.style.overflow = isOpen ? 'hidden' : '';
        });
        
        // Close menu when clicking a link
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('nav__links--open');
                toggle.setAttribute('aria-expanded', 'false');
                toggle.innerHTML = '☰';
                document.body.style.overflow = '';
            });
        });
        
        // Close menu on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && navLinks.classList.contains('nav__links--open')) {
                navLinks.classList.remove('nav__links--open');
                toggle.setAttribute('aria-expanded', 'false');
                toggle.innerHTML = '☰';
                document.body.style.overflow = '';
            }
        });
    }
}

/**
 * Scroll Reveal Animations
 * Elementer med klassen .reveal animeres inn når de blir synlige
 */
function initScrollAnimations() {
    const observerOptions = {
        root: null,
        rootMargin: '0px 0px -50px 0px',
        threshold: 0.1
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('reveal--visible');
                observer.unobserve(entry.target); // Bare animer én gang
            }
        });
    }, observerOptions);
    
    // Observer alle elementer med .reveal klassen
    document.querySelectorAll('.reveal:not(.reveal--observed)').forEach(el => {
        el.classList.add('reveal--observed');
        observer.observe(el);
    });

    // Gjør tilgjengelig globalt slik at dynamisk innhold kan trigge observering
    window.observeRevealElements = function () {
        document.querySelectorAll('.reveal:not(.reveal--observed)').forEach(el => {
            el.classList.add('reveal--observed');
            observer.observe(el);
        });
    };
}

/**
 * Email Protection
 * Beskytter e-postadresser mot spam-bots
 */
function initEmailProtection() {
    const emailLinks = document.querySelectorAll('[data-email]');
    
    emailLinks.forEach(link => {
        const user = link.dataset.emailUser;
        const domain = link.dataset.emailDomain;
        
        if (user && domain) {
            const email = `${user}@${domain}`;
            
            link.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Vis e-postadressen
                if (link.querySelector('.email-reveal')) {
                    window.location.href = `mailto:${email}`;
                } else {
                    link.innerHTML = `<span class="email-reveal">${email}</span>`;
                    link.href = `mailto:${email}`;
                }
            });
            
            // Legg til kopierings-funksjon
            link.addEventListener('contextmenu', (e) => {
                navigator.clipboard.writeText(email).then(() => {
                    showToast('E-postadresse kopiert!');
                });
            });
        }
    });
}

/**
 * Smooth Scroll for anchor links
 */
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            
            if (href === '#' || href === '#top') {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }
            
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                const headerHeight = document.querySelector('.site-header')?.offsetHeight || 0;
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - headerHeight - 20;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
                
                // Update URL without jumping
                history.pushState(null, null, href);
            }
        });
    });
}

/**
 * Toast Notification
 */
function showToast(message, duration = 3000) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--color-accent-primary, #c9a962);
        color: var(--color-bg-primary, #0a0a0a);
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 14px;
        z-index: 9999;
        animation: toastIn 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'toastOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// Toast animations
const style = document.createElement('style');
style.textContent = `
    @keyframes toastIn {
        from { opacity: 0; transform: translate(-50%, 20px); }
        to { opacity: 1; transform: translate(-50%, 0); }
    }
    @keyframes toastOut {
        from { opacity: 1; transform: translate(-50%, 0); }
        to { opacity: 0; transform: translate(-50%, -20px); }
    }
`;
document.head.appendChild(style);

/**
 * Lazy Loading Images
 * Automatisk for bilder med data-src attributt
 */
function initLazyLoading() {
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    imageObserver.unobserve(img);
                }
            });
        });
        
        document.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
    } else {
        // Fallback for eldre nettlesere
        document.querySelectorAll('img[data-src]').forEach(img => {
            img.src = img.dataset.src;
        });
    }
}

// Initialize lazy loading
document.addEventListener('DOMContentLoaded', initLazyLoading);
