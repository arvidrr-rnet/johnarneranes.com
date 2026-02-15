/**
 * news.js — Laster og viser nyheter/tidslinje fra data/news.json
 * 
 * Brukes på:
 *   - index.html: Viser siste 3 nyheter i «Aktuelt»-seksjonen
 *   - Timeline.html: Viser alle oppføringer gruppert etter år
 */

(function () {
    'use strict';

    const NEWS_JSON_PATH = 'data/news.json';

    /**
     * Henter news.json og returnerer sortert array (nyeste først)
     */
    async function loadNews() {
        try {
            const response = await fetch(NEWS_JSON_PATH);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const news = await response.json();
            // Sorter nyeste først
            news.sort((a, b) => new Date(b.date) - new Date(a.date));
            return news;
        } catch (err) {
            console.error('Kunne ikke laste nyheter:', err);
            return [];
        }
    }

    /**
     * Formaterer ISO-dato til norsk format (DD.MM.ÅÅÅÅ)
     */
    function formatDate(isoDate) {
        const d = new Date(isoDate);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}.${month}.${year}`;
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
        const article = document.createElement('article');
        article.className = 'news-item reveal reveal--visible';

        const time = document.createElement('time');
        time.className = 'news-item__date';
        time.textContent = formatDate(item.date);
        article.appendChild(time);

        const content = document.createElement('div');
        content.className = 'news-item__content';

        const h3 = document.createElement('h3');
        h3.textContent = item.title;
        content.appendChild(h3);

        const p = document.createElement('p');
        p.textContent = item.description;
        content.appendChild(p);

        if (item.link) {
            const a = document.createElement('a');
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
        const container = document.querySelector('.news-list');
        if (!container) return;

        const news = await loadNews();
        // Vis bare oppføringer som har link (ekte nyheter, ikke bare tidslinje-milepæler)
        const visibleNews = news.filter(n => n.link);
        const latest = visibleNews.slice(0, 3);

        container.innerHTML = '';
        latest.forEach(item => {
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
        const div = document.createElement('div');
        div.className = 'timeline-item reveal reveal--visible';

        const yearDiv = document.createElement('div');
        yearDiv.className = 'timeline-year';
        yearDiv.textContent = getYear(item.date);
        div.appendChild(yearDiv);

        const h3 = document.createElement('h3');
        h3.className = 'timeline-title';
        h3.textContent = item.title;
        div.appendChild(h3);

        const p = document.createElement('p');
        p.className = 'timeline-description';
        p.textContent = item.description;
        div.appendChild(p);

        return div;
    }

    /**
     * Rendrer tidslinje gruppert etter år
     */
    async function renderTimeline() {
        const container = document.querySelector('.timeline');
        if (!container) return;

        const news = await loadNews();

        // Grupper etter år — bruk bare timeline-oppføringer 
        // eller alle nyheter for en komplett tidslinje
        const grouped = {};
        news.forEach(item => {
            const year = getYear(item.date);
            if (!grouped[year]) grouped[year] = [];
            grouped[year].push(item);
        });

        // Sorter år synkende
        const years = Object.keys(grouped).sort((a, b) => b - a);

        container.innerHTML = '';
        years.forEach(year => {
            // For hvert år: vis en sammenslått oppføring hvis det finnes en timeline-milepæl,
            // ellers vis individuelle nyheter
            const yearItems = grouped[year];
            const milestone = yearItems.find(i => i.timeline);

            if (milestone) {
                // Vis milepæl-oppføringen som representerer hele året
                container.appendChild(createTimelineItem(milestone));
            } else {
                // Vis individuelle oppføringer for dette året
                yearItems.forEach(item => {
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
        // Avgjør hvilken side vi er på og rendre riktig visning
        if (document.querySelector('.timeline')) {
            renderTimeline();
        }
        if (document.querySelector('.news-list')) {
            renderIndexNews();
        }
    }

    // Sikrer at init kjører uansett om DOMContentLoaded allerede har fyrt
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
