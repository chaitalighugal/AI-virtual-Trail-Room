// Virtual Try-On JavaScript
class VirtualTryOn {
    constructor() {
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.overlay = document.getElementById('clothing-overlay');
        this.stream = null;
        this.currentCamera = 'user'; // 'user' for front camera, 'environment' for back
        this.screenshots = [];
        this.currentOverlay = null;
        
        this.initializeElements();
        this.bindEvents();
        this.initializeControls();
    }

    initializeElements() {
        // Get all necessary DOM elements
        this.startCameraBtn = document.getElementById('start-camera');
        this.stopCameraBtn = document.getElementById('stop-camera');
        this.screenshotBtn = document.getElementById('take-screenshot');
        this.switchCameraBtn = document.getElementById('switch-camera');
        this.imageUpload = document.getElementById('image-upload');
        this.loadingMessage = document.getElementById('loading-message');
        this.errorMessage = document.getElementById('error-message');
        this.successMessage = document.getElementById('success-message');
        this.errorText = document.getElementById('error-text');
        this.successText = document.getElementById('success-text');
        this.screenshotsGrid = document.getElementById('screenshots-grid');
        this.clearScreenshotsBtn = document.getElementById('clear-screenshots');
        this.downloadAllBtn = document.getElementById('download-all');
        this.opacitySlider = document.getElementById('overlay-opacity');
        this.sizeSlider = document.getElementById('overlay-size');
        this.opacityValue = document.getElementById('opacity-value');
        this.sizeValue = document.getElementById('size-value');
        this.resetOverlayBtn = document.getElementById('reset-overlay');
        this.removeOverlayBtn = document.getElementById('remove-overlay');
    }

