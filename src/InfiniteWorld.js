import * as THREE from 'three';
import { CONFIG, CHENGDU_LANDMARKS } from './config.js';
import { generatePlaceName, generateRandomColor } from './NameGenerator.js';

/**
 * 无限世界类 - 基于区块的动态世界生成
 */
export class InfiniteWorld {
    constructor(scene) {
        this.scene = scene;
        
        // 区块管理
        this.chunks = new Map();  // key: "x,z" -> chunk data
        this.chunkSize = CONFIG.world.chunkSize || 200;  // 每个区块的大小
        this.renderDistance = CONFIG.world.renderDistance || 3;  // 渲染距离（区块数）
        
        // 对象存储
        this.buildings = [];
        this.landmarks = [];
        
        // 材质缓存（优化性能）
        this.materials = {
            ground: new THREE.MeshLambertMaterial({ color: 0x7CFC00 }),
            road: new THREE.MeshLambertMaterial({ color: 0x444444 }),
            roadMarking: new THREE.MeshBasicMaterial({ color: 0xFFFFFF })
        };
        
        // 几何体缓存
        this.geometries = {
            ground: new THREE.PlaneGeometry(this.chunkSize, this.chunkSize),
            roadH: new THREE.PlaneGeometry(this.chunkSize, CONFIG.world.roadWidth),
            roadV: new THREE.PlaneGeometry(CONFIG.world.roadWidth, this.chunkSize)
        };
    }
    
    /**
     * 初始化世界（生成初始区块和成都地标）
     */
    init() {
        // 创建成都核心地标（在中心区域）
        this.createChengduLandmarks();
    }
    
    /**
     * 更新世界（根据玩家位置生成/卸载区块）
     * @param {THREE.Vector3} playerPosition - 玩家位置
     */
    update(playerPosition) {
        const currentChunkX = Math.floor(playerPosition.x / this.chunkSize);
        const currentChunkZ = Math.floor(playerPosition.z / this.chunkSize);
        
        // 生成周围的区块
        for (let dx = -this.renderDistance; dx <= this.renderDistance; dx++) {
            for (let dz = -this.renderDistance; dz <= this.renderDistance; dz++) {
                const chunkX = currentChunkX + dx;
                const chunkZ = currentChunkZ + dz;
                const key = `${chunkX},${chunkZ}`;
                
                if (!this.chunks.has(key)) {
                    this.generateChunk(chunkX, chunkZ);
                }
            }
        }
        
        // 卸载远处的区块（可选，用于优化内存）
        this.unloadDistantChunks(currentChunkX, currentChunkZ);
    }
    
    /**
     * 生成一个区块
     * @param {number} chunkX - 区块X坐标
     * @param {number} chunkZ - 区块Z坐标
     */
    generateChunk(chunkX, chunkZ) {
        const key = `${chunkX},${chunkZ}`;
        const worldX = chunkX * this.chunkSize;
        const worldZ = chunkZ * this.chunkSize;
        
        // 使用区块坐标作为种子，保证相同位置生成相同内容
        const seed = chunkX * 73856093 ^ chunkZ * 19349663;
        
        const chunkData = {
            x: chunkX,
            z: chunkZ,
            objects: [],
            buildings: [],
            landmarks: []
        };
        
        // 创建地面
        const ground = this.createChunkGround(worldX, worldZ);
        chunkData.objects.push(ground);
        
        // 创建道路
        const roads = this.createChunkRoads(worldX, worldZ);
        chunkData.objects.push(...roads);
        
        // 创建建筑物
        const buildings = this.createChunkBuildings(worldX, worldZ, seed);
        chunkData.buildings = buildings;
        this.buildings.push(...buildings);
        
        // 随机生成地标（每个区块有一定概率）
        const random = this.seededRandom(seed + 12345);
        if (random() < 0.3) {  // 30% 概率生成地标
            const landmark = this.createRandomLandmark(worldX, worldZ, seed);
            if (landmark) {
                chunkData.landmarks.push(landmark);
                this.landmarks.push(landmark);
            }
        }
        
        this.chunks.set(key, chunkData);
    }
    
    /**
     * 创建区块地面
     */
    createChunkGround(worldX, worldZ) {
        const ground = new THREE.Mesh(this.geometries.ground, this.materials.ground);
        ground.rotation.x = -Math.PI / 2;
        ground.position.set(worldX + this.chunkSize / 2, 0, worldZ + this.chunkSize / 2);
        ground.receiveShadow = true;
        this.scene.add(ground);
        return ground;
    }
    
