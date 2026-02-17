/**
 * news.js — Laster og viser nyheter/tidslinje fra data/news.json
 *
 * Brukes på:
 *   - index.html: Viser siste 3 nyheter i «Aktuelt»-seksjonen
 *   - Timeline.html: Viser alle oppføringer gruppert etter år
 */

(function () {
    'use strict';

    /**
     * Konstruerer korrekt sti til news.json basert på gjeldende side-URL.
     * Håndterer subdirectory-deployments (f.eks. GitHub Pages).
     */
    function getNewsJsonUrl() {
        // Bruk base-elementet hvis det finnes
        var base = document.querySelector('base[href]');
        if (base) {
            return new URL('data/news.json', base.href).href;
        }
        // Standard relativ sti — fungerer for de fleste tilfeller
        return 'data/news.json';
    }

    var NEWS_JSON_URL = getNewsJsonUrl();

    /**
     * Henter news.json og returnerer sortert array (nyeste først)
     */
    async function loadNews() {
        try {
            var response = await fetch(NEWS_JSON_URL);
            if (!response.ok) {
                throw new Error('HTTP ' + response.status + ' ' + response.statusText);
            }
            var news = await response.json();
            // Sorter nyeste først
            news.sort(function (a, b) {
                return new Date(b.date) - new Date(a.date);
            });
            return news;
        } catch (err) {
            console.error('[news.js] Kunne ikke laste nyheter fra ' + NEWS_JSON_URL + ':', err);
            return [];
        }
    }

    /**
     * Formaterer ISO-dato til norsk format (DD.MM.ÅÅÅÅ)
     */
    function formatDate(isoDate) {
        var d = new Date(isoDate);
        var day = String(d.getDate()).padStart(2, '0');
        var month = String(d.getMonth() + 1).padStart(2, '0');
        var year = d.getFullYear();
        return day + '.' + month + '.' + year;
    }

    /**
     * Hent bare årstallet fra en ISO-dato
     */
    function getYear(isoDate) {
        return new Date(isoDate).getFullYear();
    }

    // ─── Index-side: Nyheter ──────────────────────────────────

    /**
     * Bygg en nyhets-artikkel for forsiden
     */
    function createNewsItem(item) {
        var article = document.createElement('article');
        article.className = 'news-item reveal reveal--visible';

        var time = document.createElement('time');
        time.className = 'news-item__date';
        time.textContent = formatDate(item.date);
        article.appendChild(time);

        var content = document.createElement('div');
        content.className = 'news-item__content';

        var h3 = document.createElement('h3');
        h3.textContent = item.title;
        content.appendChild(h3);

        var p = document.createElement('p');
        p.textContent = item.description;
        content.appendChild(p);

        if (item.link) {
            var a = document.createElement('a');
            a.href = item.link;
            a.className = 'btn btn--ghost';
            a.textContent = item.linkText || 'Les mer →';
            if (item.link.startsWith('http')) {
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
            }
            content.appendChild(a);
        }

        article.appendChild(content);
        return article;
    }

    /**
     * Rendrer nyheter på forsiden (max 3, bare de med link = synlige nyheter)
     */
    async function renderIndexNews() {
        var container = document.querySelector('.news-list');
        if (!container) return;

        var news = await loadNews();
        // Vis bare oppføringer som har link (ekte nyheter, ikke bare tidslinje-milepæler)
        var visibleNews = news.filter(function (n) { return n.link; });
        var latest = visibleNews.slice(0, 3);

        if (latest.length === 0) {
            console.warn('[news.js] Ingen nyheter å vise (0 oppføringer med link)');
            return;
        }

        container.innerHTML = '';
        latest.forEach(function (item) {
            container.appendChild(createNewsItem(item));
        });

        // Re-trigger reveal-animasjoner for nye elementer
        if (typeof window.observeRevealElements === 'function') {
            window.observeRevealElements();
        }
    }

    // ─── Tidslinje-side ───────────────────────────────────────

    /**
     * Bygg et tidslinje-element
     */
    function createTimelineItem(item) {
        var div = document.createElement('div');
        div.className = 'timeline-item reveal reveal--visible';

        var yearDiv = document.createElement('div');
        yearDiv.className = 'timeline-year';
        yearDiv.textContent = getYear(item.date);
        div.appendChild(yearDiv);

        var h3 = document.createElement('h3');
        h3.className = 'timeline-title';
        h3.textContent = item.title;
        div.appendChild(h3);

        var p = document.createElement('p');
        p.className = 'timeline-description';
        p.textContent = item.description;
        div.appendChild(p);

        return div;
    }

    /**
     * Rendrer tidslinje gruppert etter år
     */
    async function renderTimeline() {
        var container = document.querySelector('.timeline');
        if (!container) return;

        var news = await loadNews();

        if (news.length === 0) {
            console.warn('[news.js] Ingen data for tidslinje');
            return;
        }

        // Grupper etter år
        var grouped = {};
        news.forEach(function (item) {
            var year = getYear(item.date);
            if (!grouped[year]) grouped[year] = [];
            grouped[year].push(item);
        });

        // Sorter år synkende
        var years = Object.keys(grouped).sort(function (a, b) { return b - a; });

        container.innerHTML = '';
        years.forEach(function (year) {
            var yearItems = grouped[year];
            var milestone = yearItems.find(function (i) { return i.timeline; });

            if (milestone) {
                container.appendChild(createTimelineItem(milestone));
            } else {
                yearItems.forEach(function (item) {
                    container.appendChild(createTimelineItem(item));
                });
            }
        });

        // Re-trigger reveal-animasjoner
        if (typeof window.observeRevealElements === 'function') {
            window.observeRevealElements();
        }
    }

    // ─── Init ─────────────────────────────────────────────────

    function init() {
        if (document.querySelector('.timeline')) {
            renderTimeline();
        }
        if (document.querySelector('.news-list')) {
            renderIndexNews();
        }
    }

    // Eksporter reinit-funksjon for SPA-navigasjon
    window.reinitNews = init;

    // Sikrer at init kjører uansett om DOMContentLoaded allerede har fyrt
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
