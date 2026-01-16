import * as THREE from 'three';
import { CONFIG } from './config.js';
import { Vehicle } from './Vehicle.js';
import { World } from './World.js';
import { CollisionSystem } from './CollisionSystem.js';
import { InputController } from './InputController.js';
import { UIManager } from './UIManager.js';

/**
 * 游戏主类 - 协调所有游戏系统
 */
export class Game {
    constructor() {
        // 核心Three.js对象
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        
        // 游戏系统
        this.vehicle = null;
        this.world = null;
        this.collisionSystem = null;
        this.inputController = null;
        this.uiManager = null;
        
        // 游戏状态
        this.distanceTraveled = 0;
        this.gameTime = 0;
        this.lastPosition = new THREE.Vector3();
        this.lastTime = performance.now();
        this.isRunning = false;
    }
    
    /**
     * 初始化游戏
     */
    async init() {
        console.log('🎮 初始化游戏...');
        
        // 初始化渲染系统
        this.setupScene();
        this.setupLights();
        this.setupCamera();
        
        // 初始化游戏系统
        this.inputController = new InputController();
        this.uiManager = new UIManager();
        this.collisionSystem = new CollisionSystem();
        
        // 创建世界
        this.world = new World(this.scene);
        this.world.init();
        
        // 创建车辆
        this.vehicle = new Vehicle(this.scene);
        this.lastPosition.copy(this.vehicle.position);
        
        // 设置碰撞检测
        this.setupCollisions();
        
        // 设置事件监听
        this.setupEventListeners();
        
        // 设置重置回调
        this.inputController.onReset(() => this.resetGame());
        
        // 隐藏加载界面
        this.uiManager.hideLoading();
        
        console.log('✅ 游戏初始化完成');
        
        // 开始游戏循环
        this.isRunning = true;
        this.animate();
    }
    
    /**
     * 设置场景
     */
    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(CONFIG.scene.backgroundColor);
        this.scene.fog = new THREE.Fog(
            CONFIG.scene.backgroundColor, 
            CONFIG.scene.fogNear, 
            CONFIG.scene.fogFar
        );
        
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
    
    /**
     * 设置灯光
     */
    setupLights() {
        // 环境光
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        // 太阳光
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
    
    /**
     * 设置相机
     */
    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(
            CONFIG.camera.fov,
            window.innerWidth / window.innerHeight,
            CONFIG.camera.near,
            CONFIG.camera.far
        );
    }
    
    /**
     * 设置碰撞检测
     */
    setupCollisions() {
        // 添加建筑物到碰撞系统
        this.collisionSystem.addCollidables(
            this.world.getBuildings(), 
            { type: 'building' }
        );
        
        // 添加地标到碰撞系统
        this.world.landmarks.forEach(landmark => {
            this.collisionSystem.addCollidable(
                landmark.mesh, 
                { type: 'landmark', padding: 2 }
            );
        });
        
        console.log(`📦 已添加 ${this.world.getBuildings().length} 个建筑物到碰撞系统`);
    }
    
    /**
     * 设置事件监听
     */
    setupEventListeners() {
        window.addEventListener('resize', () => this.onWindowResize());
    }
    
    /**
     * 窗口大小改变处理
     */
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    /**
     * 更新相机位置
     */
    updateCamera() {
        const cameraPosition = new THREE.Vector3();
        cameraPosition.copy(this.vehicle.position);
        cameraPosition.add(CONFIG.camera.offset);
        
        this.camera.position.lerp(cameraPosition, CONFIG.camera.lerpFactor);
        this.camera.lookAt(this.vehicle.position);
    }
    
    /**
     * 重置游戏
     */
    resetGame() {
        console.log('🔄 重置游戏...');
        
        this.vehicle.reset();
        this.distanceTraveled = 0;
        this.gameTime = 0;
        this.lastPosition.copy(this.vehicle.position);
        
        this.uiManager.hideGameOver();
        
        console.log('✅ 游戏已重置');
    }
    
    /**
     * 更新游戏状态
     * @param {number} deltaTime - 时间增量
     */
    update(deltaTime) {
        // 获取输入
        const input = this.inputController.getInput();
        
        // 更新车辆
        this.vehicle.update(input, deltaTime);
        
        // 碰撞检测
        const collision = this.collisionSystem.update(this.vehicle);
        if (collision) {
            console.log(`💥 碰撞! 类型: ${collision.type}, 剩余血量: ${this.vehicle.health}`);
        }
        
        // 更新世界（地标动画等）
        this.world.updateLandmarks(deltaTime);
        
        // 检查是否靠近地标
        const nearbyLandmark = this.world.checkNearbyLandmark(this.vehicle.position);
        if (nearbyLandmark) {
            this.uiManager.showLocationInfo(nearbyLandmark.name);
        }
        
        // 计算行驶距离
        const distance = this.vehicle.position.distanceTo(this.lastPosition);
        this.distanceTraveled += distance;
        this.lastPosition.copy(this.vehicle.position);
        
        // 更新相机
        this.updateCamera();
        
        // 更新UI
        this.uiManager.update({
            distance: this.distanceTraveled,
            speed: this.vehicle.getSpeed(),
            time: this.gameTime,
            healthPercent: this.vehicle.getHealthPercent(),
            collisionCount: this.vehicle.collisionCount,
            isDestroyed: this.vehicle.isDestroyed
        });
    }
    
    /**
     * 游戏主循环
     */
    animate() {
        if (!this.isRunning) return;
        
        requestAnimationFrame(() => this.animate());
        
        const currentTime = performance.now();
        const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1);
        this.lastTime = currentTime;
        this.gameTime += deltaTime;
        
        this.update(deltaTime);
        
        this.renderer.render(this.scene, this.camera);
    }
    
    /**
     * 停止游戏
     */
    stop() {
        this.isRunning = false;
    }
    
    /**
     * 开始游戏
     */
    start() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.lastTime = performance.now();
            this.animate();
        }
    }
}
