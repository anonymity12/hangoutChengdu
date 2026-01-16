import * as THREE from 'three';
import { CONFIG } from './config.js';

/**
 * 车辆类 - 管理车辆的创建、移动和状态
 */
export class Vehicle {
    constructor(scene) {
        this.scene = scene;
        this.mesh = null;
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.health = CONFIG.vehicle.maxHealth;
        this.collisionCount = 0;
        this.isDestroyed = false;
        this.damageFlashTimer = 0;
        this.collisionCooldown = 0;  // 碰撞冷却时间
        this.originalMaterials = [];
        
        this.create();
    }
    
    /**
     * 创建车辆模型 - 三轮车
     */
    create() {
        const vehicleGroup = new THREE.Group();
        
        // 车身（三轮车车身，前窄后宽）
        const bodyShape = new THREE.Shape();
        bodyShape.moveTo(-1.5, -2);   // 后左
        bodyShape.lineTo(1.5, -2);    // 后右
        bodyShape.lineTo(0.8, 2);     // 前右
        bodyShape.lineTo(-0.8, 2);    // 前左
        bodyShape.lineTo(-1.5, -2);   // 回到起点
        
        const extrudeSettings = { depth: 1.2, bevelEnabled: false };
        const bodyGeometry = new THREE.ExtrudeGeometry(bodyShape, extrudeSettings);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x00AA00 }); // 绿色三轮车
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.rotation.x = -Math.PI / 2;
        body.position.y = 0.6;
        body.position.z = 0;
        body.castShadow = true;
        body.name = 'body';
        vehicleGroup.add(body);
        this.originalMaterials.push({ mesh: body, color: 0x00AA00 });
        
        // 车篷（三轮车的遮阳篷）
        const canopyGeometry = new THREE.BoxGeometry(3, 0.1, 3);
        const canopyMaterial = new THREE.MeshLambertMaterial({ color: 0x0066CC });
        const canopy = new THREE.Mesh(canopyGeometry, canopyMaterial);
        canopy.position.set(0, 2.5, -0.5);
        canopy.castShadow = true;
        canopy.name = 'canopy';
        vehicleGroup.add(canopy);
        this.originalMaterials.push({ mesh: canopy, color: 0x0066CC });
        
        // 车篷支柱
        const pillarGeometry = new THREE.CylinderGeometry(0.08, 0.08, 1.5, 8);
        const pillarMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
        const pillarPositions = [
            { x: 1.2, z: -1.8 },
            { x: -1.2, z: -1.8 },
            { x: 0.6, z: 1 },
            { x: -0.6, z: 1 }
        ];
        pillarPositions.forEach(pos => {
            const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
            pillar.position.set(pos.x, 1.75, pos.z);
            pillar.castShadow = true;
            vehicleGroup.add(pillar);
        });
        
        // 座位
        const seatGeometry = new THREE.BoxGeometry(2.2, 0.3, 1.5);
        const seatMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 }); // 棕色座椅
        const seat = new THREE.Mesh(seatGeometry, seatMaterial);
        seat.position.set(0, 1.2, -0.8);
        seat.castShadow = true;
        vehicleGroup.add(seat);
        
        // 车把手
        const handleGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1.2, 8);
        const handleMaterial = new THREE.MeshLambertMaterial({ color: 0x444444 });
        const handle = new THREE.Mesh(handleGeometry, handleMaterial);
        handle.rotation.z = Math.PI / 2;
        handle.position.set(0, 1.5, 1.5);
        vehicleGroup.add(handle);
        
        // 车轮 - 三轮车配置：前面1个，后面2个
        const frontWheelGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.3, 16);
        const rearWheelGeometry = new THREE.CylinderGeometry(0.55, 0.55, 0.4, 16);
        const wheelMaterial = new THREE.MeshLambertMaterial({ color: 0x222222 });
        
        // 前轮（单个）
        const frontWheel = new THREE.Mesh(frontWheelGeometry, wheelMaterial);
        frontWheel.rotation.z = Math.PI / 2;
        frontWheel.position.set(0, 0.5, 2);
        frontWheel.castShadow = true;
        frontWheel.name = 'wheel_front';
        vehicleGroup.add(frontWheel);
        
        // 后轮（左右两个）
        const rearLeftWheel = new THREE.Mesh(rearWheelGeometry, wheelMaterial);
        rearLeftWheel.rotation.z = Math.PI / 2;
        rearLeftWheel.position.set(-1.5, 0.55, -1.5);
        rearLeftWheel.castShadow = true;
        rearLeftWheel.name = 'wheel_rear_left';
        vehicleGroup.add(rearLeftWheel);
        
        const rearRightWheel = new THREE.Mesh(rearWheelGeometry, wheelMaterial);
        rearRightWheel.rotation.z = Math.PI / 2;
        rearRightWheel.position.set(1.5, 0.55, -1.5);
        rearRightWheel.castShadow = true;
        rearRightWheel.name = 'wheel_rear_right';
        vehicleGroup.add(rearRightWheel);
        
        this.wheels = [frontWheel, rearLeftWheel, rearRightWheel];
        
        // 初始位置放在地图边缘的道路上，避免与建筑物碰撞
        const startX = -CONFIG.world.size / 2 + CONFIG.world.blockSize;
        const startZ = -CONFIG.world.size / 2 + CONFIG.world.blockSize;
        vehicleGroup.position.set(startX, 0, startZ);
        this.scene.add(vehicleGroup);
        this.mesh = vehicleGroup;
    }
    
    /**
     * 获取车辆位置
     */
    get position() {
        return this.mesh.position;
    }
    
    /**
     * 获取车辆旋转
     */
    get rotation() {
        return this.mesh.rotation;
    }
    
    /**
     * 获取车辆四元数
     */
    get quaternion() {
        return this.mesh.quaternion;
    }
    
    /**
     * 获取包围盒
     */
    getBoundingBox() {
        const box = new THREE.Box3();
        box.setFromObject(this.mesh);
        return box;
    }
    
    /**
     * 获取包围球半径
     */
    getBoundingRadius() {
        return CONFIG.collision.vehicleBoundingRadius;
    }
    
    /**
     * 更新车辆状态
     * @param {Object} input - 输入状态
     * @param {number} deltaTime - 时间增量
     */
    update(input, deltaTime) {
        if (this.isDestroyed) return;
        
        // 应用前进加速
        if (input.forward) {
            const direction = new THREE.Vector3(0, 0, -1);
            direction.applyQuaternion(this.mesh.quaternion);
            direction.multiplyScalar(CONFIG.vehicle.speed);
            this.velocity.add(direction);
        }
        
        // 应用倒车
        if (input.backward) {
            const direction = new THREE.Vector3(0, 0, 1);
            direction.applyQuaternion(this.mesh.quaternion);
            direction.multiplyScalar(CONFIG.vehicle.reverseSpeed);
            this.velocity.add(direction);
        }
        
        // 应用转向
        if (input.left && this.velocity.length() > 0.1) {
            this.mesh.rotation.y += CONFIG.vehicle.turnSpeed;
        }
        if (input.right && this.velocity.length() > 0.1) {
            this.mesh.rotation.y -= CONFIG.vehicle.turnSpeed;
        }
        
        // 应用刹车/摩擦力
        const frictionFactor = input.brake ? 0.9 : CONFIG.vehicle.brake;
        this.velocity.multiplyScalar(frictionFactor);
        
        // 更新位置（无边界限制，无限地图）
        this.mesh.position.add(this.velocity);
        
        // 更新车轮旋转
        const speed = this.velocity.length();
        this.wheels.forEach(wheel => {
            wheel.rotation.x += speed * 0.5;
        });
        
        // 更新碰撞冷却时间
        if (this.collisionCooldown > 0) {
            this.collisionCooldown -= deltaTime;
        }
        
        // 更新伤害闪烁效果
        this.updateDamageFlash(deltaTime);
    }
    
    /**
     * 处理碰撞
     * @param {THREE.Vector3} normal - 碰撞法线
     * @returns {boolean} 是否成功处理碰撞（冷却期内返回false）
     */
    handleCollision(normal) {
        if (this.isDestroyed) return false;
        
        // 碰撞冷却中，只处理反弹不扣血
        if (this.collisionCooldown > 0) {
            // 仍然需要反弹效果
            const reboundVelocity = normal.clone().multiplyScalar(
                this.velocity.length() * CONFIG.collision.reboundFactor
            );
            this.velocity.copy(reboundVelocity);
            return false;
        }
        
        // 反弹效果
        const reboundVelocity = normal.clone().multiplyScalar(
            this.velocity.length() * CONFIG.collision.reboundFactor
        );
        this.velocity.copy(reboundVelocity);
        
        // 计算伤害
        this.takeDamage(CONFIG.vehicle.collisionDamage);
        this.collisionCount++;
        
        // 设置碰撞冷却时间
        this.collisionCooldown = CONFIG.vehicle.collisionCooldown;
        
        // 触发伤害闪烁
        this.damageFlashTimer = 0.2;
        
        return true;
    }
    
    /**
     * 受到伤害
     * @param {number} damage - 伤害值
     */
    takeDamage(damage) {
        this.health = Math.max(0, this.health - damage);
        
        if (this.health <= 0) {
            this.destroy();
        }
    }
    
    /**
     * 更新伤害闪烁效果
     * @param {number} deltaTime - 时间增量
     */
    updateDamageFlash(deltaTime) {
        if (this.damageFlashTimer > 0) {
            this.damageFlashTimer -= deltaTime;
            
            // 闪烁红色
            const flashColor = this.damageFlashTimer > 0 ? 0xFF0000 : null;
            this.originalMaterials.forEach(({ mesh, color }) => {
                mesh.material.color.setHex(flashColor || color);
            });
        }
        
        // 根据健康值改变车身颜色
        if (this.health < CONFIG.vehicle.criticalHealth && this.damageFlashTimer <= 0) {
            const body = this.mesh.getObjectByName('body');
            if (body) {
                // 低血量时车身变深红色
                body.material.color.setHex(0x880000);
            }
        }
    }
    
    /**
     * 销毁车辆
     */
    destroy() {
        this.isDestroyed = true;
        this.velocity.set(0, 0, 0);
        
        // 视觉效果：车辆变黑
        this.mesh.traverse(child => {
            if (child.isMesh && child.material) {
                child.material.color.setHex(0x222222);
            }
        });
    }
    
    /**
     * 重置车辆
     */
    reset() {
        // 重置到地图边缘的道路上
        const startX = -CONFIG.world.size / 2 + CONFIG.world.blockSize;
        const startZ = -CONFIG.world.size / 2 + CONFIG.world.blockSize;
        this.mesh.position.set(startX, 0, startZ);
        this.mesh.rotation.y = Math.PI / 4; // 朝向地图中心
        this.velocity.set(0, 0, 0);
        this.health = CONFIG.vehicle.maxHealth;
        this.collisionCount = 0;
        this.isDestroyed = false;
        this.damageFlashTimer = 0;
        this.collisionCooldown = 0;
        
        // 恢复原始颜色
        this.originalMaterials.forEach(({ mesh, color }) => {
            mesh.material.color.setHex(color);
        });
    }
    
    /**
     * 获取速度（km/h）
     */
    getSpeed() {
        return Math.abs(this.velocity.length() * 100);
    }
    
    /**
     * 获取健康百分比
     */
    getHealthPercent() {
        return (this.health / CONFIG.vehicle.maxHealth) * 100;
    }
}
