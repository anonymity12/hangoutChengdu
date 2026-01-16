import * as THREE from 'three';

// Game configuration
const CONFIG = {
    vehicleSpeed: 0.3,
    vehicleTurnSpeed: 0.03,
    vehicleBrake: 0.95,
    cameraOffset: new THREE.Vector3(0, 8, 15),
    worldSize: 1000,
    blockSize: 50,
    buildingDensity: 0.3
};

// Chengdu landmarks
const CHENGDU_LANDMARKS = [
    { name: '天府广场', position: { x: 0, z: 0 }, color: 0xFF6B6B },
    { name: '春熙路', position: { x: 100, z: 50 }, color: 0xFFD93D },
    { name: '宽窄巷子', position: { x: -80, z: 80 }, color: 0x6BCB77 },
    { name: '武侯祠', position: { x: -120, z: -100 }, color: 0x4D96FF },
    { name: '锦里', position: { x: -100, z: -120 }, color: 0xFF6B9D },
    { name: '杜甫草堂', position: { x: -200, z: 50 }, color: 0xC1A3FF },
    { name: '人民公园', position: { x: 50, z: 150 }, color: 0x95E1D3 },
    { name: '成都东站', position: { x: 250, z: -50 }, color: 0xF38181 },
    { name: 'IFS国际金融中心', position: { x: 80, z: 20 }, color: 0xAA96DA },
    { name: '太古里', position: { x: 110, z: 30 }, color: 0xFCBF49 }
];

class Game {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.vehicle = null;
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.keys = {};
        this.touchControls = { forward: false, left: false, right: false, brake: false };
        
        // Game stats
        this.distanceTraveled = 0;
        this.gameTime = 0;
        this.lastPosition = new THREE.Vector3();
        this.lastTime = performance.now();
        
        // UI elements
        this.distanceEl = document.getElementById('distance');
        this.speedEl = document.getElementById('speed');
        this.timeEl = document.getElementById('time');
        this.locationEl = document.getElementById('location-info');
        this.loadingEl = document.getElementById('loading');
        
