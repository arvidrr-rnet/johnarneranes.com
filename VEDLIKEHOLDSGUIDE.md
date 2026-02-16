# John Arne Rånes - Nettside v2 (improved2)

## Vedlikeholdsguide

Denne nettsiden er designet for å være enkel å vedlikeholde manuelt uten behov for byggeverktøy eller rammeverk.

---

## Filstruktur

```
johnarneranes.com/
├── index.html              # Hovedside
├── solo.html               # Solo-prosjekt side
├── subtoner.html           # subtoner prosjekt
├── idm.html                # Irrational Dance Music album
├── elegant.html            # Håkon Guttormsen - Elegant Music
├── archive.html            # Arkiv over andre utgivelser
├── timeline.html           # Tidslinje
├── player.html             # Pop-out lydspiller
├── robots.txt              # Søkemotor-instruksjoner
├── sitemap.xml             # Sitemap for SEO
├── version.json            # Autogenerert versjoninfo (pre-commit hook)
│
├── css/
│   └── main.css            # All styling
│
├── js/
│   ├── main.js             # Generell funksjonalitet
│   ├── audioplayer.js      # Lydspiller med AirPlay/MediaSession
│   ├── spa-navigation.js   # SPA-ruter for sømløs navigasjon
│   └── news.js             # Nyheter og tidslinje
│
├── data/
│   ├── music-library.json  # ⭐ MUSIKKBIBLIOTEK - Rediger denne for nye album!
│   └── news.json           # Nyheter og tidslinje-oppføringer
│
├── images/                 # Alle bilder
│   ├── icon/               # Favicons
│   ├── Album/              # Album-cover
│   │   ├── solo/
│   │   ├── subtoner/
│   │   ├── idm/
│   │   ├── elegant/
│   │   └── archive/
│   └── gear/               # Utstyrsbilder
│
└── audio/                  # Lydfiler hentes fra johnarneranes.com
```

---

## ⭐ LEGGE TIL NYTT ALBUM (Enkelt!)

For å legge til et nytt album i musikkbiblioteket, rediger **kun én fil**: `data/music-library.json`

### Steg 1: Åpne `data/music-library.json`

### Steg 2: Kopier denne malen og lim inn i `albums`-listen:

```json
{
  "id": "unikt-album-id",
  "title": "Albumtittel",
  "artist": "Artistnavn",
  "category": "Kategori",
  "cover": "images/Album/kategori/cover.jpg",
  "year": "2024",
  "tracks": [
    { "title": "Spor 1", "src": "audio/mappe/spor1.mp3", "duration": "04:32" },
    { "title": "Spor 2", "src": "audio/mappe/spor2.mp3", "duration": "05:17" }
  ]
}
```

### Steg 3: Tilpass feltene

| Felt | Beskrivelse | Eksempel |
|------|-------------|----------|
| `id` | Unik ID (ingen mellomrom, bruk bindestrek) | `"solo-nytt-album"` |
| `title` | Albumets tittel | `"Mitt Nye Album"` |
| `artist` | Artistnavn | `"John Arne Rånes"` |
| `category` | Kategori for gruppering | `"Solo"`, `"IDM"`, `"Samarbeid"` |
| `cover` | Sti til albumcover | `"images/Album/solo/cover.jpg"` |
| `year` | Utgivelsesår | `"2024"` |
| `tracks` | Liste over spor | Se under |

### Steg 4: Legg til spor

Hvert spor trenger:
- `title`: Sportittel
- `src`: Sti til lydfil (på johnarneranes.com)
- `duration`: Varighet i format MM:SS

### Steg 5: Lagre filen

**Ferdig!** Albumet vises nå i musikkbiblioteket på alle sider.

---

## Eksempel: Legge til komplett album

```json
{
  "id": "solo-winter-sessions",
  "title": "Winter Sessions",
  "artist": "John Arne Rånes",
  "category": "Solo",
  "cover": "images/Album/solo/winter-sessions.jpg",
  "year": "2026",
  "tracks": [
    { "title": "Frost", "src": "audio/solo/winter/01-frost.mp3", "duration": "06:12" },
    { "title": "Snø", "src": "audio/solo/winter/02-sno.mp3", "duration": "04:45" },
    { "title": "Is", "src": "audio/solo/winter/03-is.mp3", "duration": "08:30" }
  ]
}
```

