/* ============================================
   THEME SWITCHER — John Arne Rånes
   Dynamisk font-lasting og tema-bytte
   ============================================ */
(function () {
    'use strict';

    var STORAGE_KEY = 'jar-theme';

    var THEMES = [
        {
            id: 'default',
            label: 'Standard',
            sub: 'Moderne jazz',
            icon: '◆',
            fonts: null  // allerede lastet i HTML
        },
        {
            id: 'walkman',
            label: 'Walkman',
            sub: '80s kassett',
            icon: '◉',
            fonts: 'family=Space+Mono:wght@400;700&family=Abril+Fatface'
        },
        {
            id: 'vhs',
            label: 'VHS',
            sub: 'Synthwave',
            icon: '▮',
            fonts: 'family=Orbitron:wght@400;500;700&family=Share+Tech+Mono'
        }
    ];

    // Cache for allerede-lastede fonter
    var loadedFonts = {};

    // --- Font-lasting ---
    function loadFonts(theme) {
        if (!theme.fonts || loadedFonts[theme.id]) return;

        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?' + theme.fonts + '&display=swap';
        link.dataset.themeFont = theme.id;
        document.head.appendChild(link);
        loadedFonts[theme.id] = true;
    }

    // --- Preload alle tema-fonter ---
    function preloadAllFonts() {
        THEMES.forEach(function (theme) {
            if (theme.fonts && !loadedFonts[theme.id]) {
                var link = document.createElement('link');
                link.rel = 'preload';
                link.as = 'style';
                link.href = 'https://fonts.googleapis.com/css2?' + theme.fonts + '&display=swap';
                document.head.appendChild(link);
            }
        });
    }

    // --- Hent lagret tema ---
    function getSavedTheme() {
        try {
            return localStorage.getItem(STORAGE_KEY) || 'default';
        } catch (e) {
            return 'default';
        }
    }

    // --- Bruk tema ---
    function applyTheme(themeId) {
        var html = document.documentElement;
        var theme = THEMES.find(function (t) { return t.id === themeId; });
        if (!theme) return;

        // Last fonter først
        loadFonts(theme);

        // Smooth overgang
        if (document.body) {
            document.body.classList.add('theme-transitioning');
        }

        if (themeId === 'default') {
            html.removeAttribute('data-theme');
        } else {
            html.setAttribute('data-theme', themeId);
        }

        // Lagre
        try {
            localStorage.setItem(STORAGE_KEY, themeId);
        } catch (e) { /* */ }

        // Fjern overgang
        setTimeout(function () {
            if (document.body) {
                document.body.classList.remove('theme-transitioning');
            }
        }, 600);

        updateActiveState(themeId);
    }

    // --- Oppdater meny ---
    function updateActiveState(activeId) {
        var options = document.querySelectorAll('.theme-switcher__option');
        options.forEach(function (btn) {
            btn.classList.toggle(
                'theme-switcher__option--active',
                btn.dataset.theme === activeId
            );
        });

        // Oppdater knapp
        var theme = THEMES.find(function (t) { return t.id === activeId; });
        var btnEl = document.querySelector('.theme-switcher__btn');
        if (btnEl && theme) {
            var icon = btnEl.querySelector('.theme-switcher__icon');
            var label = btnEl.querySelector('.theme-switcher__label');
            if (icon) icon.textContent = theme.icon;
            if (label) label.textContent = theme.label;
        }
    }

    // --- Bygg UI ---
    function createSwitcher() {
        var currentThemeId = getSavedTheme();
        var current = THEMES.find(function (t) { return t.id === currentThemeId; }) || THEMES[0];

        var wrapper = document.createElement('div');
        wrapper.className = 'theme-switcher';

        // Knapp
        var btn = document.createElement('button');
        btn.className = 'theme-switcher__btn';
        btn.setAttribute('aria-label', 'Velg visuelt tema');
        btn.setAttribute('aria-expanded', 'false');
        btn.innerHTML =
            '<span class="theme-switcher__icon">' + current.icon + '</span>' +
            '<span class="theme-switcher__label">' + current.label + '</span>';

        // Meny
        var menu = document.createElement('div');
        menu.className = 'theme-switcher__menu';
        menu.setAttribute('role', 'menu');

        THEMES.forEach(function (theme) {
            var option = document.createElement('button');
            option.className = 'theme-switcher__option';
            option.dataset.theme = theme.id;
            option.setAttribute('role', 'menuitem');
            if (theme.id === currentThemeId) {
                option.classList.add('theme-switcher__option--active');
            }

            option.innerHTML =
                '<span class="theme-switcher__option-icon">' + theme.icon + '</span>' +
                '<span class="theme-switcher__option-label">' +
                    theme.label +
                    '<span class="theme-switcher__option-sub">' + theme.sub + '</span>' +
                '</span>' +
                '<span class="theme-switcher__option-check">✓</span>';

            option.addEventListener('click', function () {
                applyTheme(theme.id);
                closeMenu();
            });

            // Preload fonter ved hover
            option.addEventListener('mouseenter', function () {
                loadFonts(theme);
            });

            menu.appendChild(option);
        });

        wrapper.appendChild(btn);
        wrapper.appendChild(menu);

        // Toggle
        var isOpen = false;

        function openMenu() {
            isOpen = true;
            menu.classList.add('theme-switcher__menu--open');
            btn.setAttribute('aria-expanded', 'true');
        }

        function closeMenu() {
            isOpen = false;
            menu.classList.remove('theme-switcher__menu--open');
            btn.setAttribute('aria-expanded', 'false');
        }

        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            if (isOpen) closeMenu();
            else openMenu();
        });

        document.addEventListener('click', function (e) {
            if (isOpen && !wrapper.contains(e.target)) {
                closeMenu();
            }
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && isOpen) {
                closeMenu();
                btn.focus();
            }
        });

        return wrapper;
    }

    // --- Init ---
    function init() {
        var saved = getSavedTheme();

        // Bruk tema ASAP (før rendering)
        if (saved !== 'default') {
            document.documentElement.setAttribute('data-theme', saved);
        }

        // Last fonter for valgt tema umiddelbart
        var theme = THEMES.find(function (t) { return t.id === saved; });
        if (theme) loadFonts(theme);

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', mount);
        } else {
            mount();
        }
    }

    function mount() {
        var nav = document.querySelector('.nav');
        if (!nav) return;

        var switcher = createSwitcher();

        var toggle = nav.querySelector('.nav__toggle');
        if (toggle) {
            nav.insertBefore(switcher, toggle);
        } else {
            nav.appendChild(switcher);
        }

        // Preload andre fonter etter 2 sekunder
        setTimeout(preloadAllFonts, 2000);
    }

    init();
})();
