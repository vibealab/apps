class MusicPlayer {
    constructor() {
        // Audio context and nodes
        this.audioContext = null;
        this.sourceNode = null;
        this.gainNode = null;
        this.analyserNode = null;
        this.convolverNode = null;
        this.bassBoostNode = null;
        
        // Playlist
        this.playlist = [];
        this.currentIndex = -1;
        this.audioElement = new Audio();
        
        // Playback modes
        this.modes = {
            loopList: false,
            loopOne: false,
            random: false
        };
        
        // FX settings
        this.fx = {
            volumeAmount: 100,
            reverbAmount: 0,
            bassBoost: 0
        };
        
        // Visualization
        this.visualizerEnabled = false;
        this.animationId = null;
        
        // Initialize
        this.init();
    }
    
    init() {
        this.setupAudioContext();
        this.setupEventListeners();
        this.setupAudioElement();
    }
    
    setupAudioContext() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create audio nodes
        this.analyserNode = this.audioContext.createAnalyser();
        this.analyserNode.fftSize = 256;
        
        this.gainNode = this.audioContext.createGain();
        
        // Create convolver for reverb
        this.convolverNode = this.audioContext.createConvolver();
        this.reverbGainNode = this.audioContext.createGain();
        this.reverbGainNode.gain.value = 0;
        this.createReverbImpulse();
        
        // Create bass boost (low shelf filter)
        this.bassBoostNode = this.audioContext.createBiquadFilter();
        this.bassBoostNode.type = 'lowshelf';
        this.bassBoostNode.frequency.value = 200;
        this.bassBoostNode.gain.value = 0;
        
        // Create dry/wet mix for reverb
        this.dryGainNode = this.audioContext.createGain();
        this.dryGainNode.gain.value = 1;
    }
    
    setupAudioElement() {
        // Connect audio element to Web Audio API
        if (!this.sourceNode) {
            this.sourceNode = this.audioContext.createMediaElementSource(this.audioElement);
            
            // Audio routing: source -> bass boost -> dry/wet split
            this.sourceNode.connect(this.bassBoostNode);
            
            // Dry path
            this.bassBoostNode.connect(this.dryGainNode);
            this.dryGainNode.connect(this.gainNode);
            
            // Wet path (reverb)
            this.bassBoostNode.connect(this.convolverNode);
            this.convolverNode.connect(this.reverbGainNode);
            this.reverbGainNode.connect(this.gainNode);
            
            // Final output
            this.gainNode.connect(this.analyserNode);
            this.analyserNode.connect(this.audioContext.destination);
        }
        
        // Audio element event listeners
        this.audioElement.addEventListener('timeupdate', () => this.updateProgress());
        this.audioElement.addEventListener('ended', () => this.onTrackEnded());
        this.audioElement.addEventListener('loadedmetadata', () => this.updateTotalTime());
    }
    
    createReverbImpulse() {
        // Create a simple reverb impulse response
        const sampleRate = this.audioContext.sampleRate;
        const length = sampleRate * 2; // 2 seconds
        const impulse = this.audioContext.createBuffer(2, length, sampleRate);
        
        for (let channel = 0; channel < 2; channel++) {
            const channelData = impulse.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
            }
        }
        
        this.convolverNode.buffer = impulse;
    }
    
    setupEventListeners() {
        // File input
        document.getElementById('fileInput').addEventListener('change', (e) => {
            this.addFiles(e.target.files);
        });
        const fileContainer = document.querySelector('.file-input-section');
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(
           eventName => fileContainer.addEventListener(eventName, (e) => {
              e.preventDefault();
              e.stopPropagation();
           }, false)
        );
        fileContainer.addEventListener('dragenter', (e) => fileContainer.classList.add('highlight'), false);
        fileContainer.addEventListener('dragover', (e) => fileContainer.classList.add('highlight'), false);
        fileContainer.addEventListener('dragleave', (e) => fileContainer.classList.remove('highlight'), false);
        fileContainer.addEventListener('drop', (e) => {
           fileContainer.classList.remove('highlight');
           const dt = e.dataTransfer;
           const files = dt.files;
           if (!files) return;
           this.addFiles(files);
        }, false);
        
        // Playback controls
        document.getElementById('playBtn').addEventListener('click', () => this.play());
        document.getElementById('pauseBtn').addEventListener('click', () => this.pause());
        document.getElementById('stopBtn').addEventListener('click', () => this.stop());
        document.getElementById('prevBtn').addEventListener('click', () => this.previous());
        document.getElementById('nextBtn').addEventListener('click', () => this.next());
        
        // Mode buttons
        document.getElementById('loopListBtn').addEventListener('click', () => this.toggleMode('loopList'));
        document.getElementById('loopOneBtn').addEventListener('click', () => this.toggleMode('loopOne'));
        document.getElementById('randomBtn').addEventListener('click', () => this.toggleMode('random'));
        
        // FX controls
        document.getElementById('volumeAmount').addEventListener('input', (e) => {
            this.setVolume(e.target.value);
            document.getElementById('volumeValue').textContent = e.target.value + '%';
        });

        document.getElementById('reverbAmount').addEventListener('input', (e) => {
            this.setReverb(e.target.value);
            document.getElementById('reverbValue').textContent = e.target.value + '%';
        });
        
        document.getElementById('bassBoost').addEventListener('input', (e) => {
            this.setBassBoost(e.target.value);
            document.getElementById('bassValue').textContent = e.target.value + 'dB';
        });
        
        // Visualizer toggle
        document.getElementById('visualizerBtn').addEventListener('click', () => {
            this.toggleVisualizer();
        });
        
        // Progress bar click
        document.getElementById('progressBar').addEventListener('click', (e) => {
            const rect = e.target.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            this.seek(percent);
        });
    }
    
    addFiles(files) {
        for (let file of files) {
            if (file.type.startsWith('audio/')) {
                const url = URL.createObjectURL(file);
                this.playlist.push({
                    name: file.name,
                    url: url,
                    file: file
                });
            }
        }
        this.renderPlaylist();
        
        // Auto-play first song if playlist was empty
        if (this.currentIndex === -1 && this.playlist.length > 0) {
            this.loadTrack(0);
        }
    }
    
    renderPlaylist() {
        const playlistEl = document.getElementById('playlist');
        
        if (this.playlist.length === 0) {
            playlistEl.innerHTML = '<div class="empty-playlist">No songs in playlist. Add some music!</div>';
            return;
        }
        
        playlistEl.innerHTML = '';
        this.playlist.forEach((track, index) => {
            const item = document.createElement('div');
            item.className = 'playlist-item' + (index === this.currentIndex ? ' active' : '');
            
            const name = document.createElement('span');
            name.textContent = track.name;
            
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-btn';
            removeBtn.textContent = '✕';
            removeBtn.onclick = (e) => {
                e.stopPropagation();
                this.removeTrack(index);
            };
            
            item.appendChild(name);
            item.appendChild(removeBtn);
            item.onclick = () => this.loadTrack(index);
            
            playlistEl.appendChild(item);
        });
    }
    
    removeTrack(index) {
        // Revoke object URL to free memory
        URL.revokeObjectURL(this.playlist[index].url);
        
        this.playlist.splice(index, 1);
        
        if (index === this.currentIndex) {
            this.stop();
            this.currentIndex = -1;
        } else if (index < this.currentIndex) {
            this.currentIndex--;
        }
        
        this.renderPlaylist();
    }
    
    loadTrack(index) {
        if (index < 0 || index >= this.playlist.length) return;
        
        this.currentIndex = index;
        const track = this.playlist[index];
        this.audioElement.src = track.url;
        this.renderPlaylist();
    }
    
    play() {
        // Resume audio context if suspended
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        
        if (this.currentIndex === -1 && this.playlist.length > 0) {
            this.loadTrack(0);
        }
        
        if (this.audioElement.src) {
            this.audioElement.play();
        }
    }
    
    pause() {
        this.audioElement.pause();
    }
    
    stop() {
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
        this.updateProgress();
    }
    
    next() {
        if (this.playlist.length === 0) return;
        
        let nextIndex;
        if (this.modes.random) {
            nextIndex = Math.floor(Math.random() * this.playlist.length);
        } else {
            nextIndex = (this.currentIndex + 1) % this.playlist.length;
        }
        
        this.loadTrack(nextIndex);
        this.play();
    }
    
    previous() {
        if (this.playlist.length === 0) return;
        
        let prevIndex;
        if (this.modes.random) {
            prevIndex = Math.floor(Math.random() * this.playlist.length);
        } else {
            prevIndex = (this.currentIndex - 1 + this.playlist.length) % this.playlist.length;
        }
        
        this.loadTrack(prevIndex);
        this.play();
    }
    
    onTrackEnded() {
        if (this.modes.loopOne) {
            this.audioElement.currentTime = 0;
            this.play();
        } else if (this.modes.loopList || this.modes.random) {
            this.next();
        } else if (this.currentIndex < this.playlist.length - 1) {
            this.next();
        }
    }
    
    toggleMode(mode) {
        // Turn off other modes
        if (mode === 'loopOne' || mode === 'loopList') {
            this.modes.loopOne = false;
            this.modes.loopList = false;
        }
        
        this.modes[mode] = !this.modes[mode];
        
        // Update button states
        document.getElementById('loopListBtn').classList.toggle('active', this.modes.loopList);
        document.getElementById('loopOneBtn').classList.toggle('active', this.modes.loopOne);
        document.getElementById('randomBtn').classList.toggle('active', this.modes.random);
    }

    setVolume(value) {
        const amount = value / 100;
        this.audioElement.volume = amount;
    }
    
    setReverb(value) {
        const amount = value / 100;
        this.fx.reverbAmount = amount;
        this.reverbGainNode.gain.value = amount;
        this.dryGainNode.gain.value = 1 - (amount * 0.5); // Reduce dry signal slightly
    }
    
    setBassBoost(value) {
        this.fx.bassBoost = value;
        this.bassBoostNode.gain.value = value;
    }
    
    seek(percent) {
        if (this.audioElement.duration) {
            this.audioElement.currentTime = this.audioElement.duration * percent;
        }
    }
    
    updateProgress() {
        const current = this.audioElement.currentTime;
        const duration = this.audioElement.duration || 0;
        
        // Update time display
        document.getElementById('currentTime').textContent = this.formatTime(current);
        
        // Update progress bar
        const percent = duration ? (current / duration) * 100 : 0;
        document.getElementById('progressFill').style.width = percent + '%';
    }
    
    updateTotalTime() {
        const duration = this.audioElement.duration || 0;
        document.getElementById('totalTime').textContent = this.formatTime(duration);
    }
    
    formatTime(seconds) {
        if (!seconds || isNaN(seconds)) return '0:00';
        
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return mins + ':' + (secs < 10 ? '0' : '') + secs;
    }
    
    toggleVisualizer() {
        this.visualizerEnabled = !this.visualizerEnabled;
        const btn = document.getElementById('visualizerBtn');
        btn.textContent = `📊 ${this.visualizerEnabled ? 'ON' : 'OFF'}`;
        btn.classList.toggle('active', this.visualizerEnabled);
        
        if (this.visualizerEnabled) {
            this.startVisualization();
        } else {
            this.stopVisualization();
        }
    }
    
    startVisualization() {
        const canvas = document.getElementById('visualizer');
        canvas.style.display = 'block';
        const ctx = canvas.getContext('2d');
        
        // Set canvas size
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        
        const bufferLength = this.analyserNode.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        const draw = () => {
            if (!this.visualizerEnabled) return;
            
            this.animationId = requestAnimationFrame(draw);
            
            this.analyserNode.getByteFrequencyData(dataArray);
            
            // Clear canvas
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw bars
            const barWidth = (canvas.width / bufferLength) * 2.5;
            let barHeight;
            let x = 0;
            
            for (let i = 0; i < bufferLength; i++) {
                barHeight = (dataArray[i] / 255) * canvas.height * 0.8;
                
                // Create gradient for each bar
                const gradient = ctx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height);
                gradient.addColorStop(0, '#667eea');
                gradient.addColorStop(0.5, '#764ba2');
                gradient.addColorStop(1, '#f093fb');
                
                ctx.fillStyle = gradient;
                ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
                
                x += barWidth + 1;
            }
        };
        
        draw();
    }
    
    stopVisualization() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        // Clear canvas
        const canvas = document.getElementById('visualizer');
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        canvas.style.display = 'none';
    }
}

// Initialize the music player when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const player = new MusicPlayer();
    
    // Make player globally accessible for debugging
    window.musicPlayer = player;
});