    /**
     * 创建区块道路
     */
    createChunkRoads(worldX, worldZ) {
        const roads = [];
        const spacing = CONFIG.world.blockSize;
        const halfChunk = this.chunkSize / 2;
        const centerX = worldX + halfChunk;
        const centerZ = worldZ + halfChunk;
        
        // 垂直道路
        for (let x = worldX; x < worldX + this.chunkSize; x += spacing) {
            const road = new THREE.Mesh(this.geometries.roadV, this.materials.road);
            road.rotation.x = -Math.PI / 2;
            road.position.set(x, 0.1, centerZ);
            road.receiveShadow = true;
            this.scene.add(road);
            roads.push(road);
            
            // 道路标线
            for (let z = worldZ; z < worldZ + this.chunkSize; z += 20) {
                const markingGeometry = new THREE.PlaneGeometry(0.5, 4);
                const marking = new THREE.Mesh(markingGeometry, this.materials.roadMarking);
                marking.rotation.x = -Math.PI / 2;
                marking.position.set(x, 0.15, z);
                this.scene.add(marking);
                roads.push(marking);
            }
        }
        
        // 水平道路
        for (let z = worldZ; z < worldZ + this.chunkSize; z += spacing) {
            const road = new THREE.Mesh(this.geometries.roadH, this.materials.road);
            road.rotation.x = -Math.PI / 2;
            road.position.set(centerX, 0.1, z);
            road.receiveShadow = true;
            this.scene.add(road);
            roads.push(road);
            
            // 道路标线
            for (let x = worldX; x < worldX + this.chunkSize; x += 20) {
                const markingGeometry = new THREE.PlaneGeometry(4, 0.5);
                const marking = new THREE.Mesh(markingGeometry, this.materials.roadMarking);
                marking.rotation.x = -Math.PI / 2;
                marking.position.set(x, 0.15, z);
                this.scene.add(marking);
                roads.push(marking);
            }
        }
        
        return roads;
    }
    
    /**
     * 创建区块内的建筑物
     */
    createChunkBuildings(worldX, worldZ, seed) {
        const buildings = [];
        const spacing = CONFIG.world.blockSize;
        const random = this.seededRandom(seed);
        
        for (let x = worldX + spacing / 2; x < worldX + this.chunkSize; x += spacing) {
            for (let z = worldZ + spacing / 2; z < worldZ + this.chunkSize; z += spacing) {
                // 检查是否与成都地标重叠
                const isNearLandmark = this.isNearChengduLandmark(x, z);
                if (isNearLandmark) continue;
                
                if (random() > CONFIG.world.buildingDensity) continue;
                
                const building = this.createBuilding(x, z, random);
                buildings.push(building);
            }
        }
        
        return buildings;
    }
    
    /**
     * 创建单个建筑物
     */
    createBuilding(x, z, random) {
        const width = 15 + random() * 15;
        const depth = 15 + random() * 15;
        const height = 10 + random() * 40;
        
        const buildingGeometry = new THREE.BoxGeometry(width, height, depth);
        const buildingMaterial = new THREE.MeshLambertMaterial({
            color: new THREE.Color().setHSL(random() * 0.1 + 0.5, 0.3, 0.6)
        });
        const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
        building.position.set(x, height / 2, z);
        building.castShadow = true;
        building.receiveShadow = true;
        building.userData.type = 'building';
        this.scene.add(building);
        
        return building;
    }
    