---

## Viktig om lydfiler og bilder

### Lydfiler
- **Lydfiler hentes automatisk fra `https://johnarneranes.com/`**
- Last opp nye lydfiler til originalsiden først
- Bruk relative stier i JSON (f.eks. `audio/solo/spor.mp3`)

### Albumcover
- Legg albumcover i `images/Album/[kategori]/` mappen
- Anbefalt størrelse: 500x500 piksler
- Format: JPG eller PNG

---

## Vanlige oppgaver

### Legge til en ny nyhet på forsiden

Nyheter og tidslinje-oppføringer administreres via **`data/news.json`**.
Forsiden viser automatisk de 3 nyeste nyhetene, og tidslinjesiden viser alle oppføringer gruppert etter år.

1. Åpne `data/news.json`
2. Legg til et nytt objekt **øverst** i arrayet:

```json
{
    "date": "2025-09-15",
    "title": "Tittel på nyheten",
    "description": "Kort beskrivelse av nyheten.",
    "link": "side.html",
    "linkText": "Les mer →",
    "type": "utgivelse"
}
```

#### Felter i news.json

| Felt | Påkrevd | Beskrivelse |
|------|---------|-------------|
| `date` | ✅ | Dato i ISO-format: `ÅÅÅÅ-MM-DD` |
| `title` | ✅ | Tittel som vises |
| `description` | ✅ | Kort beskrivelse |
| `link` | ❌ | URL til mer info (intern eller ekstern). Oppføringer uten link vises ikke på forsiden |
| `linkText` | ❌ | Tekst på lenkeknappen (standard: «Les mer →») |
| `type` | ❌ | `utgivelse`, `konsert`, `kunngjøring`, eller `milepæl` |
| `timeline` | ❌ | Sett til `true` for milepæler som representerer et helt år i tidslinjen |

#### Eksempler

**Ny utgivelse:**
```json
{
    "date": "2026-03-01",
    "title": "Ny utgivelse — Albumnavn",
    "description": "Beskrivelse av utgivelsen.",
    "link": "side.html",
    "linkText": "Lytt →",
    "type": "utgivelse"
}
```

**Tidslinje-milepæl (bare på tidslinjesiden, ikke på forsiden):**
```json
{
    "date": "2023-01-01",
    "title": "Noe viktig skjedde",
    "description": "Beskrivelse av hendelsen.",
    "type": "milepæl",
    "timeline": true
}
```

**Tips:**
- Sortering skjer automatisk etter dato — nyeste først
- Forsiden viser kun de 3 nyeste oppføringene som har `link`
- Tidslinjesiden viser alle oppføringer, gruppert etter år
- Eksterne lenker åpnes i ny fane automatisk

### Legge til et nytt spor i en spilleliste

1. Finn `.tracklist` elementet på den aktuelle siden
2. Legg til et nytt `.track` element:

```html
<div class="track" 
     data-src="audio/mappe/filnavn.mp3" 
     data-title="Sportittel" 
     data-duration="MM:SS">
    <span class="track__number">X</span>
    <span class="track__play">▶</span>
    <div class="track__info">
        <span class="track__title">Sportittel</span>
    </div>
    <span class="track__duration">MM:SS</span>
</div>
```

### Legge til et nytt prosjekt på forsiden

1. Åpne `index.html`
2. Finn `<div class="projects-grid">`
3. Legg til et nytt kort:

```html
<article class="project-card reveal">
    <a href="prosjekt.html" class="project-card__image">
        <img src="images/bilde.jpg" alt="Beskrivelse" loading="lazy">
        <div class="project-card__overlay">
            <span class="btn btn--ghost">Se mer →</span>
        </div>
    </a>
    <div class="project-card__content">
        <span class="project-card__category">Kategori</span>
        <h3 class="project-card__title">Prosjektnavn</h3>
        <p class="project-card__description">Kort beskrivelse.</p>
        <a href="prosjekt.html" class="project-card__link">
            Hør musikken →
        </a>
    </div>
</article>
```

