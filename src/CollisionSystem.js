import * as THREE from 'three';
import { CONFIG } from './config.js';

/**
 * 碰撞检测系统
 */
export class CollisionSystem {
    constructor() {
        this.collidables = [];
        this.tempBox = new THREE.Box3();
        this.tempSphere = new THREE.Sphere();
    }
    
    /**
     * 添加可碰撞物体
     * @param {THREE.Object3D} object - 可碰撞的3D物体
     * @param {Object} options - 碰撞配置选项
     */
    addCollidable(object, options = {}) {
        const boundingBox = new THREE.Box3().setFromObject(object);
        
        this.collidables.push({
            object,
            boundingBox,
            type: options.type || 'building',
            padding: options.padding || CONFIG.collision.buildingPadding
        });
    }
    
    /**
     * 批量添加可碰撞物体
     * @param {THREE.Object3D[]} objects - 物体数组
     * @param {Object} options - 碰撞配置选项
     */
    addCollidables(objects, options = {}) {
        objects.forEach(object => this.addCollidable(object, options));
    }
    
    /**
     * 清除所有可碰撞物体
     */
    clear() {
        this.collidables = [];
    }
    
    /**
     * 检测车辆与所有物体的碰撞
     * @param {Vehicle} vehicle - 车辆对象
     * @returns {Object|null} 碰撞信息，如果没有碰撞返回null
     */
    checkCollision(vehicle) {
        const vehiclePosition = vehicle.position.clone();
        // 将车辆位置提升到车身高度进行检测
        vehiclePosition.y = 1.5;
        const vehicleRadius = vehicle.getBoundingRadius();
        
        // 创建车辆的包围球
        this.tempSphere.set(vehiclePosition, vehicleRadius);
        
        for (const collidable of this.collidables) {
            // 扩展包围盒以考虑padding
            this.tempBox.copy(collidable.boundingBox);
            this.tempBox.expandByScalar(collidable.padding);
            
            // 只检测 XZ 平面上的碰撞（2D碰撞检测）
            if (this.checkXZCollision(vehiclePosition, vehicleRadius, this.tempBox)) {
                // 计算碰撞法线
                const normal = this.calculateCollisionNormal(
                    vehiclePosition, 
                    this.tempBox
                );
                
                // 将车辆推出碰撞区域
                const pushDistance = vehicleRadius + collidable.padding;
                const pushVector = normal.clone().multiplyScalar(pushDistance * 0.1);
                vehicle.position.add(pushVector);
                
                return {
                    object: collidable.object,
                    type: collidable.type,
                    normal: normal,
                    point: vehiclePosition.clone()
                };
            }
        }
        
        return null;
    }
    
    /**
     * 2D碰撞检测（只检测XZ平面）
     * @param {THREE.Vector3} position - 车辆位置
     * @param {number} radius - 车辆半径
     * @param {THREE.Box3} box - 建筑物包围盒
     * @returns {boolean} 是否碰撞
     */
    checkXZCollision(position, radius, box) {
        // 只在 XZ 平面上进行碰撞检测
        const closestX = Math.max(box.min.x, Math.min(position.x, box.max.x));
        const closestZ = Math.max(box.min.z, Math.min(position.z, box.max.z));
        
        const distanceX = position.x - closestX;
        const distanceZ = position.z - closestZ;
        
        const distanceSquared = distanceX * distanceX + distanceZ * distanceZ;
        return distanceSquared < radius * radius;
    }
    
    /**
     * 球体与盒子的碰撞检测
     * @param {THREE.Sphere} sphere - 球体
     * @param {THREE.Box3} box - 盒子
     * @returns {boolean} 是否碰撞
     */
    sphereIntersectsBox(sphere, box) {
        // 找到盒子上离球心最近的点
        const closestPoint = new THREE.Vector3();
        closestPoint.copy(sphere.center).clamp(box.min, box.max);
        
        // 检查该点是否在球体内
        const distance = sphere.center.distanceTo(closestPoint);
        return distance <= sphere.radius;
    }
    
    /**
     * 计算碰撞法线
     * @param {THREE.Vector3} point - 碰撞点
     * @param {THREE.Box3} box - 碰撞盒子
     * @returns {THREE.Vector3} 碰撞法线
     */
    calculateCollisionNormal(point, box) {
        const center = new THREE.Vector3();
        box.getCenter(center);
        
        const size = new THREE.Vector3();
        box.getSize(size);
        
        // 计算点到盒子中心的相对位置
        const diff = point.clone().sub(center);
        
        // 确定最近的面
        const absX = Math.abs(diff.x) / (size.x / 2);
        const absZ = Math.abs(diff.z) / (size.z / 2);
        
        const normal = new THREE.Vector3();
        
        if (absX > absZ) {
            normal.x = diff.x > 0 ? 1 : -1;
        } else {
            normal.z = diff.z > 0 ? 1 : -1;
        }
        
        return normal.normalize();
    }
    
    /**
     * 更新碰撞系统（每帧调用）
     * @param {Vehicle} vehicle - 车辆对象
     * @returns {Object|null} 碰撞信息
     */
    update(vehicle) {
        if (vehicle.isDestroyed) return null;
        
        const collision = this.checkCollision(vehicle);
        
        if (collision) {
            vehicle.handleCollision(collision.normal);
            return collision;
        }
        
        return null;
    }
    
    /**
     * 调试：可视化碰撞盒
     * @param {THREE.Scene} scene - 场景
     */
    debugVisualize(scene) {
        const material = new THREE.LineBasicMaterial({ color: 0xff0000 });
        
        this.collidables.forEach(collidable => {
            const box = collidable.boundingBox;
            const helper = new THREE.Box3Helper(box, 0xff0000);
            scene.add(helper);
        });
    }
}
