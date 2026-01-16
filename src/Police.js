import * as THREE from 'three';
import { CONFIG } from './config.js';

/**
 * 警察类 - 管理交通警察的生成、移动和追逐
 */
export class Police {
    constructor(scene) {
        this.scene = scene;
        this.police = [];  // 所有警察
        this.maxPolice = CONFIG.police.maxCount;
        this.spawnTimer = 0;
        this.spawnInterval = CONFIG.police.spawnInterval;
    }
    
    /**
     * 在指定位置附近生成警察
     * @param {THREE.Vector3} targetPosition - 目标位置（玩家位置）
     */
    spawnPolice(targetPosition) {
        if (this.police.length >= this.maxPolice) return;
        
        // 在玩家周围随机位置生成（不能太近也不能太远）
        const angle = Math.random() * Math.PI * 2;
        const distance = CONFIG.police.spawnDistance + Math.random() * 30;
        
        const x = targetPosition.x + Math.cos(angle) * distance;
        const z = targetPosition.z + Math.sin(angle) * distance;
        
        const policeman = this.createPoliceman(x, z);
        this.police.push(policeman);
        
        console.log(`👮 警察出现! 当前警察数: ${this.police.length}`);
    }
    
    /**
     * 创建警察模型
     */
    createPoliceman(x, z) {
        const group = new THREE.Group();
        
        // 警察摩托车
        // 车身
        const bodyGeometry = new THREE.BoxGeometry(1, 0.8, 2.5);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x1a237e }); // 深蓝色
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.8;
        body.castShadow = true;
        group.add(body);
        
        // 警灯
        const lightGeometry = new THREE.BoxGeometry(0.8, 0.3, 0.4);
        const redLight = new THREE.Mesh(lightGeometry, new THREE.MeshBasicMaterial({ color: 0xff0000 }));
        const blueLight = new THREE.Mesh(lightGeometry, new THREE.MeshBasicMaterial({ color: 0x0000ff }));
        redLight.position.set(-0.3, 1.4, 0);
        blueLight.position.set(0.3, 1.4, 0);
        group.add(redLight);
        group.add(blueLight);
        
        // 警察人物
        // 身体
        const torsoGeometry = new THREE.BoxGeometry(0.6, 0.8, 0.4);
        const torsoMaterial = new THREE.MeshLambertMaterial({ color: 0x1565c0 }); // 警服蓝
        const torso = new THREE.Mesh(torsoGeometry, torsoMaterial);
        torso.position.set(0, 1.8, -0.3);
        torso.castShadow = true;
        group.add(torso);
        
        // 头部
        const headGeometry = new THREE.SphereGeometry(0.25, 16, 16);
        const headMaterial = new THREE.MeshLambertMaterial({ color: 0xffcc99 });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.set(0, 2.4, -0.3);
        head.castShadow = true;
        group.add(head);
        
        // 警帽
        const hatGeometry = new THREE.CylinderGeometry(0.3, 0.28, 0.2, 16);
        const hatMaterial = new THREE.MeshLambertMaterial({ color: 0x1a237e });
        const hat = new THREE.Mesh(hatGeometry, hatMaterial);
        hat.position.set(0, 2.65, -0.3);
        group.add(hat);
        
        // 车轮
        const wheelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.2, 16);
        const wheelMaterial = new THREE.MeshLambertMaterial({ color: 0x222222 });
        
        const frontWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        frontWheel.rotation.z = Math.PI / 2;
        frontWheel.position.set(0, 0.4, 1);
        frontWheel.castShadow = true;
        group.add(frontWheel);
        
        const rearWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        rearWheel.rotation.z = Math.PI / 2;
        rearWheel.position.set(0, 0.4, -1);
        rearWheel.castShadow = true;
        group.add(rearWheel);
        
        group.position.set(x, 0, z);
        this.scene.add(group);
        
        return {
            mesh: group,
            redLight,
            blueLight,
            lightTimer: 0,
            speed: CONFIG.police.speed,
            catchRadius: CONFIG.police.catchRadius
        };
    }
    
    /**
     * 更新所有警察
     * @param {THREE.Vector3} playerPosition - 玩家位置
     * @param {number} deltaTime - 时间增量
     * @returns {boolean} - 是否抓到玩家
     */
    update(playerPosition, deltaTime) {
        let caught = false;
        
        // 生成新警察
        this.spawnTimer += deltaTime;
        if (this.spawnTimer >= this.spawnInterval) {
            if (Math.random() < CONFIG.police.spawnChance) {
                this.spawnPolice(playerPosition);
            }
            this.spawnTimer = 0;
        }
        
        // 更新每个警察
        for (let i = this.police.length - 1; i >= 0; i--) {
            const policeman = this.police[i];
            
            // 更新警灯闪烁
            policeman.lightTimer += deltaTime * 5;
            const lightState = Math.floor(policeman.lightTimer) % 2;
            policeman.redLight.material.opacity = lightState === 0 ? 1 : 0.3;
            policeman.blueLight.material.opacity = lightState === 1 ? 1 : 0.3;
            
            // 计算到玩家的方向
            const direction = new THREE.Vector3();
            direction.subVectors(playerPosition, policeman.mesh.position);
            direction.y = 0;
            const distance = direction.length();
            
            // 如果玩家太远，移除警察
            if (distance > CONFIG.police.despawnDistance) {
                this.scene.remove(policeman.mesh);
                this.police.splice(i, 1);
                console.log(`👮 警察离开 (距离太远)`);
                continue;
            }
            
            // 追逐玩家
            direction.normalize();
            policeman.mesh.position.x += direction.x * policeman.speed * deltaTime;
            policeman.mesh.position.z += direction.z * policeman.speed * deltaTime;
            
            // 让警察面向玩家
            policeman.mesh.lookAt(new THREE.Vector3(
                playerPosition.x,
                policeman.mesh.position.y,
                playerPosition.z
            ));
            
            // 检查是否抓到玩家
            if (distance < policeman.catchRadius) {
                caught = true;
                // 抓到后警察消失
                this.scene.remove(policeman.mesh);
                this.police.splice(i, 1);
                console.log(`🚨 被警察抓到了！`);
            }
        }
        
        return caught;
    }
    
    /**
     * 获取警察数量
     */
    getCount() {
        return this.police.length;
    }
    
    /**
     * 清除所有警察
     */
    clear() {
        this.police.forEach(policeman => {
            this.scene.remove(policeman.mesh);
        });
        this.police = [];
    }
    
    /**
     * 重置
     */
    reset() {
        this.clear();
        this.spawnTimer = 0;
    }
}