### Legge til en helt ny utgivelsesside

1. Kopier en eksisterende side (f.eks. `idm.html`)
2. Endre:
   - `<title>` taggen
   - Meta-beskrivelser
   - Album-hero informasjon
   - Spilleliste med spor
   - Krediteringer
3. Legg til lydfiler i `audio/` mappen
4. Legg til albumcover i `images/Album/` mappen
5. Oppdater `sitemap.xml` med ny URL

---

## CSS Design-system

### Farger (definert i `:root`)

| Variabel | Bruk |
|----------|------|
| `--color-accent-primary` | Gull - hovedaksentfarge |
| `--color-text-primary` | Hvit tekst |
| `--color-text-secondary` | Grå tekst |
| `--color-bg-primary` | Svart bakgrunn |
| `--color-bg-card` | Kortbakgrunn |

### For å endre aksentfarge

Rediger CSS-variablene i `css/main.css` under `:root`:

```css
:root {
    --color-accent-primary: #c9a962;     /* Endre denne */
    --color-accent-highlight: #e8d5a3;   /* Lysere versjon */
}
```

### Klasser for animasjon

- `.reveal` - Element animeres inn når det blir synlig (scroll)
- `.animate-fade-in` - Fade-in animasjon
- `.animate-slide-up` - Slide-up animasjon

---

## Lydspiller

Lydspilleren aktiveres automatisk når siden lastes. For å legge til spor:

### HTML-attributter for spor

| Attributt | Beskrivelse |
|-----------|-------------|
| `data-src` | Sti til lydfil |
| `data-title` | Sportittel |
| `data-duration` | Varighet (vises i UI) |
| `data-artist` | Artistnavn (valgfritt) |

### Spilleliste-attributter

| Attributt | Beskrivelse |
|-----------|-------------|
| `data-playlist` | Unik ID for spillelisten |
| `data-artist` | Standard artist for alle spor |

---

## E-postbeskyttelse

E-postadressen er beskyttet mot spam-bots. For å endre:

```html
<a href="#" 
   data-email 
   data-email-user="brukernavn" 
   data-email-domain="domene.no">
```

---

## Bilder

### Anbefalte størrelser

| Type | Størrelse | Format |
|------|-----------|--------|
| Album cover | 500x500px | JPG/PNG |
| Prosjektkort | 400x400px | JPG |
| Hero-bilde | 1200x800px | JPG |
| Favicon | 144x144px | PNG |

### Lazy loading

Alle bilder under "folden" bør ha `loading="lazy"`:

```html
<img src="bilde.jpg" alt="Beskrivelse" loading="lazy">
```

---

## SEO

### For hver ny side, husk:

1. Unik `<title>` tag
2. Meta description
3. Open Graph tags
4. Legg til i `sitemap.xml`

### Oppdatere sitemap

Legg til nye URLer i `sitemap.xml`:

```xml
<url>
    <loc>https://johnarneranes.com/nyside.html</loc>
    <lastmod>ÅÅÅÅ-MM-DD</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
</url>
```

---

## Publisering

### Azure Static Web Apps

Nettsiden er konfigurert for Azure Static Web Apps. 
Push endringer til Git-repositoriet for automatisk deploy.

### Manuell opplasting

Last opp alle filer til webserveren. 
Ingen byggeprosess er nødvendig.

---

## Feilsøking

### Lydspiller vises ikke
- Sjekk at `js/audioplayer.js` er lastet
- Sjekk at `.tracklist` elementet har riktige data-attributter

### Animasjoner fungerer ikke
- Sjekk at elementet har `.reveal` klassen
- Sjekk at `js/main.js` er lastet

### Bilder laster ikke
- Sjekk filstier (case-sensitive på Linux-servere)
- Sjekk at bildene finnes i riktig mappe

---

## Kontakt for support

Ved tekniske spørsmål, kontakt webutvikler.
