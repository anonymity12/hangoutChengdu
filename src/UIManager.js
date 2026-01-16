import { CONFIG } from './config.js';

/**
 * UI管理器 - 管理所有用户界面元素
 */
export class UIManager {
    constructor() {
        // 获取UI元素
        this.distanceEl = document.getElementById('distance');
        this.speedEl = document.getElementById('speed');
        this.timeEl = document.getElementById('time');
        this.locationEl = document.getElementById('location-info');
        this.loadingEl = document.getElementById('loading');
        
        // 创建健康条UI
        this.healthBarContainer = null;
        this.healthBar = null;
        this.healthText = null;
        this.collisionCountEl = null;
        this.damageWarning = null;
        
        this.locationTimeout = null;
        
        this.createHealthUI();
        this.createDamageWarning();
    }
    
    /**
     * 创建健康条UI
     */
    createHealthUI() {
        const statsPanel = document.getElementById('stats-panel');
        if (!statsPanel) return;
        
        // 健康条容器
        const healthItem = document.createElement('div');
        healthItem.className = 'stat-item';
        healthItem.innerHTML = `
            <span class="stat-label">车辆状态:</span>
            <span id="health-text">100%</span>
        `;
        statsPanel.appendChild(healthItem);
        
        // 健康条
        const healthBarContainer = document.createElement('div');
        healthBarContainer.style.cssText = `
            width: 100%;
            height: 8px;
            background: rgba(255, 255, 255, 0.3);
            border-radius: 4px;
            margin-top: 5px;
            overflow: hidden;
        `;
        
        const healthBar = document.createElement('div');
        healthBar.id = 'health-bar';
        healthBar.style.cssText = `
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, #4CAF50, #8BC34A);
            transition: width 0.3s, background 0.3s;
            border-radius: 4px;
        `;
        healthBarContainer.appendChild(healthBar);
        statsPanel.appendChild(healthBarContainer);
        
        // 碰撞计数
        const collisionItem = document.createElement('div');
        collisionItem.className = 'stat-item';
        collisionItem.style.marginTop = '5px';
        collisionItem.innerHTML = `
            <span class="stat-label">碰撞次数:</span>
            <span id="collision-count">0</span>
        `;
        statsPanel.appendChild(collisionItem);
        
        this.healthBarContainer = healthBarContainer;
        this.healthBar = healthBar;
        this.healthText = document.getElementById('health-text');
        this.collisionCountEl = document.getElementById('collision-count');
    }
    
    /**
     * 创建伤害警告UI
     */
    createDamageWarning() {
        const warning = document.createElement('div');
        warning.id = 'damage-warning';
        warning.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(255, 0, 0, 0.8);
            color: white;
            padding: 20px 40px;
            border-radius: 10px;
            font-size: 24px;
            font-weight: bold;
            display: none;
            animation: pulse 0.5s infinite;
            z-index: 200;
        `;
        warning.textContent = '⚠️ 车辆严重损坏！';
        
        // 添加动画样式
        const style = document.createElement('style');
        style.textContent = `
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }
        `;
        document.head.appendChild(style);
        
        document.getElementById('ui-overlay').appendChild(warning);
        this.damageWarning = warning;
    }
    
    /**
     * 隐藏加载界面
     */
    hideLoading() {
        if (this.loadingEl) {
            setTimeout(() => {
                this.loadingEl.style.display = 'none';
            }, 1000);
        }
    }
    
    /**
     * 更新行驶距离显示
     * @param {number} distance - 距离（米）
     */
    updateDistance(distance) {
        if (this.distanceEl) {
            this.distanceEl.textContent = `${(distance / 10).toFixed(2)} km`;
        }
    }
    
    /**
     * 更新速度显示
     * @param {number} speed - 速度（km/h）
     */
    updateSpeed(speed) {
        if (this.speedEl) {
            this.speedEl.textContent = `${Math.round(speed)} km/h`;
        }
    }
    
    /**
     * 更新游戏时间显示
     * @param {number} time - 时间（秒）
     */
    updateTime(time) {
        if (this.timeEl) {
            const minutes = Math.floor(time / 60);
            const seconds = Math.floor(time % 60);
            this.timeEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }
    }
    
    /**
     * 更新健康条
     * @param {number} healthPercent - 健康百分比 (0-100)
     */
    updateHealth(healthPercent) {
        if (this.healthBar) {
            this.healthBar.style.width = `${healthPercent}%`;
            
            // 根据健康值改变颜色
            if (healthPercent > 60) {
                this.healthBar.style.background = 'linear-gradient(90deg, #4CAF50, #8BC34A)';
            } else if (healthPercent > 30) {
                this.healthBar.style.background = 'linear-gradient(90deg, #FF9800, #FFC107)';
            } else {
                this.healthBar.style.background = 'linear-gradient(90deg, #F44336, #E91E63)';
            }
        }
        
        if (this.healthText) {
            this.healthText.textContent = `${Math.round(healthPercent)}%`;
        }
        
        // 显示/隐藏危险警告
        if (this.damageWarning) {
            if (healthPercent <= CONFIG.vehicle.criticalHealth && healthPercent > 0) {
                this.damageWarning.style.display = 'block';
            } else {
                this.damageWarning.style.display = 'none';
            }
        }
    }
    
    /**
     * 更新碰撞次数
     * @param {number} count - 碰撞次数
     */
    updateCollisionCount(count) {
        if (this.collisionCountEl) {
            this.collisionCountEl.textContent = count;
        }
    }
    
    /**
     * 显示位置信息
     * @param {string} name - 位置名称
     */
    showLocationInfo(name) {
        if (this.locationEl) {
            this.locationEl.textContent = `📍 ${name}`;
            this.locationEl.style.display = 'block';
            
            clearTimeout(this.locationTimeout);
            this.locationTimeout = setTimeout(() => {
                this.locationEl.style.display = 'none';
            }, 3000);
        }
    }
    
    /**
     * 显示游戏结束界面
     */
    showGameOver() {
        if (this.damageWarning) {
            this.damageWarning.textContent = '💥 车辆已损毁！按 R 重置';
            this.damageWarning.style.display = 'block';
            this.damageWarning.style.animation = 'none';
        }
    }
    
    /**
     * 隐藏游戏结束界面
     */
    hideGameOver() {
        if (this.damageWarning) {
            this.damageWarning.style.display = 'none';
            this.damageWarning.textContent = '⚠️ 车辆严重损坏！';
            this.damageWarning.style.animation = 'pulse 0.5s infinite';
        }
    }
    
    /**
     * 更新所有UI
     * @param {Object} stats - 游戏状态
     */
    update(stats) {
        this.updateDistance(stats.distance);
        this.updateSpeed(stats.speed);
        this.updateTime(stats.time);
        this.updateHealth(stats.healthPercent);
        this.updateCollisionCount(stats.collisionCount);
        
        if (stats.isDestroyed) {
            this.showGameOver();
        }
    }
}
