/**
 * JOHN ARNE RÅNES - Audio Player v2
 * Forbedret lydspiller med albumvelger og kontinuerlig avspilling
 * 
 * VEDLIKEHOLDSGUIDE:
 * - Musikkbiblioteket defineres i data/music-library.json
 * - For å legge til nye album: Rediger JSON-filen
 * - Spilleren lagrer tilstand og fortsetter ved sidenavigering
 * - Keyboard: Mellomrom (play/pause), Piltaster (spol), M (bibliotek)
 */

// ============================================================
// KONFIGURASJON
// ============================================================
// Ekstern hosting av lydfiler - reduserer størrelsen på Static Web App
const AUDIO_BASE_URL = 'https://johnarneranes.com/';

// Sti til musikkbibliotek JSON-fil
const MUSIC_LIBRARY_URL = 'data/music-library.json';

// Musikkbiblioteket lastes fra JSON
let MUSIC_LIBRARY = { albums: [] };

// Hjelpefunksjon for å bygge full audio URL
function getAudioUrl(relativePath) {
    if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
        return relativePath;
    }
    return AUDIO_BASE_URL + relativePath;
}

// Last musikkbiblioteket fra JSON
async function loadMusicLibrary() {
    try {
        const response = await fetch(MUSIC_LIBRARY_URL);
        if (!response.ok) throw new Error('Kunne ikke laste musikkbibliotek');
        const data = await response.json();
        MUSIC_LIBRARY = data;
        return data;
    } catch (error) {
        console.warn('Feil ved lasting av musikkbibliotek:', error);
        return { albums: [] };
    }
}

// ============================================================
// AUDIO PLAYER CLASS
// ============================================================
class AudioPlayer {
    constructor() {
        this.audio = new Audio();
        this.currentTrack = null;
        this.currentAlbum = null;
        this.currentPlaylist = [];
        this.currentIndex = 0;
        this.isPlaying = false;
        this.isLibraryOpen = false;
        this.libraryLoaded = false;
        this.volume = parseFloat(localStorage.getItem('jar_audioVolume')) || 0.8;
        this.autoResume = localStorage.getItem('jar_autoResume') !== 'false';
        this.popOutWindow = null;
        this.isPopOutActive = false;
        this.channel = null;
        
        this.init();
    }
    
    async init() {
        this.createPlayerUI();
        this.bindEvents();
        this.audio.volume = this.volume;
        
        // Last musikkbiblioteket fra JSON
        await loadMusicLibrary();
        this.libraryLoaded = true;
        this.renderLibrary();
        
        // Sjekk om vi skal fortsette avspilling fra forrige side
        this.checkForContinuedPlayback();
        
        // Vis spilleren alltid - gjør den lett tilgjengelig
        this.showPlayer();
        
        // Sett opp BroadcastChannel for pop-out kommunikasjon
        this.initPopOutChannel();
        
        // Sett opp AirPlay-støtte (Safari)
        this.initAirPlay();
        
        // Sett opp MediaSession API for OS-mediakontroller
        this.initMediaSession();
    }
    
