// 3D Mockup Studio UI Logic
class MockupStudio {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.mockupMesh = null;
        this.shadowPlane = null;
        this.frameTexture = null;
        this.currentTemplate = 'iphone-straight';

        this.init();
        this.setupEventListeners();
    }

    init() {
        try {
            // Initialize Three.js scene
            this.setupScene();
            this.setupCamera();
            this.setupRenderer();
            this.setupLights();
            this.setupControls();
            this.createDefaultMockup();
            this.animate();

            console.log('3D Mockup Studio initialized successfully');
        } catch (error) {
            console.error('Failed to initialize 3D scene:', error);
            this.showError('Ошибка инициализации 3D сцены. Проверьте поддержку WebGL.');
        }
    }

    showError(message) {
        const container = document.getElementById('canvasContainer');
        container.innerHTML = `
            <div class="canvas-placeholder">
                <div style="color: #ff4444; text-align: center;">
                    <div style="font-size: 16px; margin-bottom: 8px;">⚠️</div>
                    <div>${message}</div>
                </div>
            </div>
        `;
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf5f7fa);
    }

    setupCamera() {
        const container = document.getElementById('canvasContainer');
        const aspect = container.clientWidth / container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
        this.camera.position.set(0, 0, 5);
    }

    setupRenderer() {
        const container = document.getElementById('canvasContainer');

        // Clear placeholder
        container.innerHTML = '';

        // Create renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            preserveDrawingBuffer: true,
            alpha: false
        });

        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.setClearColor(0xf5f7fa, 1);
        this.renderer.outputEncoding = THREE.sRGBEncoding;

        // Add canvas to container
        this.renderer.domElement.style.width = '100%';
        this.renderer.domElement.style.height = '100%';
        this.renderer.domElement.style.display = 'block';
        container.appendChild(this.renderer.domElement);
    }

    setupLights() {
        // Ambient light for overall illumination
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);

        // Main directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
        directionalLight.position.set(5, 8, 3);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.1;
        directionalLight.shadow.camera.far = 50;
        directionalLight.shadow.camera.left = -10;
        directionalLight.shadow.camera.right = 10;
        directionalLight.shadow.camera.top = 10;
        directionalLight.shadow.camera.bottom = -10;
        this.scene.add(directionalLight);

        // Fill light from the opposite side
        const fillLight = new THREE.DirectionalLight(0x87ceeb, 0.3);
        fillLight.position.set(-3, 2, -2);
        this.scene.add(fillLight);

        // Rim light for edge definition
        const rimLight = new THREE.DirectionalLight(0xffffff, 0.5);
        rimLight.position.set(-5, 5, -5);
        this.scene.add(rimLight);
    }

    setupControls() {
        if (typeof THREE.OrbitControls !== 'undefined') {
            this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.05;
            this.controls.enableZoom = true;
            this.controls.enablePan = true;
        } else {
            console.warn('OrbitControls not loaded, using basic camera controls');
        }
    }

    createDefaultMockup() {
        // Create simple plane mockup
        const geometry = new THREE.PlaneGeometry(1.5, 3);
        const material = new THREE.MeshLambertMaterial({
            color: 0xe8eaed,
            side: THREE.DoubleSide
        });

        this.mockupMesh = new THREE.Mesh(geometry, material);
        this.mockupMesh.castShadow = true;
        this.mockupMesh.rotation.x = -0.1;
        this.mockupMesh.rotation.y = 0.2;
        this.scene.add(this.mockupMesh);

        // Create shadow plane
        this.createShadowPlane();
    }

    createShadowPlane() {
        const shadowGeometry = new THREE.PlaneGeometry(10, 10);
        const shadowMaterial = new THREE.ShadowMaterial({ opacity: 0.3 });

        this.shadowPlane = new THREE.Mesh(shadowGeometry, shadowMaterial);
        this.shadowPlane.rotation.x = -Math.PI / 2;
        this.shadowPlane.position.y = -2;
        this.shadowPlane.receiveShadow = true;
        this.scene.add(this.shadowPlane);
    }

    updateMockupTemplate(template) {
        this.currentTemplate = template;

        if (!this.mockupMesh) return;

        // Remove current mockup
        this.scene.remove(this.mockupMesh);

        let geometry, material;

        switch (template) {
            case 'iphone-straight':
                geometry = new THREE.PlaneGeometry(1.5, 3);
                material = this.createMockupMaterial();
                this.mockupMesh = new THREE.Mesh(geometry, material);
                break;

            case 'iphone-angled':
                geometry = new THREE.PlaneGeometry(1.5, 3);
                material = this.createMockupMaterial();
                this.mockupMesh = new THREE.Mesh(geometry, material);
                this.mockupMesh.rotation.x = -0.2;
                this.mockupMesh.rotation.y = 0.3;
                break;

            case 'macbook':
                geometry = new THREE.PlaneGeometry(4, 2.5);
                material = this.createMockupMaterial();
                this.mockupMesh = new THREE.Mesh(geometry, material);
                this.mockupMesh.rotation.x = -0.1;
                break;

            case 'poster':
                geometry = new THREE.PlaneGeometry(2, 3);
                material = this.createMockupMaterial();
                this.mockupMesh = new THREE.Mesh(geometry, material);
                break;

            case 'custom':
                geometry = new THREE.PlaneGeometry(3, 2);
                material = this.createMockupMaterial();
                this.mockupMesh = new THREE.Mesh(geometry, material);
                break;
        }

        this.mockupMesh.castShadow = true;
        this.scene.add(this.mockupMesh);
    }

    createMockupMaterial() {
        if (this.frameTexture) {
            return new THREE.MeshLambertMaterial({
                map: this.frameTexture,
                side: THREE.DoubleSide
            });
        } else {
            return new THREE.MeshLambertMaterial({
                color: 0xcccccc,
                side: THREE.DoubleSide
            });
        }
    }

    loadFrameTexture(imageData) {
        const loader = new THREE.TextureLoader();
        loader.load(imageData, (texture) => {
            this.frameTexture = texture;
            this.frameTexture.flipY = false;

            if (this.mockupMesh) {
                this.mockupMesh.material.map = this.frameTexture;
                this.mockupMesh.material.needsUpdate = true;
            }

            // Enable export button
            document.getElementById('exportMockup').disabled = false;
        });
    }

    updateBackgroundColor(color) {
        this.scene.background = new THREE.Color(color);
    }

    updateRotation(x, y, z) {
        if (this.mockupMesh) {
            this.mockupMesh.rotation.x = (x * Math.PI) / 180;
            this.mockupMesh.rotation.y = (y * Math.PI) / 180;
            this.mockupMesh.rotation.z = (z * Math.PI) / 180;
        }
    }

    updateZoom(zoom) {
        this.camera.position.multiplyScalar(1 / this.currentZoom || 1);
        this.camera.position.multiplyScalar(zoom);
        this.currentZoom = zoom;
    }

    toggleShadow(enabled) {
        if (this.shadowPlane) {
            this.shadowPlane.visible = enabled;
        }
    }

    exportMockup() {
        // Render the scene to get image data
        this.renderer.render(this.scene, this.camera);
        const imageData = this.renderer.domElement.toDataURL('image/png');

        // Send to Figma
        parent.postMessage({
            pluginMessage: {
                type: 'create-mockup',
                imageData: imageData
            }
        }, '*');
    }

    animate() {
        if (!this.renderer || !this.scene || !this.camera) {
            return;
        }

        requestAnimationFrame(() => this.animate());

        if (this.controls) {
            this.controls.update();
        }

        this.renderer.render(this.scene, this.camera);
    }

    setupEventListeners() {
        // Export frame button
        document.getElementById('exportBtn').addEventListener('click', () => {
            parent.postMessage({
                pluginMessage: { type: 'export-frame' }
            }, '*');
        });

        // Export mockup button
        document.getElementById('exportMockup').addEventListener('click', () => {
            this.exportMockup();
        });

        // Device template selector
        document.getElementById('deviceTemplate').addEventListener('change', (e) => {
            this.updateMockupTemplate(e.target.value);
        });

        // Background color
        document.getElementById('backgroundColor').addEventListener('input', (e) => {
            this.updateBackgroundColor(e.target.value);
        });

        // Rotation controls
        document.getElementById('rotationX').addEventListener('input', (e) => {
            const y = document.getElementById('rotationY').value;
            const z = document.getElementById('rotationZ').value;
            this.updateRotation(e.target.value, y, z);
        });

        document.getElementById('rotationY').addEventListener('input', (e) => {
            const x = document.getElementById('rotationX').value;
            const z = document.getElementById('rotationZ').value;
            this.updateRotation(x, e.target.value, z);
        });

        document.getElementById('rotationZ').addEventListener('input', (e) => {
            const x = document.getElementById('rotationX').value;
            const y = document.getElementById('rotationY').value;
            this.updateRotation(x, y, e.target.value);
        });

        // Zoom control
        document.getElementById('zoom').addEventListener('input', (e) => {
            this.updateZoom(parseFloat(e.target.value));
        });

        // Shadow toggle
        document.getElementById('shadowEnabled').addEventListener('change', (e) => {
            this.toggleShadow(e.target.checked);
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            const container = document.getElementById('canvasContainer');
            const aspect = container.clientWidth / container.clientHeight;

            this.camera.aspect = aspect;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(container.clientWidth, container.clientHeight);
        });
    }
}

