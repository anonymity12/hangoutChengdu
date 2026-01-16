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
     * 创建车辆模型
     */
    create() {
        const vehicleGroup = new THREE.Group();
        
        // 车身
        const bodyGeometry = new THREE.BoxGeometry(3, 1.5, 5);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0xFF4444 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 1;
        body.castShadow = true;
        body.name = 'body';
        vehicleGroup.add(body);
        this.originalMaterials.push({ mesh: body, color: 0xFF4444 });
        
        // 驾驶舱
        const cabinGeometry = new THREE.BoxGeometry(2.5, 1.2, 2.5);
        const cabinMaterial = new THREE.MeshLambertMaterial({ color: 0x4444FF });
        const cabin = new THREE.Mesh(cabinGeometry, cabinMaterial);
        cabin.position.y = 2;
        cabin.position.z = -0.5;
        cabin.castShadow = true;
        cabin.name = 'cabin';
        vehicleGroup.add(cabin);
        this.originalMaterials.push({ mesh: cabin, color: 0x4444FF });
        
        // 车轮
        const wheelGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.4, 16);
        const wheelMaterial = new THREE.MeshLambertMaterial({ color: 0x222222 });
        
        const wheelPositions = [
            { x: 1.5, y: 0.5, z: 1.5 },
            { x: -1.5, y: 0.5, z: 1.5 },
            { x: 1.5, y: 0.5, z: -1.5 },
            { x: -1.5, y: 0.5, z: -1.5 }
        ];
        
        this.wheels = [];
        wheelPositions.forEach((pos, index) => {
            const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(pos.x, pos.y, pos.z);
            wheel.castShadow = true;
            wheel.name = `wheel_${index}`;
            vehicleGroup.add(wheel);
            this.wheels.push(wheel);
        });
        
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
        
        // 更新位置
        this.mesh.position.add(this.velocity);
        
        // 限制在世界范围内
        const halfWorld = CONFIG.world.size / 2;
        this.mesh.position.x = Math.max(-halfWorld, Math.min(halfWorld, this.mesh.position.x));
        this.mesh.position.z = Math.max(-halfWorld, Math.min(halfWorld, this.mesh.position.z));
        
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
