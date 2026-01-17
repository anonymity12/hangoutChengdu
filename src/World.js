import * as THREE from 'three';
import { CONFIG, CHENGDU_LANDMARKS } from './config.js';

/**
 * 世界类 - 管理场景中的地面、道路、建筑和地标
 */
export class World {
    constructor(scene) {
        this.scene = scene;
        this.buildings = [];
        this.landmarks = [];
        this.roads = [];
    }
    
    /**
     * 初始化整个世界
     */
    init() {
        this.createGround();
        this.createRoadNetwork();
        this.createBuildings();
        this.createLandmarks();
    }
    
    /**
     * 创建地面
     */
    createGround() {
        const groundGeometry = new THREE.PlaneGeometry(
            CONFIG.world.size, 
            CONFIG.world.size
        );
        const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x7CFC00 });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        ground.name = 'ground';
        this.scene.add(ground);
    }
    
    /**
     * 创建道路网络
     */
    createRoadNetwork() {
        const roadMaterial = new THREE.MeshLambertMaterial({ color: 0x444444 });
        const roadMarkingMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
        
        const roadWidth = CONFIG.world.roadWidth;
        const spacing = CONFIG.world.blockSize;
        const halfWorld = CONFIG.world.size / 2;
        
        // 垂直方向道路
        for (let x = -halfWorld; x <= halfWorld; x += spacing) {
            const roadGeometry = new THREE.PlaneGeometry(roadWidth, CONFIG.world.size);
            const road = new THREE.Mesh(roadGeometry, roadMaterial);
            road.rotation.x = -Math.PI / 2;
            road.position.set(x, 0.1, 0);
            road.receiveShadow = true;
            this.scene.add(road);
            this.roads.push({ 
                x: x, 
                z: 0, 
                width: roadWidth, 
                length: CONFIG.world.size, 
                type: 'vertical' 
            });
            
            // 道路标线
            for (let z = -halfWorld; z <= halfWorld; z += 20) {
                const markingGeometry = new THREE.PlaneGeometry(0.5, 4);
                const marking = new THREE.Mesh(markingGeometry, roadMarkingMaterial);
                marking.rotation.x = -Math.PI / 2;
                marking.position.set(x, 0.15, z);
                this.scene.add(marking);
            }
        }
        
        // 水平方向道路
        for (let z = -halfWorld; z <= halfWorld; z += spacing) {
            const roadGeometry = new THREE.PlaneGeometry(CONFIG.world.size, roadWidth);
            const road = new THREE.Mesh(roadGeometry, roadMaterial);
            road.rotation.x = -Math.PI / 2;
            road.position.set(0, 0.1, z);
            road.receiveShadow = true;
            this.scene.add(road);
            this.roads.push({ 
                x: 0, 
                z: z, 
                width: CONFIG.world.size, 
                length: roadWidth, 
                type: 'horizontal' 
            });
            
            // 道路标线
            for (let x = -halfWorld; x <= halfWorld; x += 20) {
                const markingGeometry = new THREE.PlaneGeometry(4, 0.5);
                const marking = new THREE.Mesh(markingGeometry, roadMarkingMaterial);
                marking.rotation.x = -Math.PI / 2;
                marking.position.set(x, 0.15, z);
                this.scene.add(marking);
            }
        }
    }
    
    /**
     * 创建建筑物
     * @returns {THREE.Mesh[]} 建筑物数组
     */
    createBuildings() {
        const spacing = CONFIG.world.blockSize;
        const halfWorld = CONFIG.world.size / 2;
        
        for (let x = -halfWorld + spacing / 2; x < halfWorld; x += spacing) {
            for (let z = -halfWorld + spacing / 2; z < halfWorld; z += spacing) {
                if (Math.random() > CONFIG.world.buildingDensity) continue;
                
                // 检查是否与地标位置重叠
                const isNearLandmark = CHENGDU_LANDMARKS.some(landmark => {
                    const dx = Math.abs(x - landmark.position.x);
                    const dz = Math.abs(z - landmark.position.z);
                    return dx < 30 && dz < 30;
                });
                
                if (isNearLandmark) continue;
                
                const building = this.createBuilding(x, z);
                this.buildings.push(building);
            }
        }
        
        return this.buildings;
    }
    
    /**
     * 创建单个建筑物
     * @param {number} x - X坐标
     * @param {number} z - Z坐标
     * @returns {THREE.Mesh} 建筑物网格
     */
    createBuilding(x, z) {
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
        building.userData.type = 'building';
        building.userData.dimensions = { width, height, depth };
        this.scene.add(building);
        
        return building;
    }
    
    /**
     * 创建成都地标
     */
    createLandmarks() {
        CHENGDU_LANDMARKS.forEach(landmark => {
            const landmarkGroup = this.createLandmark(landmark);
            this.landmarks.push({
                name: landmark.name,
                position: new THREE.Vector3(
                    landmark.position.x, 
                    0, 
                    landmark.position.z
                ),
                mesh: landmarkGroup.group,
                ring: landmarkGroup.ring,
                base: landmarkGroup.base
            });
        });
    }
    
    /**
     * 创建单个地标
     * @param {Object} landmarkData - 地标数据
     * @returns {Object} 包含group和ring的对象
     */
    createLandmark(landmarkData) {
        const landmarkGroup = new THREE.Group();
        
        // 基础建筑
        const baseGeometry = new THREE.BoxGeometry(20, 30, 20);
        const baseMaterial = new THREE.MeshLambertMaterial({ 
            color: landmarkData.color 
        });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.y = 15;
        base.castShadow = true;
        base.userData.type = 'landmark';
        base.userData.name = landmarkData.name;
        landmarkGroup.add(base);
        
        // 顶部标记
        const markerGeometry = new THREE.ConeGeometry(5, 10, 4);
        const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xFFD700 });
        const marker = new THREE.Mesh(markerGeometry, markerMaterial);
        marker.position.y = 35;
        landmarkGroup.add(marker);
        
        // 旋转光环
        const ringGeometry = new THREE.TorusGeometry(8, 0.5, 8, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 30;
        landmarkGroup.add(ring);
        
        // 添加汉字标签
        const textSprite = this.createTextSprite(landmarkData.name, landmarkData.color);
        textSprite.position.y = 45;
        landmarkGroup.add(textSprite);
        
        landmarkGroup.position.set(
            landmarkData.position.x, 
            0, 
            landmarkData.position.z
        );
        this.scene.add(landmarkGroup);
        
        return { group: landmarkGroup, ring, base, textSprite };
    }
    
    /**
     * 创建文字精灵（用于显示汉字地名）
     * @param {string} text - 要显示的文字
     * @param {number} color - 背景颜色
     * @returns {THREE.Sprite} 文字精灵
     */
    createTextSprite(text, color) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        // 设置画布大小
        canvas.width = 256;
        canvas.height = 64;
        
        // 绘制背景
        context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // 绘制边框
        context.strokeStyle = '#FFFFFF';
        context.lineWidth = 3;
        context.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
        
        // 绘制文字
        context.font = 'bold 32px Microsoft YaHei, PingFang SC, sans-serif';
        context.fillStyle = '#FFFFFF';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, canvas.width / 2, canvas.height / 2);
        
        // 创建纹理和精灵
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        
        const spriteMaterial = new THREE.SpriteMaterial({ 
            map: texture,
            transparent: true
        });
        
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(20, 5, 1);  // 调整标签大小
        
        return sprite;
    }
    
    /**
     * 更新地标动画
     * @param {number} deltaTime - 时间增量
     */
    updateLandmarks(deltaTime) {
        this.landmarks.forEach(landmark => {
            // 旋转光环动画
            landmark.ring.rotation.z += deltaTime * 2;
        });
    }
    
    /**
     * 检查玩家是否靠近某个地标
     * @param {THREE.Vector3} position - 玩家位置
     * @param {number} threshold - 距离阈值
     * @returns {Object|null} 靠近的地标信息
     */
    checkNearbyLandmark(position, threshold = 30) {
        for (const landmark of this.landmarks) {
            const distance = position.distanceTo(landmark.position);
            if (distance < threshold) {
                return {
                    name: landmark.name,
                    distance: distance
                };
            }
        }
        return null;
    }
    
    /**
     * 获取所有建筑物（用于碰撞检测）
     * @returns {THREE.Mesh[]} 建筑物数组
     */
    getBuildings() {
        return this.buildings;
    }
    
    /**
     * 获取地标建筑（用于碰撞检测）
     * @returns {THREE.Mesh[]} 地标基础建筑数组
     */
    getLandmarkBases() {
        return this.landmarks.map(l => l.base);
    }
}