// Message handling from Figma
window.onmessage = (event) => {
    const msg = event.data.pluginMessage;

    if (msg.type === 'loading') {
        showStatus(msg.message, 'loading');
    }

    if (msg.type === 'frame-exported') {
        // Show frame info
        const frameInfo = document.getElementById('frameInfo');
        const frameSize = document.getElementById('frameSize');
        frameSize.textContent = `${msg.name}: ${Math.round(msg.width)} × ${Math.round(msg.height)}px`;
        frameInfo.classList.remove('hidden');

        // Load texture into 3D scene
        mockupStudio.loadFrameTexture(msg.data);

        showStatus('Дизайн успешно загружен!', 'success');
    }

    if (msg.type === 'success') {
        showStatus(msg.message, 'success');
    }

    if (msg.type === 'error') {
        showStatus(msg.message, 'error');
    }
};

function showStatus(message, type) {
    const status = document.getElementById('status');
    status.textContent = message;
    status.className = `status ${type}`;
    status.classList.remove('hidden');

    setTimeout(() => {
        status.classList.add('hidden');
    }, 3000);
}

// Initialize the mockup studio when page loads
let mockupStudio;

// Wait for Three.js to load
function initializeWhenReady() {
    if (typeof THREE !== 'undefined') {
        console.log('Three.js loaded, initializing mockup studio...');
        try {
            mockupStudio = new MockupStudio();
        } catch (error) {
            console.error('Failed to initialize MockupStudio:', error);
            showFallbackUI();
        }
    } else {
        console.log('Waiting for Three.js to load...');
        setTimeout(initializeWhenReady, 100);
    }
}

function showFallbackUI() {
    const container = document.getElementById('canvasContainer');
    container.innerHTML = `
        <div class="canvas-placeholder">
            <div class="canvas-placeholder-text" style="color: #ff4444;">
                ❌ Ошибка загрузки 3D движка<br>
                <small>Проверьте подключение к интернету</small>
            </div>
        </div>
    `;
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, checking Three.js...');
    initializeWhenReady();
});