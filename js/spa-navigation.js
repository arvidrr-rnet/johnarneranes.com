/**
 * SPA Navigation — Sømløse sideoverganger
 * Fanger opp interne lenker og laster sider via fetch,
 * slik at lydspilleren overlever sidenavigasjon.
 */

class SpaRouter {
    constructor() {
        this.isNavigating = false;
        this.init();
    }

    init() {
        // Fang opp lenkeklikk
        document.addEventListener('click', (e) => this.handleClick(e));

        // Håndter tilbake/frem i nettleser
        window.addEventListener('popstate', (e) => this.handlePopState(e));

        // Lagre initial state
        history.replaceState(
            { spaPath: location.pathname + location.hash },
            '',
            location.href
        );

        // Sett riktig tilbake-knapp ved oppstart
        this.updateBackButton(this.getCurrentPage());
    }

    handleClick(e) {
        const link = e.target.closest('a');
        if (!link) return;

        const href = link.getAttribute('href');
        if (!href) return;

        // Hopp over modifiserte klikk (ny fane osv.)
        if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
        if (e.button !== 0) return;

        // Hopp over lenker med target
        if (link.target && link.target !== '_self') return;

        // Håndter bare interne .html-lenker
        if (this.isInternalLink(href)) {
            e.preventDefault();
            this.navigate(href);
        }
    }

    handlePopState(e) {
        if (e.state?.spaPath) {
            const hashIndex = e.state.spaPath.indexOf('#');
            const path = hashIndex >= 0 ? e.state.spaPath.substring(0, hashIndex) : e.state.spaPath;
            const hash = hashIndex >= 0 ? e.state.spaPath.substring(hashIndex + 1) : '';
            const page = path.split('/').pop() || 'index.html';
            this.loadPage(page, false, hash);
        }
    }

    isInternalLink(href) {
        // Bare hash-lenker: la normal ankernavigasjon fungere
        if (href.startsWith('#')) return false;

        // Hopp over javascript:, mailto:, tel:
        if (href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) {
            return false;
        }

        // Eksterne lenker
        if (href.startsWith('http')) {
            try {
                const url = new URL(href, location.origin);
                if (url.origin !== location.origin) return false;
                return url.pathname.endsWith('.html') || url.pathname.endsWith('/');
            } catch {
                return false;
            }
        }

        // Relative .html-lenker (f.eks. solo.html, index.html#projects)
        if (href.endsWith('.html') || href.includes('.html#')) return true;

        return false;
    }

    async navigate(href) {
        if (this.isNavigating) return;

        const hashIndex = href.indexOf('#');
        const path = hashIndex >= 0 ? href.substring(0, hashIndex) : href;
        const hash = hashIndex >= 0 ? href.substring(hashIndex + 1) : '';
        const fullPath = path || 'index.html';

        // Hvis vi navigerer til samme side med bare en hash, bare scroll
        if (this.isSamePage(fullPath)) {
            if (hash) {
                this.scrollToHash(hash);
                history.pushState(
                    { spaPath: fullPath + '#' + hash },
                    '',
                    fullPath + '#' + hash
                );
            }
            return;
        }

        await this.loadPage(fullPath, true, hash);
    }

    isSamePage(path) {
        return this.getCurrentPage() === this.normalizePath(path);
    }

    getCurrentPage() {
        const page = location.pathname.split('/').pop();
        return page === '' ? 'index.html' : page;
    }

    normalizePath(path) {
        const page = path.split('/').pop();
        return page === '' ? 'index.html' : page;
    }

    async loadPage(path, pushState = true, hash = '') {
        if (this.isNavigating) return;
        this.isNavigating = true;

        try {
            // Lukk mobilmeny hvis den er åpen
            const navLinks = document.querySelector('.nav__links');
            const toggle = document.querySelector('.nav__toggle');
            if (navLinks?.classList.contains('nav__links--open')) {
                navLinks.classList.remove('nav__links--open');
                if (toggle) {
                    toggle.setAttribute('aria-expanded', 'false');
                    toggle.innerHTML = '☰';
                }
                document.body.style.overflow = '';
            }

            const response = await fetch(path);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            const newContent = doc.getElementById('spa-content');
            const currentContent = document.getElementById('spa-content');

            if (!newContent || !currentContent) {
                // Fallback: full sidenavigasjon
                location.href = path + (hash ? '#' + hash : '');
                return;
            }

            // Fade ut
            currentContent.classList.add('spa-content--leaving');
            await new Promise(r => setTimeout(r, 150));

            // Bytt innhold
            currentContent.innerHTML = newContent.innerHTML;

            // Fade inn
            currentContent.classList.remove('spa-content--leaving');
            currentContent.classList.add('spa-content--entering');

            // Fjern entering-klassen etter animasjon
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    currentContent.classList.remove('spa-content--entering');
                });
            });

            // Oppdater dokumenttittel
            document.title = doc.title;

            // Oppdater tilbake-knapp
            this.updateBackButton(this.normalizePath(path));

            // Oppdater URL
            const url = path + (hash ? '#' + hash : '');
            if (pushState) {
                history.pushState({ spaPath: url }, '', url);
            }

            // Scroll
            if (hash) {
                setTimeout(() => this.scrollToHash(hash), 100);
            } else {
                window.scrollTo({ top: 0, behavior: 'instant' });
            }

            // Re-initialiser sidespesifikk JS
            this.reinitPage(path);

        } catch (err) {
            console.error('SPA-navigasjon feilet:', err);
            location.href = path + (hash ? '#' + hash : '');
        } finally {
            this.isNavigating = false;
        }
    }

    updateBackButton(page) {
        const backNav = document.querySelector('.nav-back');
        if (!backNav) return;

        if (page === 'index.html') {
            backNav.style.display = 'none';
        } else {
            backNav.style.display = '';
            const backLink = backNav.querySelector('.nav-back__link');
            if (backLink) {
                if (page === 'timeline.html') {
                    backLink.href = 'index.html';
                    backLink.textContent = '← Tilbake til forsiden';
                } else {
                    backLink.href = 'index.html#projects';
                    backLink.textContent = '← Tilbake til prosjekter';
                }
            }
        }
    }

    scrollToHash(hash) {
        const target = document.getElementById(hash);
        if (target) {
            const headerHeight = document.querySelector('.site-header')?.offsetHeight || 0;
            const top = target.getBoundingClientRect().top + window.pageYOffset - headerHeight - 20;
            window.scrollTo({ top, behavior: 'smooth' });
        }
    }

    reinitPage() {
        // Re-observer reveal-elementer for scroll-animasjoner
        if (typeof window.observeRevealElements === 'function') {
            window.observeRevealElements();
        }

        // Re-bind sporangivelser for lydspiller
        if (window.audioPlayer) {
            window.audioPlayer.bindTrackElements();
            window.audioPlayer.updateAllTrackHighlighting();
        }

        // Re-init smooth scroll for nytt innhold
        if (typeof initSmoothScroll === 'function') {
            initSmoothScroll();
        }

        // Re-init e-postbeskyttelse for nytt innhold
        if (typeof initEmailProtection === 'function') {
            initEmailProtection();
        }

        // Re-init nyheter/tidslinje om nødvendig
        if (typeof window.reinitNews === 'function') {
            window.reinitNews();
        }
    }
}

// Initialiser SPA-ruter når DOM er klar
document.addEventListener('DOMContentLoaded', () => {
    window.spaRouter = new SpaRouter();
});