        this.landmarks = [];
        this.buildings = [];
        this.roads = [];
    }
    
    async init() {
        this.setupScene();
        this.setupLights();
        this.createGround();
        this.createRoadNetwork();
        this.createBuildings();
        this.createLandmarks();
        this.createVehicle();
        this.setupCamera();
        this.setupControls();
        this.setupEventListeners();
        
        // Hide loading screen
        setTimeout(() => {
            this.loadingEl.style.display = 'none';
        }, 1000);
        
        this.lastPosition.copy(this.vehicle.position);
        this.animate();
    }
    
    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);
        this.scene.fog = new THREE.Fog(0x87CEEB, 100, 500);
        
        const canvas = document.getElementById('gameCanvas');
        this.renderer = new THREE.WebGLRenderer({ 
            canvas, 
            antialias: true,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    
    setupLights() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        // Directional light (sun)
        const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
        sunLight.position.set(100, 200, 100);
        sunLight.castShadow = true;
        sunLight.shadow.camera.left = -200;
        sunLight.shadow.camera.right = 200;
        sunLight.shadow.camera.top = 200;
        sunLight.shadow.camera.bottom = -200;
        sunLight.shadow.camera.near = 1;
        sunLight.shadow.camera.far = 500;
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        this.scene.add(sunLight);
    }
    
    createGround() {
        const groundGeometry = new THREE.PlaneGeometry(CONFIG.worldSize, CONFIG.worldSize);
        const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x7CFC00 });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);
    }
    
    createRoadNetwork() {
        const roadMaterial = new THREE.MeshLambertMaterial({ color: 0x444444 });
        const roadMarkingMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
        
        // Create a grid of roads
        const roadWidth = 8;
        const spacing = CONFIG.blockSize;
        const halfWorld = CONFIG.worldSize / 2;
        
        // Vertical roads
        for (let x = -halfWorld; x <= halfWorld; x += spacing) {
            const roadGeometry = new THREE.PlaneGeometry(roadWidth, CONFIG.worldSize);
            const road = new THREE.Mesh(roadGeometry, roadMaterial);
            road.rotation.x = -Math.PI / 2;
            road.position.set(x, 0.1, 0);
            road.receiveShadow = true;
            this.scene.add(road);
            this.roads.push({ x: x, z: 0, width: roadWidth, length: CONFIG.worldSize, type: 'vertical' });
            
            // Road markings
            for (let z = -halfWorld; z <= halfWorld; z += 20) {
                const markingGeometry = new THREE.PlaneGeometry(0.5, 4);
                const marking = new THREE.Mesh(markingGeometry, roadMarkingMaterial);
                marking.rotation.x = -Math.PI / 2;
                marking.position.set(x, 0.15, z);
                this.scene.add(marking);
            }
        }
        
        // Horizontal roads
        for (let z = -halfWorld; z <= halfWorld; z += spacing) {
            const roadGeometry = new THREE.PlaneGeometry(CONFIG.worldSize, roadWidth);
            const road = new THREE.Mesh(roadGeometry, roadMaterial);
            road.rotation.x = -Math.PI / 2;
            road.position.set(0, 0.1, z);
            road.receiveShadow = true;
            this.scene.add(road);
            this.roads.push({ x: 0, z: z, width: CONFIG.worldSize, length: roadWidth, type: 'horizontal' });
            
            // Road markings
            for (let x = -halfWorld; x <= halfWorld; x += 20) {
                const markingGeometry = new THREE.PlaneGeometry(4, 0.5);
                const marking = new THREE.Mesh(markingGeometry, roadMarkingMaterial);
                marking.rotation.x = -Math.PI / 2;
                marking.position.set(x, 0.15, z);
                this.scene.add(marking);
            }
        }
    }
    
    createBuildings() {
        const spacing = CONFIG.blockSize;
        const halfWorld = CONFIG.worldSize / 2;
        
        for (let x = -halfWorld + spacing / 2; x < halfWorld; x += spacing) {
            for (let z = -halfWorld + spacing / 2; z < halfWorld; z += spacing) {
                if (Math.random() > CONFIG.buildingDensity) continue;
                
                const width = 15 + Math.random() * 15;
                const depth = 15 + Math.random() * 15;
                const height = 10 + Math.random() * 40;
                
                const buildingGeometry = new THREE.BoxGeometry(width, height, depth);
                const buildingMaterial = new THREE.MeshLambertMaterial({
                    color: new THREE.Color().setHSL(Math.random() * 0.1 + 0.5, 0.3, 0.6)
                });
                const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
                building.position.set(x, height / 2, z);
                building.castShadow = true;
                building.receiveShadow = true;
                this.scene.add(building);
                this.buildings.push(building);
            }
        }
    }
    
    createLandmarks() {
        CHENGDU_LANDMARKS.forEach(landmark => {
            const landmarkGroup = new THREE.Group();
            
            // Base building
            const baseGeometry = new THREE.BoxGeometry(20, 30, 20);
            const baseMaterial = new THREE.MeshLambertMaterial({ color: landmark.color });
            const base = new THREE.Mesh(baseGeometry, baseMaterial);
            base.position.y = 15;
            base.castShadow = true;
            landmarkGroup.add(base);
            
            // Top marker
            const markerGeometry = new THREE.ConeGeometry(5, 10, 4);
            const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xFFD700 });
            const marker = new THREE.Mesh(markerGeometry, markerMaterial);
            marker.position.y = 35;
            landmarkGroup.add(marker);
            
            // Rotating ring
            const ringGeometry = new THREE.TorusGeometry(8, 0.5, 8, 32);
            const ringMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
            const ring = new THREE.Mesh(ringGeometry, ringMaterial);
            ring.rotation.x = Math.PI / 2;
            ring.position.y = 30;
            landmarkGroup.add(ring);
            
            landmarkGroup.position.set(landmark.position.x, 0, landmark.position.z);
            this.scene.add(landmarkGroup);
            
            this.landmarks.push({
                name: landmark.name,
                position: new THREE.Vector3(landmark.position.x, 0, landmark.position.z),
                mesh: landmarkGroup,
                ring: ring
            });
        });
    }
    
    createVehicle() {
        const vehicleGroup = new THREE.Group();
        
        // Body
        const bodyGeometry = new THREE.BoxGeometry(3, 1.5, 5);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0xFF4444 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 1;
        body.castShadow = true;
        vehicleGroup.add(body);
        
        // Cabin
        const cabinGeometry = new THREE.BoxGeometry(2.5, 1.2, 2.5);
        const cabinMaterial = new THREE.MeshLambertMaterial({ color: 0x4444FF });
        const cabin = new THREE.Mesh(cabinGeometry, cabinMaterial);
        cabin.position.y = 2;
        cabin.position.z = -0.5;
        cabin.castShadow = true;
        vehicleGroup.add(cabin);
        
        // Wheels
        const wheelGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.4, 16);
        const wheelMaterial = new THREE.MeshLambertMaterial({ color: 0x222222 });
        
        const wheelPositions = [
            { x: 1.5, y: 0.5, z: 1.5 },
            { x: -1.5, y: 0.5, z: 1.5 },
            { x: 1.5, y: 0.5, z: -1.5 },
            { x: -1.5, y: 0.5, z: -1.5 }
        ];
        
        wheelPositions.forEach(pos => {
            const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(pos.x, pos.y, pos.z);
            wheel.castShadow = true;
            vehicleGroup.add(wheel);
        });
        
        vehicleGroup.position.set(0, 0, 0);
        this.scene.add(vehicleGroup);
        this.vehicle = vehicleGroup;
    }
    
    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.updateCamera();
    }
    
    updateCamera() {
        const cameraPosition = new THREE.Vector3();
        cameraPosition.copy(this.vehicle.position);
        cameraPosition.add(CONFIG.cameraOffset);
        
        this.camera.position.lerp(cameraPosition, 0.1);
        this.camera.lookAt(this.vehicle.position);
    }
    
    setupControls() {
        // Keyboard controls
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            if (e.key.toLowerCase() === 'r') {
                this.resetVehicle();
            }
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
        
        // Touch controls
        const setupTouchButton = (id, control) => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    this.touchControls[control] = true;
                });
                btn.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    this.touchControls[control] = false;
                });
            }
        };
        
        setupTouchButton('btn-forward', 'forward');
        setupTouchButton('btn-left', 'left');
        setupTouchButton('btn-right', 'right');
        setupTouchButton('btn-brake', 'brake');
    }
    
    setupEventListeners() {
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }
    
    resetVehicle() {
        this.vehicle.position.set(0, 0, 0);
        this.vehicle.rotation.y = 0;
        this.velocity.set(0, 0, 0);
    }
    
    updateVehicle(deltaTime) {
        // Get controls
        const forward = this.keys['w'] || this.keys['arrowup'] || this.touchControls.forward;
        const left = this.keys['a'] || this.keys['arrowleft'] || this.touchControls.left;
        const right = this.keys['d'] || this.keys['arrowright'] || this.touchControls.right;
        const brake = this.keys[' '] || this.touchControls.brake;
        
        // Apply acceleration
        if (forward) {
            const direction = new THREE.Vector3(0, 0, -1);
            direction.applyQuaternion(this.vehicle.quaternion);
            direction.multiplyScalar(CONFIG.vehicleSpeed);
            this.velocity.add(direction);
        }
        
        // Apply turning
        if (left && this.velocity.length() > 0.1) {
            this.vehicle.rotation.y += CONFIG.vehicleTurnSpeed;
        }
        if (right && this.velocity.length() > 0.1) {
            this.vehicle.rotation.y -= CONFIG.vehicleTurnSpeed;
        }
        
        // Apply brake/friction
        const frictionFactor = brake ? 0.9 : CONFIG.vehicleBrake;
        this.velocity.multiplyScalar(frictionFactor);
        
        // Update position
        this.vehicle.position.add(this.velocity);
        
        // Constrain to world bounds
        const halfWorld = CONFIG.worldSize / 2;
        this.vehicle.position.x = Math.max(-halfWorld, Math.min(halfWorld, this.vehicle.position.x));
        this.vehicle.position.z = Math.max(-halfWorld, Math.min(halfWorld, this.vehicle.position.z));
        
        // Calculate distance traveled
        const distance = this.vehicle.position.distanceTo(this.lastPosition);
        this.distanceTraveled += distance;
        this.lastPosition.copy(this.vehicle.position);
    }
    
    updateLandmarks(deltaTime) {
        this.landmarks.forEach(landmark => {
            // Rotate the ring
            landmark.ring.rotation.z += deltaTime * 2;
            
            // Check if player is near
            const distance = this.vehicle.position.distanceTo(landmark.position);
            if (distance < 30) {
                this.showLocationInfo(landmark.name);
            }
        });
    }
    
    showLocationInfo(name) {
        this.locationEl.textContent = `📍 ${name}`;
        this.locationEl.style.display = 'block';
        
        clearTimeout(this.locationTimeout);
        this.locationTimeout = setTimeout(() => {
            this.locationEl.style.display = 'none';
        }, 3000);
    }
    
    updateUI() {
        // Distance
        this.distanceEl.textContent = `${(this.distanceTraveled / 10).toFixed(2)} km`;
        
        // Speed
        const speed = Math.abs(this.velocity.length() * 100);
        this.speedEl.textContent = `${Math.round(speed)} km/h`;
        
        // Time
        const minutes = Math.floor(this.gameTime / 60);
        const seconds = Math.floor(this.gameTime % 60);
        this.timeEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        const currentTime = performance.now();
        const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1); // Cap at 0.1s to prevent large jumps
        this.lastTime = currentTime;
        this.gameTime += deltaTime;
        
        this.updateVehicle(deltaTime);
        this.updateLandmarks(deltaTime);
        this.updateCamera();
        this.updateUI();
        
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize game when page loads
window.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    game.init();
});