    createPlayerUI() {
        if (document.querySelector('.audio-player')) return;
        
        const playerHTML = `
            <div class="audio-player" id="audio-player" role="region" aria-label="Lydspiller">
                <div class="audio-player__container">
                    <!-- Musikkbibliotek-knapp - pulserer for å tiltrekke oppmerksomhet -->
                    <button class="audio-player__btn audio-player__library-btn audio-player__library-btn--highlight" id="library-btn" aria-label="Åpne musikkbibliotek" title="Velg album (M)">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                        </svg>
                        <span class="audio-player__library-label">Musikk</span>
                    </button>
                    
                    <!-- Kontroller -->
                    <div class="audio-player__controls">
                        <button class="audio-player__btn" id="prev-btn" aria-label="Forrige spor">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
                            </svg>
                        </button>
                        <button class="audio-player__btn audio-player__btn--play" id="play-btn" aria-label="Spill av">
                            <svg class="play-icon" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M8 5v14l11-7z"/>
                            </svg>
                            <svg class="pause-icon hidden" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                            </svg>
                        </button>
                        <button class="audio-player__btn" id="next-btn" aria-label="Neste spor">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
                            </svg>
                        </button>
                    </div>
                    
                    <!-- Info -->
                    <div class="audio-player__info">
                        <div class="audio-player__title" id="track-title">Klikk på "Musikk" for å lytte</div>
                        <div class="audio-player__artist" id="track-artist">Eksperimentell gitar og improvisasjon</div>
                    </div>
                    
                    <!-- Progress -->
                    <div class="audio-player__progress">
                        <span class="audio-player__time" id="current-time">0:00</span>
                        <div class="audio-player__progress-bar" id="progress-bar" role="slider" aria-label="Sporlengde">
                            <div class="audio-player__progress-fill" id="progress-fill"></div>
                        </div>
                        <span class="audio-player__time" id="duration">0:00</span>
                    </div>
                    
                    <!-- Volume -->
                    <div class="audio-player__volume">
                        <button class="audio-player__btn" id="volume-btn" aria-label="Volum">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
                            </svg>
                        </button>
                        <input type="range" class="audio-player__volume-slider" id="volume-slider" 
                               min="0" max="1" step="0.01" value="${this.volume}" aria-label="Volumkontroll">
                    </div>
                    
                    <!-- AirPlay (kun Safari) -->
                    <button class="audio-player__btn audio-player__btn--airplay" id="airplay-btn" aria-label="AirPlay" title="Spill av via AirPlay" style="display:none">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 22h12l-6-6-6 6zM21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4v-2H3V5h18v12h-4v2h4c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>
                        </svg>
                    </button>
                    
                    <!-- Pop-out -->
                    <button class="audio-player__btn audio-player__btn--popout" id="popout-btn" aria-label="Pop ut spiller" title="Pop ut i eget vindu">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
                        </svg>
                    </button>
                </div>
                
                <!-- Musikkbibliotek panel -->
                <div class="audio-library" id="audio-library">
                    <div class="audio-library__header">
                        <h3>Musikkbibliotek</h3>
                        <button class="audio-library__close" id="library-close" aria-label="Lukk">✕</button>
                    </div>
                    <div class="audio-library__content">
                        <div class="audio-library__albums" id="library-albums"></div>
                        <div class="audio-library__tracks hidden" id="library-tracks">
                            <button class="audio-library__back" id="library-back">← Tilbake til album</button>
                            <div class="audio-library__album-info" id="album-info"></div>
                            <div class="audio-library__tracklist" id="album-tracklist"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', playerHTML);
        this.cacheElements();
        // renderLibrary() kalles fra init() etter at JSON er lastet
    }
    
    cacheElements() {
        this.playerEl = document.getElementById('audio-player');
        this.playBtn = document.getElementById('play-btn');
        this.prevBtn = document.getElementById('prev-btn');
        this.nextBtn = document.getElementById('next-btn');
        this.progressBar = document.getElementById('progress-bar');
        this.progressFill = document.getElementById('progress-fill');
        this.currentTimeEl = document.getElementById('current-time');
        this.durationEl = document.getElementById('duration');
        this.trackTitleEl = document.getElementById('track-title');
        this.trackArtistEl = document.getElementById('track-artist');
        this.volumeSlider = document.getElementById('volume-slider');
        this.libraryBtn = document.getElementById('library-btn');
        this.popOutBtn = document.getElementById('popout-btn');
        this.libraryPanel = document.getElementById('audio-library');
        this.libraryClose = document.getElementById('library-close');
        this.libraryAlbums = document.getElementById('library-albums');
        this.libraryTracks = document.getElementById('library-tracks');
        this.libraryBack = document.getElementById('library-back');
        this.albumInfo = document.getElementById('album-info');
        this.albumTracklist = document.getElementById('album-tracklist');
    }
    
    bindEvents() {
        // Play/Pause
        this.playBtn.addEventListener('click', () => this.togglePlay());
        
        // Previous/Next
        this.prevBtn.addEventListener('click', () => this.previousTrack());
        this.nextBtn.addEventListener('click', () => this.nextTrack());
        
        // Progress bar
        this.progressBar.addEventListener('click', (e) => this.seek(e));
        
        // Volume
        this.volumeSlider.addEventListener('input', (e) => this.setVolume(e.target.value));
        
        // Library toggle
        this.libraryBtn.addEventListener('click', () => this.toggleLibrary());
        this.libraryClose.addEventListener('click', () => this.closeLibrary());
        this.libraryBack.addEventListener('click', () => this.showAlbumList());
        
        // Pop-out
        this.popOutBtn.addEventListener('click', () => this.popOutPlayer());
        
        // Audio events
        this.audio.addEventListener('timeupdate', () => this.updateProgress());
        this.audio.addEventListener('loadedmetadata', () => this.updateDuration());
        this.audio.addEventListener('ended', () => this.handleTrackEnd());
        this.audio.addEventListener('play', () => this.onPlay());
        this.audio.addEventListener('pause', () => this.onPause());
        
        // Lagre tilstand ved navigering - VIKTIG for kontinuerlig avspilling
        window.addEventListener('beforeunload', () => this.saveState());
        
        // Lagre tilstand periodisk
        setInterval(() => this.saveState(), 3000);
        
        // Bind spor i dokumentet
        this.bindTrackElements();
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
        
        // Lukk bibliotek ved klikk utenfor
        document.addEventListener('click', (e) => {
            if (this.isLibraryOpen && !this.playerEl.contains(e.target)) {
                this.closeLibrary();
            }
        });
    }
    
    renderLibrary() {
        // Grupper album etter kategori
        const categories = {};
        MUSIC_LIBRARY.albums.forEach(album => {
            if (!categories[album.category]) {
                categories[album.category] = [];
            }
            categories[album.category].push(album);
        });
        
        let html = '';
        for (const [category, albums] of Object.entries(categories)) {
            html += `<div class="audio-library__category">
                <h4>${category}</h4>
                <div class="audio-library__grid">`;
            
            albums.forEach(album => {
                html += `
                    <div class="audio-library__album" data-album-id="${album.id}">
                        <img src="${album.cover}" alt="${album.title}" loading="lazy" onerror="this.src='images/icon/record.svg'">
                        <div class="audio-library__album-title">${album.title}</div>
                        <div class="audio-library__album-artist">${album.artist}</div>
                    </div>
                `;
            });
            
            html += `</div></div>`;
        }
        
        this.libraryAlbums.innerHTML = html;
        
        // Bind click events
        this.libraryAlbums.querySelectorAll('.audio-library__album').forEach(el => {
            el.addEventListener('click', () => {
                const albumId = el.dataset.albumId;
                this.showAlbumTracks(albumId);
            });
        });
    }
    
    showAlbumTracks(albumId) {
        const album = MUSIC_LIBRARY.albums.find(a => a.id === albumId);
        if (!album) return;
        
        this.albumInfo.innerHTML = `
            <img src="${album.cover}" alt="${album.title}" onerror="this.src='images/icon/record.svg'">
            <div>
                <h4>${album.title}</h4>
                <p>${album.artist} • ${album.year}</p>
                <button class="btn btn--small btn--gold" id="play-album-btn">▶ Spill alle</button>
            </div>
        `;
        
        let tracksHtml = '';
        album.tracks.forEach((track, index) => {
            const isCurrentTrack = this.currentTrack && this.currentTrack.src === track.src;
            tracksHtml += `
                <div class="audio-library__track ${isCurrentTrack ? 'audio-library__track--active' : ''}" 
                     data-album-id="${albumId}" data-track-index="${index}">
                    <span class="audio-library__track-num">${index + 1}</span>
                    <span class="audio-library__track-title">${track.title}</span>
                    <span class="audio-library__track-duration">${track.duration}</span>
                </div>
            `;
        });
        
        this.albumTracklist.innerHTML = tracksHtml;
        
        // Bind events
        document.getElementById('play-album-btn').addEventListener('click', () => {
            this.playAlbum(albumId, 0);
            this.closeLibrary();
        });
        
        this.albumTracklist.querySelectorAll('.audio-library__track').forEach(el => {
            el.addEventListener('click', () => {
                const index = parseInt(el.dataset.trackIndex);
                this.playAlbum(albumId, index);
                this.closeLibrary();
            });
        });
        
        // Vis tracks-visning
        this.libraryAlbums.classList.add('hidden');
        this.libraryTracks.classList.remove('hidden');
    }
    
    showAlbumList() {
        this.libraryAlbums.classList.remove('hidden');
        this.libraryTracks.classList.add('hidden');
    }
    
    toggleLibrary() {
        this.isLibraryOpen = !this.isLibraryOpen;
        this.libraryPanel.classList.toggle('audio-library--open', this.isLibraryOpen);
        this.libraryBtn.classList.toggle('active', this.isLibraryOpen);
        
        if (this.isLibraryOpen) {
            this.showAlbumList();
        }
    }
    
    closeLibrary() {
        this.isLibraryOpen = false;
        this.libraryPanel.classList.remove('audio-library--open');
        this.libraryBtn.classList.remove('active');
    }
    
    playAlbum(albumId, startIndex = 0) {
        const album = MUSIC_LIBRARY.albums.find(a => a.id === albumId);
        if (!album) return;
        
        this.currentAlbum = album;
        this.currentPlaylist = album.tracks.map(t => ({
            ...t,
            artist: album.artist,
            albumId: album.id,
            cover: album.cover
        }));
        this.currentIndex = startIndex;
        
        this.loadTrack(this.currentPlaylist[this.currentIndex]);
        this.play();
        this.showPlayer();
    }
    
    loadTrack(track) {
        this.currentTrack = track;
        // Bruk getAudioUrl for å hente fra ekstern server
        this.audio.src = getAudioUrl(track.src);
        this.trackTitleEl.textContent = track.title;
        this.trackArtistEl.textContent = track.artist;
        this.updateAllTrackHighlighting();
        this.updateMediaSession();
    }
    
    play() {
        this.audio.play().catch(err => {
            console.warn('Avspilling feilet:', err);
        });
    }
    
    pause() {
        this.audio.pause();
    }
    
    togglePlay() {
        if (!this.currentTrack) {
            // Åpne bibliotek hvis ingenting er lastet
            this.toggleLibrary();
            return;
        }
        
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }
    
    onPlay() {
        this.isPlaying = true;
        this.playBtn.querySelector('.play-icon').classList.add('hidden');
        this.playBtn.querySelector('.pause-icon').classList.remove('hidden');
        this.playBtn.setAttribute('aria-label', 'Pause');
        this.showPlayer();
    }
    
    onPause() {
        this.isPlaying = false;
        this.playBtn.querySelector('.play-icon').classList.remove('hidden');
        this.playBtn.querySelector('.pause-icon').classList.add('hidden');
        this.playBtn.setAttribute('aria-label', 'Spill av');
    }
    
    previousTrack() {
        if (this.currentPlaylist.length === 0) return;
        
        if (this.audio.currentTime > 3) {
            this.audio.currentTime = 0;
            return;
        }
        
        this.currentIndex = (this.currentIndex - 1 + this.currentPlaylist.length) % this.currentPlaylist.length;
        this.loadTrack(this.currentPlaylist[this.currentIndex]);
        this.play();
    }
    
    nextTrack() {
        if (this.currentPlaylist.length === 0) return;
        
        this.currentIndex = (this.currentIndex + 1) % this.currentPlaylist.length;
        this.loadTrack(this.currentPlaylist[this.currentIndex]);
        this.play();
    }
    
    handleTrackEnd() {
        if (this.currentIndex < this.currentPlaylist.length - 1) {
            this.nextTrack();
        } else {
            this.onPause();
            this.currentIndex = 0;
        }
    }
    
    seek(e) {
        if (!this.audio.duration) return;
        const rect = this.progressBar.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        this.audio.currentTime = percent * this.audio.duration;
    }
    
    setVolume(value) {
        this.volume = parseFloat(value);
        this.audio.volume = this.volume;
        localStorage.setItem('jar_audioVolume', this.volume);
    }
    
    updateProgress() {
        if (!this.audio.duration) return;
        const percent = (this.audio.currentTime / this.audio.duration) * 100;
        this.progressFill.style.width = `${percent}%`;
        this.currentTimeEl.textContent = this.formatTime(this.audio.currentTime);
    }
    
    updateDuration() {
        this.durationEl.textContent = this.formatTime(this.audio.duration);
    }
    
    formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    showPlayer() {
        this.playerEl.classList.add('audio-player--visible');
        document.body.style.paddingBottom = '140px';
    }
    
    updateAllTrackHighlighting() {
        // Oppdater highlighting i dokumentet
        document.querySelectorAll('.track--playing').forEach(el => {
            el.classList.remove('track--playing');
        });
        
        if (this.currentTrack) {
            const activeTrack = document.querySelector(`.track[data-src="${this.currentTrack.src}"]`);
            if (activeTrack) {
                activeTrack.classList.add('track--playing');
            }
        }
    }
    
    // ============================================================
    // KONTINUERLIG AVSPILLING - Lagre og gjenopprett tilstand
    // ============================================================
    saveState() {
        if (!this.currentTrack) return;
        
        const state = {
            albumId: this.currentAlbum?.id,
            trackIndex: this.currentIndex,
            currentTime: this.audio.currentTime,
            isPlaying: this.isPlaying,
            volume: this.volume,
            playlist: this.currentPlaylist,
            timestamp: Date.now()
        };
        
        localStorage.setItem('jar_playerState', JSON.stringify(state));
    }
    
    checkForContinuedPlayback() {
        const stateStr = localStorage.getItem('jar_playerState');
        if (!stateStr) return;
        
        try {
            const state = JSON.parse(stateStr);
            
            // Sjekk at tilstanden ikke er for gammel (maks 2 timer)
            if (Date.now() - state.timestamp > 7200000) {
                localStorage.removeItem('jar_playerState');
                return;
            }
            
            // Last inn album og spor
            if (state.albumId) {
                const album = MUSIC_LIBRARY.albums.find(a => a.id === state.albumId);
                if (album) {
                    this.currentAlbum = album;
                    this.currentPlaylist = state.playlist || album.tracks.map(t => ({
                        ...t,
                        artist: album.artist,
                        albumId: album.id
                    }));
                    this.currentIndex = state.trackIndex || 0;
                    
                    if (this.currentPlaylist[this.currentIndex]) {
                        this.loadTrack(this.currentPlaylist[this.currentIndex]);
                        this.audio.currentTime = state.currentTime || 0;
                        
                        // Fortsett avspilling hvis det var på spill
                        if (state.isPlaying && this.autoResume) {
                            setTimeout(() => this.play(), 100);
                        }
                        
                        this.showPlayer();
                    }
                }
            }
        } catch (e) {
            console.warn('Kunne ikke gjenoppta avspilling:', e);
        }
    }
    
    // ============================================================
    // SPOR FRA SIDER - Bind tracklist elementer på siden
    // ============================================================
    bindTrackElements() {
        document.querySelectorAll('.tracklist').forEach(playlist => {
            const tracks = playlist.querySelectorAll('.track');
            
            tracks.forEach((track, index) => {
                track.addEventListener('click', () => {
                    // Bygg spilleliste fra DOM
                    this.currentPlaylist = [];
                    playlist.querySelectorAll('.track').forEach(t => {
                        this.currentPlaylist.push({
                            src: t.dataset.src,
                            title: t.dataset.title || t.querySelector('.track__title')?.textContent || 'Ukjent',
                            artist: playlist.dataset.artist || '',
                            duration: t.dataset.duration || ''
                        });
                    });
                    
                    this.currentAlbum = { id: playlist.dataset.playlist || 'page-playlist' };
                    this.currentIndex = index;
                    this.loadTrack(this.currentPlaylist[this.currentIndex]);
                    this.play();
                    this.showPlayer();
                });
            });
        });
        
        // Enkeltstående sporavspilling
        document.querySelectorAll('[data-audio-src]').forEach(el => {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                const src = el.dataset.audioSrc;
                const title = el.dataset.audioTitle || 'Ukjent spor';
                const artist = el.dataset.audioArtist || '';
                
                this.currentPlaylist = [{ src, title, artist }];
                this.currentIndex = 0;
                this.currentAlbum = { id: 'single-track' };
                this.loadTrack(this.currentPlaylist[0]);
                this.play();
            });
        });
    }
    
    handleKeyboard(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        
        switch(e.code) {
            case 'Space':
                e.preventDefault();
                this.togglePlay();
                break;
            case 'ArrowLeft':
                e.preventDefault();
                this.audio.currentTime = Math.max(0, this.audio.currentTime - 10);
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.audio.currentTime = Math.min(this.audio.duration || 0, this.audio.currentTime + 10);
                break;
            case 'KeyM':
                e.preventDefault();
                this.toggleLibrary();
                break;
        }
    }
    
    // ============================================================
    // AIRPLAY — Støtte for Apple AirPlay
    // ============================================================
    initAirPlay() {
        const airplayBtn = document.getElementById('airplay-btn');
        if (!airplayBtn) return;

        // Sjekk om nettleseren støtter AirPlay (Safari)
        if (window.WebKitPlaybackTargetAvailabilityEvent || this.audio.webkitShowPlaybackTargetPicker) {
            // Lytt etter om AirPlay-enheter er tilgjengelige
            this.audio.addEventListener('webkitplaybacktargetavailabilitychanged', (e) => {
                airplayBtn.style.display = (e.availability === 'available') ? '' : 'none';
            });

            airplayBtn.addEventListener('click', () => {
                if (this.audio.webkitShowPlaybackTargetPicker) {
                    this.audio.webkitShowPlaybackTargetPicker();
                }
            });
        }
        // Remote Playback API (Chrome/Edge — Chromecast o.l., ikke Google Cast SDK)
        else if (this.audio.remote) {
            this.audio.remote.watchAvailability((available) => {
                airplayBtn.style.display = available ? '' : 'none';
            }).catch(() => {
                // watchAvailability ikke støttet, vis knappen uansett
                airplayBtn.style.display = '';
            });

            airplayBtn.addEventListener('click', () => {
                this.audio.remote.prompt().catch(err => {
                    console.warn('Remote playback feilet:', err);
                });
            });
        }
    }

    // ============================================================
    // MEDIA SESSION — OS-mediakontroller og Bluetooth-metadata
    // ============================================================
    initMediaSession() {
        if (!('mediaSession' in navigator)) return;

        navigator.mediaSession.setActionHandler('play', () => this.play());
        navigator.mediaSession.setActionHandler('pause', () => this.pause());
        navigator.mediaSession.setActionHandler('previoustrack', () => this.previousTrack());
        navigator.mediaSession.setActionHandler('nexttrack', () => this.nextTrack());
        navigator.mediaSession.setActionHandler('seekto', (details) => {
            if (details.fastSeek && 'fastSeek' in this.audio) {
                this.audio.fastSeek(details.seekTime);
            } else {
                this.audio.currentTime = details.seekTime;
            }
            this.updatePositionState();
        });
        navigator.mediaSession.setActionHandler('seekbackward', (details) => {
            this.audio.currentTime = Math.max(0, this.audio.currentTime - (details.seekOffset || 10));
            this.updatePositionState();
        });
        navigator.mediaSession.setActionHandler('seekforward', (details) => {
            this.audio.currentTime = Math.min(this.audio.duration || 0, this.audio.currentTime + (details.seekOffset || 10));
            this.updatePositionState();
        });

        // Oppdater posisjon periodisk
        this.audio.addEventListener('timeupdate', () => this.updatePositionState());
    }

    updateMediaSession() {
        if (!('mediaSession' in navigator) || !this.currentTrack) return;

        const coverUrl = this.currentAlbum?.cover
            ? new URL(this.currentAlbum.cover, window.location.href).href
            : new URL('images/icon/icon144.png', window.location.href).href;

        navigator.mediaSession.metadata = new MediaMetadata({
            title: this.currentTrack.title,
            artist: this.currentTrack.artist || this.currentAlbum?.artist || 'John Arne Rånes',
            album: this.currentAlbum?.title || '',
            artwork: [
                { src: coverUrl, sizes: '256x256', type: 'image/jpeg' },
                { src: coverUrl, sizes: '512x512', type: 'image/jpeg' }
            ]
        });
    }

    updatePositionState() {
        if (!('mediaSession' in navigator)) return;
        if (!this.audio.duration || isNaN(this.audio.duration)) return;
        try {
            navigator.mediaSession.setPositionState({
                duration: this.audio.duration,
                playbackRate: this.audio.playbackRate,
                position: this.audio.currentTime
            });
        } catch (e) {
            // Ignorer feil ved ugyldig tilstand
        }
    }

    // ============================================================
    // POP-OUT SPILLER — Åpne i eget vindu
    // ============================================================
    initPopOutChannel() {
        try {
            this.channel = new BroadcastChannel('jar-player');
            this.channel.onmessage = (e) => this.handleChannelMessage(e);
        } catch (err) {
            console.warn('BroadcastChannel ikke tilgjengelig:', err);
        }
    }
    
    handleChannelMessage(event) {
        const { type, data } = event.data;
        
        switch (type) {
            case 'popout-ready':
                // Pop-out er lastet, send nåværende tilstand
                if (this.channel) {
                    this.channel.postMessage({
                        type: 'sync-state',
                        data: {
                            albumId: this.currentAlbum?.id,
                            trackIndex: this.currentIndex,
                            currentTime: this.audio.currentTime,
                            isPlaying: this.isPlaying,
                            volume: this.volume,
                            playlist: this.currentPlaylist,
                            library: MUSIC_LIBRARY
                        }
                    });
                }
                // Pause hovedspilleren
                this.pause();
                this.isPopOutActive = true;
                this.playerEl.classList.add('audio-player--popout-active');
                break;
                
            case 'popout-closed':
                // Pop-out ble lukket, gjenoppta i hovedvinduet
                this.isPopOutActive = false;
                this.popOutWindow = null;
                this.playerEl.classList.remove('audio-player--popout-active');
                
                // Gjenopprett tilstand fra pop-out
                if (data) {
                    if (data.albumId) {
                        const album = MUSIC_LIBRARY.albums.find(a => a.id === data.albumId);
                        if (album) {
                            this.currentAlbum = album;
                            this.currentPlaylist = data.playlist || [];
                            this.currentIndex = data.trackIndex || 0;
                            
                            if (this.currentPlaylist[this.currentIndex]) {
                                const seekTime = data.currentTime || 0;
                                const shouldPlay = data.isPlaying;
                                
                                this.loadTrack(this.currentPlaylist[this.currentIndex]);
                                
                                // Vent på at metadata lastes før vi setter currentTime
                                const onMeta = () => {
                                    this.audio.removeEventListener('loadedmetadata', onMeta);
                                    this.audio.currentTime = seekTime;
                                    if (shouldPlay) {
                                        this.play();
                                    }
                                };
                                this.audio.addEventListener('loadedmetadata', onMeta);
                            }
                        }
                    }
                }
                break;
        }
    }
    
    popOutPlayer() {
        // Lagre tilstand før åpning
        this.saveState();
        
        // Åpne pop-out vindu
        const width = 380;
        const height = 500;
        const left = window.screen.width - width - 50;
        const top = 50;
        
        this.popOutWindow = window.open(
            'player.html',
            'jar-popout',
            `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=no`
        );
        
        if (!this.popOutWindow) {
            console.warn('Kunne ikke åpne pop-out vindu (blokkert av nettleseren?)');
            return;
        }
        
        // Pause hovedspilleren
        this.pause();
        this.isPopOutActive = true;
        this.playerEl.classList.add('audio-player--popout-active');
    }
}

// Random Track Selector - for tilfeldig avspilling
class RandomTrackSelector {
    constructor() {
        this.played = [];
    }
    
    getRandomAlbum() {
        const available = MUSIC_LIBRARY.albums.filter(a => !this.played.includes(a.id));
        if (available.length === 0) {
            this.played = [];
            return MUSIC_LIBRARY.albums[Math.floor(Math.random() * MUSIC_LIBRARY.albums.length)];
        }
        const random = available[Math.floor(Math.random() * available.length)];
        this.played.push(random.id);
        return random;
    }
}

// Initialiser spilleren når DOM er klar
document.addEventListener('DOMContentLoaded', () => {
    window.audioPlayer = new AudioPlayer();
    window.randomSelector = new RandomTrackSelector();
});

// Eksporter for manuell bruk
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AudioPlayer, RandomTrackSelector, MUSIC_LIBRARY };
}