    /**
     * 创建随机地标
     */
    createRandomLandmark(worldX, worldZ, seed) {
        const random = this.seededRandom(seed + 99999);
        
        // 地标位置（在区块内随机）
        const x = worldX + 25 + random() * (this.chunkSize - 50);
        const z = worldZ + 25 + random() * (this.chunkSize - 50);
        
        // 检查是否与成都地标重叠
        if (this.isNearChengduLandmark(x, z)) return null;
        
        // 生成随机名称和颜色
        const name = generatePlaceName(seed);
        const color = generateRandomColor(seed + 7777);
        
        const landmarkGroup = new THREE.Group();
        
        // 基础建筑（比普通建筑更大更特别）
        const baseHeight = 30 + random() * 20;
        const baseGeometry = new THREE.BoxGeometry(25, baseHeight, 25);
        const baseMaterial = new THREE.MeshLambertMaterial({ color });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.y = baseHeight / 2;
        base.castShadow = true;
        base.userData.type = 'landmark';
        base.userData.name = name;
        landmarkGroup.add(base);
        
        // 旋转光环
        const ringGeometry = new THREE.TorusGeometry(10, 0.5, 8, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = baseHeight - 5;
        landmarkGroup.add(ring);
        
        // 添加汉字标签（放在建筑物顶部）
        const textSprite = this.createTextSprite(name, color);
        textSprite.position.set(0, baseHeight + 3, 0);
        landmarkGroup.add(textSprite);
        
        landmarkGroup.position.set(x, 0, z);
        this.scene.add(landmarkGroup);
        
        return {
            name,
            position: new THREE.Vector3(x, 0, z),
            mesh: landmarkGroup,
            ring,
            base
        };
    }
    
    /**
     * 创建成都核心地标
     */
    createChengduLandmarks() {
        CHENGDU_LANDMARKS.forEach(landmarkData => {
            const landmarkGroup = new THREE.Group();
            
            // 基础建筑
            const baseGeometry = new THREE.BoxGeometry(20, 30, 20);
            const baseMaterial = new THREE.MeshLambertMaterial({ color: landmarkData.color });
            const base = new THREE.Mesh(baseGeometry, baseMaterial);
            base.position.y = 15;
            base.castShadow = true;
            base.userData.type = 'landmark';
            base.userData.name = landmarkData.name;
            landmarkGroup.add(base);
            
            // 旋转光环
            const ringGeometry = new THREE.TorusGeometry(8, 0.5, 8, 32);
            const ringMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
            const ring = new THREE.Mesh(ringGeometry, ringMaterial);
            ring.rotation.x = Math.PI / 2;
            ring.position.y = 28;
            landmarkGroup.add(ring);
            
            // 添加汉字标签（放在建筑物顶部）
            const textSprite = this.createTextSprite(landmarkData.name, landmarkData.color);
            textSprite.position.set(0, 33, 0);
            landmarkGroup.add(textSprite);
            
            landmarkGroup.position.set(landmarkData.position.x, 0, landmarkData.position.z);
            this.scene.add(landmarkGroup);
            
            this.landmarks.push({
                name: landmarkData.name,
                position: new THREE.Vector3(landmarkData.position.x, 0, landmarkData.position.z),
                mesh: landmarkGroup,
                ring,
                base,
                isChengdu: true  // 标记为成都核心地标
            });
        });
    }
    
    /**
     * 检查位置是否靠近成都地标
     */
    isNearChengduLandmark(x, z) {
        for (const landmark of CHENGDU_LANDMARKS) {
            const dx = Math.abs(x - landmark.position.x);
            const dz = Math.abs(z - landmark.position.z);
            if (dx < 40 && dz < 40) return true;
        }
        return false;
    }
    
    /**
     * 卸载远处的区块
     */
    unloadDistantChunks(currentChunkX, currentChunkZ) {
        const unloadDistance = this.renderDistance + 2;
        
        for (const [key, chunk] of this.chunks) {
            const dx = Math.abs(chunk.x - currentChunkX);
            const dz = Math.abs(chunk.z - currentChunkZ);
            
            if (dx > unloadDistance || dz > unloadDistance) {
                // 从场景中移除对象
                chunk.objects.forEach(obj => {
                    this.scene.remove(obj);
                    if (obj.geometry) obj.geometry.dispose();
                });
                
                chunk.buildings.forEach(building => {
                    this.scene.remove(building);
                    if (building.geometry) building.geometry.dispose();
                    if (building.material) building.material.dispose();
                    
                    // 从 buildings 数组中移除
                    const idx = this.buildings.indexOf(building);
                    if (idx > -1) this.buildings.splice(idx, 1);
                });
                
                chunk.landmarks.forEach(landmark => {
                    this.scene.remove(landmark.mesh);
                    
                    // 从 landmarks 数组中移除
                    const idx = this.landmarks.indexOf(landmark);
                    if (idx > -1) this.landmarks.splice(idx, 1);
                });
                
                this.chunks.delete(key);
            }
        }
    }
    
    /**
     * 创建文字精灵
     */
    createTextSprite(text, color) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        canvas.width = 256;
        canvas.height = 64;
        
        // 绘制背景
        const colorHex = typeof color === 'number' 
            ? `#${color.toString(16).padStart(6, '0')}` 
            : color;
        context.fillStyle = colorHex;
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // 绘制边框
        context.strokeStyle = '#FFFFFF';
        context.lineWidth = 3;
        context.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
        
        // 绘制文字
        context.font = 'bold 28px Microsoft YaHei, PingFang SC, sans-serif';
        context.fillStyle = '#FFFFFF';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, canvas.width / 2, canvas.height / 2);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        
        const spriteMaterial = new THREE.SpriteMaterial({ 
            map: texture,
            transparent: true
        });
        
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(20, 5, 1);
        
        return sprite;
    }
    
    /**
     * 带种子的随机数生成器
     */
    seededRandom(seed) {
        let s = seed;
        return function() {
            s = Math.sin(s * 9999) * 10000;
            return s - Math.floor(s);
        };
    }
    
    /**
     * 更新地标动画
     */
    updateLandmarks(deltaTime) {
        this.landmarks.forEach(landmark => {
            if (landmark.ring) {
                landmark.ring.rotation.z += deltaTime * 2;
            }
        });
    }
    
    /**
     * 检查玩家是否靠近某个地标
     */
    checkNearbyLandmark(position, threshold = 30) {
        for (const landmark of this.landmarks) {
            const distance = position.distanceTo(landmark.position);
            if (distance < threshold) {
                return {
                    name: landmark.name,
                    distance: distance,
                    isChengdu: landmark.isChengdu || false
                };
            }
        }
        return null;
    }
    
    /**
     * 获取所有建筑物（用于碰撞检测）
     */
    getBuildings() {
        return this.buildings;
    }
    
    /**
     * 获取地标建筑
     */
    getLandmarkBases() {
        return this.landmarks.map(l => l.base);
    }
}