    bindEvents() {
        // Camera controls
        this.startCameraBtn.addEventListener('click', () => this.startCamera());
        this.stopCameraBtn.addEventListener('click', () => this.stopCamera());
        this.screenshotBtn.addEventListener('click', () => this.takeScreenshot());
        this.switchCameraBtn.addEventListener('click', () => this.switchCamera());
        
        // Image upload
        this.imageUpload.addEventListener('change', (e) => this.handleImageUpload(e));
        
        // Category tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchCategory(e.target.dataset.category));
        });
        
        // Try-on buttons
        document.querySelectorAll('.try-on-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.tryOnItem(e.target.dataset.item));
        });
        
        // Overlay controls
        this.opacitySlider.addEventListener('input', (e) => this.updateOpacity(e.target.value));
        this.sizeSlider.addEventListener('input', (e) => this.updateSize(e.target.value));
        this.resetOverlayBtn.addEventListener('click', () => this.resetOverlay());
        this.removeOverlayBtn.addEventListener('click', () => this.removeOverlay());
        
        // Screenshot controls
        this.clearScreenshotsBtn.addEventListener('click', () => this.clearScreenshots());
        this.downloadAllBtn.addEventListener('click', () => this.downloadAllScreenshots());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }

    initializeControls() {
        // Set initial values
        this.updateOpacity(this.opacitySlider.value);
        this.updateSize(this.sizeSlider.value);
        
        // Show default category
        this.switchCategory('tops');
    }

    async startCamera() {
        try {
            this.showLoading('Initializing camera...');
            
            const constraints = {
                video: {
                    facingMode: this.currentCamera,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            };

            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = this.stream;
            
            this.video.onloadedmetadata = () => {
                this.canvas.width = this.video.videoWidth;
                this.canvas.height = this.video.videoHeight;
                this.hideMessages();
                this.showSuccess('Camera started successfully!');
                this.updateCameraControls(true);
            };
            
        } catch (error) {
            console.error('Error accessing camera:', error);
            this.showError(this.getCameraErrorMessage(error));
        }
    }

    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
            this.video.srcObject = null;
            this.updateCameraControls(false);
            this.showSuccess('Camera stopped');
        }
    }

    async switchCamera() {
        if (this.stream) {
            this.currentCamera = this.currentCamera === 'user' ? 'environment' : 'user';
            this.stopCamera();
            await this.startCamera();
        }
    }

    updateCameraControls(cameraActive) {
        this.startCameraBtn.style.display = cameraActive ? 'none' : 'inline-block';
        this.stopCameraBtn.style.display = cameraActive ? 'inline-block' : 'none';
        this.screenshotBtn.style.display = cameraActive ? 'inline-block' : 'none';
        this.switchCameraBtn.style.display = cameraActive ? 'inline-block' : 'none';
    }

    handleImageUpload(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.video.style.display = 'none';
                this.canvas.style.display = 'block';
                
                const img = new Image();
                img.onload = () => {
                    this.canvas.width = img.width;
                    this.canvas.height = img.height;
                    this.ctx.drawImage(img, 0, 0);
                    this.updateCameraControls(false);
                    this.screenshotBtn.style.display = 'inline-block';
                    this.showSuccess('Image uploaded successfully!');
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    }

    switchCategory(category) {
        // Update active tab
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-category="${category}"]`).classList.add('active');
        
        // Show/hide clothing items
        document.querySelectorAll('.clothing-item').forEach(item => {
            if (item.dataset.category === category) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    }

    tryOnItem(itemId) {
        // Remove previous selection
        document.querySelectorAll('.clothing-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        // Add selection to current item
        const selectedItem = document.querySelector(`[data-item="${itemId}"]`).closest('.clothing-item');
        selectedItem.classList.add('selected');
        
        // Create overlay (using placeholder since we don't have actual overlay images)
        this.createOverlay(itemId);
        this.currentOverlay = itemId;
        
        this.showSuccess(`Trying on ${itemId.replace('-', ' ')}!`);
    }

    createOverlay(itemId) {
        // Since we don't have actual overlay images, we'll create a visual placeholder
        this.overlay.style.display = 'block';
        
        // Create a colored rectangle as placeholder overlay
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 300;
        const ctx = canvas.getContext('2d');
        
        // Different colors for different items
        const colors = {
            'red-tshirt': '#ff4444',
            'blue-shirt': '#4444ff',
            'black-hoodie': '#333333',
            'blue-jeans': '#6666ff',
            'black-pants': '#222222',
            'summer-dress': '#ffaa44',
            'evening-dress': '#aa44ff',
            'sunglasses': '#444444',
            'cap': '#ff6644'
        };
        
        ctx.fillStyle = colors[itemId] || '#667eea';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add some text
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(itemId.replace('-', ' ').toUpperCase(), canvas.width/2, canvas.height/2);
        
        this.overlay.src = canvas.toDataURL();
        this.resetOverlay();
    }

    updateOpacity(value) {
        this.opacityValue.textContent = value + '%';
        if (this.overlay.style.display === 'block') {
            this.overlay.style.opacity = value / 100;
        }
    }

    updateSize(value) {
        this.sizeValue.textContent = value + '%';
        if (this.overlay.style.display === 'block') {
            this.overlay.style.transform = `translate(-50%, -50%) scale(${value / 100})`;
        }
    }

    resetOverlay() {
        this.opacitySlider.value = 80;
        this.sizeSlider.value = 100;
        this.updateOpacity(80);
        this.updateSize(100);
    }

    removeOverlay() {
        this.overlay.style.display = 'none';
        this.currentOverlay = null;
        
        // Remove selection from all items
        document.querySelectorAll('.clothing-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        this.showSuccess('Overlay removed');
    }

    takeScreenshot() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (this.video.style.display !== 'none' && this.stream) {
            // Screenshot from video
            canvas.width = this.video.videoWidth;
            canvas.height = this.video.videoHeight;
            ctx.drawImage(this.video, 0, 0);
        } else {
            // Screenshot from uploaded image
            canvas.width = this.canvas.width;
            canvas.height = this.canvas.height;
            ctx.drawImage(this.canvas, 0, 0);
        }
        
        // Add overlay if present
        if (this.overlay.style.display === 'block') {
            const overlayImg = new Image();
            overlayImg.onload = () => {
                const overlayWidth = overlayImg.width * (this.sizeSlider.value / 100);
                const overlayHeight = overlayImg.height * (this.sizeSlider.value / 100);
                const x = (canvas.width - overlayWidth) / 2;
                const y = (canvas.height - overlayHeight) / 2;
                
                ctx.globalAlpha = this.opacitySlider.value / 100;
                ctx.drawImage(overlayImg, x, y, overlayWidth, overlayHeight);
                ctx.globalAlpha = 1;
                
                this.saveScreenshot(canvas.toDataURL());
            };
            overlayImg.src = this.overlay.src;
        } else {
            this.saveScreenshot(canvas.toDataURL());
        }
    }

    saveScreenshot(dataUrl) {
        const timestamp = new Date().toLocaleString();
        const screenshot = {
            id: Date.now(),
            dataUrl: dataUrl,
            timestamp: timestamp,
            overlay: this.currentOverlay
        };
        
        this.screenshots.push(screenshot);
        this.updateScreenshotsGrid();
        this.showSuccess('Screenshot saved!');
    }

    updateScreenshotsGrid() {
        const grid = this.screenshotsGrid;
        
        if (this.screenshots.length === 0) {
            grid.innerHTML = `
                <div class="no-screenshots">
                    <i class="fas fa-camera fa-2x"></i>
                    <p>No screenshots yet. Take some photos to see them here!</p>
                </div>
            `;
            this.clearScreenshotsBtn.style.display = 'none';
            this.downloadAllBtn.style.display = 'none';
        } else {
            grid.innerHTML = this.screenshots.map(screenshot => `
                <div class="screenshot-item" data-id="${screenshot.id}">
                    <img src="${screenshot.dataUrl}" alt="Screenshot">
                    <button class="delete-btn" onclick="virtualTryOn.deleteScreenshot(${screenshot.id})">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `).join('');
            
            this.clearScreenshotsBtn.style.display = 'inline-block';
            this.downloadAllBtn.style.display = 'inline-block';
        }
    }

    deleteScreenshot(id) {
        this.screenshots = this.screenshots.filter(screenshot => screenshot.id !== id);
        this.updateScreenshotsGrid();
        this.showSuccess('Screenshot deleted');
    }

    clearScreenshots() {
        if (confirm('Are you sure you want to delete all screenshots?')) {
            this.screenshots = [];
            this.updateScreenshotsGrid();
            this.showSuccess('All screenshots cleared');
        }
    }

    downloadAllScreenshots() {
        if (this.screenshots.length === 0) return;
        
        this.screenshots.forEach((screenshot, index) => {
            const link = document.createElement('a');
            link.download = `virtualfit-screenshot-${index + 1}.png`;
            link.href = screenshot.dataUrl;
            link.click();
        });
        
        this.showSuccess(`Downloaded ${this.screenshots.length} screenshots`);
    }

    handleKeyboard(event) {
        switch(event.key) {
            case ' ': // Spacebar
                event.preventDefault();
                if (this.stream || this.canvas.style.display === 'block') {
                    this.takeScreenshot();
                }
                break;
            case 'Escape':
                this.removeOverlay();
                break;
            case 'c':
            case 'C':
                if (event.ctrlKey) {
                    event.preventDefault();
                    if (!this.stream) {
                        this.startCamera();
                    }
                }
                break;
        }
    }

    getCameraErrorMessage(error) {
        switch(error.name) {
            case 'NotAllowedError':
                return 'Camera access denied. Please allow camera permissions and try again.';
            case 'NotFoundError':
                return 'No camera found. Please connect a camera and try again.';
            case 'NotSupportedError':
                return 'Camera not supported by this browser.';
            case 'NotReadableError':
                return 'Camera is being used by another application.';
            default:
                return 'Failed to access camera. Please try again.';
        }
    }

    showLoading(message) {
        this.hideMessages();
        this.loadingMessage.style.display = 'block';
        this.loadingMessage.querySelector('span') && (this.loadingMessage.querySelector('span').textContent = message);
    }

    showError(message) {
        this.hideMessages();
        this.errorMessage.style.display = 'block';
        this.errorText.textContent = message;
        setTimeout(() => this.hideMessages(), 5000);
    }

    showSuccess(message) {
        this.hideMessages();
        this.successMessage.style.display = 'block';
        this.successText.textContent = message;
        setTimeout(() => this.hideMessages(), 3000);
    }

    hideMessages() {
        this.loadingMessage.style.display = 'none';
        this.errorMessage.style.display = 'none';
        this.successMessage.style.display = 'none';
    }
}

// Initialize the virtual try-on when the page loads
let virtualTryOn;

document.addEventListener('DOMContentLoaded', () => {
    virtualTryOn = new VirtualTryOn();
    
    // Check for camera support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        virtualTryOn.showError('Camera not supported by this browser. Please use a modern browser like Chrome, Firefox, or Safari.');
    }
    
    console.log('Virtual Try-On initialized successfully!');
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.hidden && virtualTryOn && virtualTryOn.stream) {
        // Optionally pause camera when page is hidden
        console.log('Page hidden, camera still running');
    } else if (!document.hidden && virtualTryOn) {
        console.log('Page visible');
    }
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (virtualTryOn && virtualTryOn.stream) {
        virtualTryOn.stopCamera();
    }
});