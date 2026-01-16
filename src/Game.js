import * as THREE from 'three';
import { CONFIG } from './config.js';
import { Vehicle } from './Vehicle.js';
import { InfiniteWorld } from './InfiniteWorld.js';
import { CollisionSystem } from './CollisionSystem.js';
import { InputController } from './InputController.js';
import { UIManager } from './UIManager.js';
import { Police } from './Police.js';

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
        this.police = null;
        
        // 游戏状态
        this.distanceTraveled = 0;
        this.gameTime = 0;
        this.coins = 0;  // 金币数量
        this.visitedLandmarks = new Set();  // 已访问的地标
        this.lastPosition = new THREE.Vector3();
        this.lastTime = performance.now();
        this.isRunning = false;
        
        // 碰撞更新计时器
        this.collisionUpdateTimer = 0;
        this.collisionUpdateInterval = 0.5;  // 每0.5秒更新一次碰撞系统
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
        this.police = new Police(this.scene);
        
        // 创建无限世界
        this.world = new InfiniteWorld(this.scene);
        this.world.init();
        
        // 创建车辆
        this.vehicle = new Vehicle(this.scene);
        this.lastPosition.copy(this.vehicle.position);
        
        // 初始生成周围区块
        this.world.update(this.vehicle.position);
        
        // 设置初始碰撞检测
        this.updateCollisionSystem();
        
        // 设置事件监听
        this.setupEventListeners();
        
        // 设置重置回调
        this.inputController.onReset(() => this.resetGame());
        
        // 隐藏加载界面
        this.uiManager.hideLoading();
        
        console.log('✅ 游戏初始化完成 - 无限世界模式');
        
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
     * 更新碰撞系统（动态添加新建筑物）
     */
    updateCollisionSystem() {
        // 清除旧的碰撞对象
        this.collisionSystem.clear();
        
        // 添加当前所有建筑物
        this.collisionSystem.addCollidables(
            this.world.getBuildings(), 
            { type: 'building' }
        );
        
        // 添加地标
        this.world.landmarks.forEach(landmark => {
            if (landmark.mesh) {
                this.collisionSystem.addCollidable(
                    landmark.mesh, 
                    { type: 'landmark', padding: 2 }
                );
            }
        });
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
        const cameraState = this.inputController.getCameraState();
        
        // 计算相机位置（球坐标系）
        const distance = cameraState.distance;
        const azimuth = cameraState.azimuth + this.vehicle.rotation.y; // 相对于车辆方向
        const polar = cameraState.polar;
        
        // 球坐标转笛卡尔坐标
        const offsetX = distance * Math.sin(polar) * Math.sin(azimuth);
        const offsetY = distance * Math.cos(polar);
        const offsetZ = distance * Math.sin(polar) * Math.cos(azimuth);
        
        // 目标相机位置
        const targetPosition = new THREE.Vector3(
            this.vehicle.position.x + offsetX,
            this.vehicle.position.y + offsetY,
            this.vehicle.position.z + offsetZ
        );
        
        // 平滑过渡到目标位置
        this.camera.position.lerp(targetPosition, CONFIG.camera.lerpFactor);
        
        // 相机始终看向车辆
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
        this.coins = 0;
        this.visitedLandmarks.clear();
        this.police.reset();
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
        
        // 更新无限世界（生成新区块）
        this.world.update(this.vehicle.position);
        
        // 定期更新碰撞系统
        this.collisionUpdateTimer += deltaTime;
        if (this.collisionUpdateTimer >= this.collisionUpdateInterval) {
            this.updateCollisionSystem();
            this.collisionUpdateTimer = 0;
        }
        
        // 碰撞检测
        const collision = this.collisionSystem.update(this.vehicle);
        if (collision) {
            console.log(`💥 碰撞! 类型: ${collision.type}, 剩余血量: ${this.vehicle.health}`);
        }
        
        // 更新世界（地标动画等）
        this.world.updateLandmarks(deltaTime);
        
        // 检查是否靠近地标并获得金币奖励
        const nearbyLandmark = this.world.checkNearbyLandmark(this.vehicle.position);
        if (nearbyLandmark) {
            this.uiManager.showLocationInfo(nearbyLandmark.name);
            
            // 检查是否是新访问的地标
            const landmarkKey = `${nearbyLandmark.name}_${Math.round(nearbyLandmark.distance)}`;
            if (!this.visitedLandmarks.has(nearbyLandmark.name)) {
                this.visitedLandmarks.add(nearbyLandmark.name);
                
                // 根据地标类型给予不同奖励
                const reward = nearbyLandmark.isChengdu 
                    ? CONFIG.coin.chengduLandmarkReward 
                    : CONFIG.coin.landmarkReward;
                this.coins += reward;
                
                const rewardText = nearbyLandmark.isChengdu ? '成都名胜!' : '发现新地点!';
                this.uiManager.showCoinNotification(reward, rewardText);
                console.log(`🪙 获得 ${reward} 金币! (${nearbyLandmark.name})`);
            }
        }
        
        // 更新警察系统
        const caughtByPolice = this.police.update(this.vehicle.position, deltaTime);
        if (caughtByPolice) {
            const penalty = CONFIG.coin.policePenalty;
            this.coins = Math.max(0, this.coins - penalty);
            this.uiManager.showCoinNotification(-penalty, '被警察抓到!');
            console.log(`🚨 被警察抓到! 扣除 ${penalty} 金币`);
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
            isDestroyed: this.vehicle.isDestroyed,
            coins: this.coins,
            policeCount: this.police.getCount()
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
