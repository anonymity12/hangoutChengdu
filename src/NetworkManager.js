import { io } from 'socket.io-client';
import * as THREE from 'three';
import { CONFIG } from './config.js';

/**
 * 网络管理器 - 处理多人联机
 */
export class NetworkManager {
    constructor(game) {
        this.game = game;
        this.socket = null;
        this.playerId = null;
        this.playerData = null;
        this.roomId = null;
        this.otherPlayers = new Map();  // 其他玩家
        this.isConnected = false;
        this.isMultiplayer = false;
        
        // 网络配置
        this.serverUrl = this.getServerUrl();
        this.syncInterval = 50;  // 位置同步间隔 (ms)
        this.lastSyncTime = 0;
        
        // 碰撞检测
        this.playerCollisionRadius = 3;
        this.collisionCooldowns = new Map();  // 避免重复碰撞
    }
    
    /**
     * 获取服务器URL
     */
    getServerUrl() {
        // 开发环境使用 localhost，生产环境使用当前域名
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'http://localhost:3000';
        }
        return window.location.origin;
    }
    
    /**
     * 连接到服务器
     */
    async connect() {
        return new Promise((resolve, reject) => {
            try {
                this.socket = io(this.serverUrl, {
                    transports: ['websocket', 'polling']
                });
                
                this.socket.on('connect', () => {
                    console.log('🔌 已连接到服务器');
                    this.isConnected = true;
                    resolve();
                });
                
                this.socket.on('connect_error', (error) => {
                    console.error('❌ 连接失败:', error);
                    reject(error);
                });
                
                this.setupEventListeners();
            } catch (error) {
                reject(error);
            }
        });
    }
    
    /**
     * 设置事件监听
     */
    setupEventListeners() {
        // 加入房间成功
        this.socket.on('joinedRoom', (data) => {
            console.log('✅ 加入房间成功:', data);
            this.playerId = data.playerId;
            this.playerData = data.playerData;
            this.roomId = data.roomId;
            this.isMultiplayer = true;
            
            // 更新本地玩家初始位置
            if (this.game.vehicle) {
                this.game.vehicle.mesh.position.set(
                    data.playerData.position.x,
                    0,
                    data.playerData.position.z
                );
            }
            
            // 更新初始金币
            this.game.coins = data.playerData.coins;
            
            // 显示加入消息
            if (this.game.uiManager) {
                this.game.uiManager.showCoinNotification(0, `加入房间 ${data.roomId}`);
            }
        });
        
        // 新玩家加入
        this.socket.on('playerJoined', (playerData) => {
            console.log('👤 新玩家加入:', playerData.name);
            this.addOtherPlayer(playerData);
            
            if (this.game.uiManager) {
                this.game.uiManager.showCoinNotification(0, `${playerData.name} 加入了游戏`);
            }
        });
        
        // 玩家列表更新
        this.socket.on('playerList', (players) => {
            players.forEach(player => {
                if (player.id !== this.playerId) {
                    if (!this.otherPlayers.has(player.id)) {
                        this.addOtherPlayer(player);
                    }
                }
            });
        });
        
        // 玩家移动
        this.socket.on('playerMoved', (data) => {
            const player = this.otherPlayers.get(data.id);
            if (player) {
                player.targetPosition = new THREE.Vector3(
                    data.position.x,
                    data.position.y,
                    data.position.z
                );
                player.targetRotation = data.rotation.y;
                player.velocity = data.velocity;
            }
        });
        
        // 玩家离开
        this.socket.on('playerLeft', (data) => {
            console.log('👤 玩家离开:', data.name);
            this.removeOtherPlayer(data.id);
            
            if (this.game.uiManager) {
                this.game.uiManager.showCoinNotification(0, `${data.name} 离开了游戏`);
            }
        });
        
        // 金币更新
        this.socket.on('coinsUpdated', (data) => {
            data.players.forEach(p => {
                if (p.id === this.playerId) {
                    this.game.coins = p.coins;
                } else {
                    const player = this.otherPlayers.get(p.id);
                    if (player) {
                        player.coins = p.coins;
                    }
                }
            });
            
            if (this.game.uiManager) {
                this.game.uiManager.showCoinNotification(-data.penalty, '玩家碰撞!');
            }
            
            if (this.game.audioManager) {
                this.game.audioManager.playCollision();
            }
        });
        
        // 玩家金币变化
        this.socket.on('playerCoinsChanged', (data) => {
            if (data.id !== this.playerId) {
                const player = this.otherPlayers.get(data.id);
                if (player) {
                    player.coins = data.coins;
                }
            }
        });
        
        // 玩家被淘汰
        this.socket.on('playerEliminated', (data) => {
            console.log('💀 玩家被淘汰:', data.name);
            
            if (data.id === this.playerId) {
                // 自己被淘汰
                this.game.vehicle.isDestroyed = true;
                if (this.game.uiManager) {
                    this.game.uiManager.showGameOver();
                }
            } else {
                // 其他玩家被淘汰
                const player = this.otherPlayers.get(data.id);
                if (player) {
                    player.isAlive = false;
                    // 可以添加淘汰动画效果
                }
            }
            
            if (this.game.uiManager) {
                this.game.uiManager.showCoinNotification(0, `${data.name} 被淘汰!`);
            }
        });
        
        // 游戏开始
        this.socket.on('gameStarted', (data) => {
            console.log('🎮 游戏开始!');
            this.game.coins = CONFIG.multiplayer?.startingCoins || 100;
            
            if (this.game.uiManager) {
                this.game.uiManager.showCoinNotification(0, '游戏开始!');
            }
        });
        
        // 游戏结束
        this.socket.on('gameOver', (data) => {
            console.log('🏆 游戏结束!', data.winner);
            
            if (data.winner) {
                const isWinner = data.winner.id === this.playerId;
                const message = isWinner ? '🏆 你赢了!' : `🏆 ${data.winner.name} 获胜!`;
                if (this.game.uiManager) {
                    this.game.uiManager.showCoinNotification(0, message);
                }
            }
        });
        
        // 错误处理
        this.socket.on('error', (error) => {
            console.error('❌ 服务器错误:', error);
            if (this.game.uiManager) {
                this.game.uiManager.showCoinNotification(0, error.message);
            }
        });
        
        // 断开连接
        this.socket.on('disconnect', () => {
            console.log('🔌 断开连接');
            this.isConnected = false;
            this.isMultiplayer = false;
        });
    }
    
    /**
     * 加入房间
     */
    joinRoom(roomId, playerName) {
        if (!this.isConnected) {
            console.error('未连接到服务器');
            return;
        }
        
        this.socket.emit('joinRoom', {
            roomId: roomId || 'default',
            playerName: playerName || '玩家'
        });
    }
    
    /**
     * 添加其他玩家
     */
    addOtherPlayer(playerData) {
        if (this.otherPlayers.has(playerData.id)) return;
        
        // 创建其他玩家的三轮车模型
        const playerMesh = this.createPlayerMesh(playerData.color);
        playerMesh.position.set(
            playerData.position.x,
            0,
            playerData.position.z
        );
        
        // 添加玩家名称标签
        const nameSprite = this.createNameSprite(playerData.name, playerData.color);
        nameSprite.position.y = 4;
        playerMesh.add(nameSprite);
        
        this.game.scene.add(playerMesh);
        
        this.otherPlayers.set(playerData.id, {
            id: playerData.id,
            name: playerData.name,
            color: playerData.color,
            coins: playerData.coins,
            mesh: playerMesh,
            targetPosition: new THREE.Vector3(playerData.position.x, 0, playerData.position.z),
            targetRotation: playerData.rotation?.y || 0,
            velocity: { x: 0, y: 0, z: 0 },
            isAlive: playerData.isAlive
        });
        
        console.log(`添加玩家模型: ${playerData.name}`);
    }
    
    /**
     * 创建玩家三轮车模型
     */
    createPlayerMesh(color) {
        const group = new THREE.Group();
        
        // 简化版三轮车模型
        // 车身
        const bodyGeometry = new THREE.BoxGeometry(2.5, 1, 3.5);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.8;
        body.castShadow = true;
        group.add(body);
        
        // 车篷
        const canopyGeometry = new THREE.BoxGeometry(2.5, 0.1, 2.5);
        const canopyMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
        const canopy = new THREE.Mesh(canopyGeometry, canopyMaterial);
        canopy.position.set(0, 2, -0.3);
        group.add(canopy);
        
        // 车轮
        const wheelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.25, 16);
        const wheelMaterial = new THREE.MeshLambertMaterial({ color: 0x222222 });
        
        // 前轮
        const frontWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        frontWheel.rotation.z = Math.PI / 2;
        frontWheel.position.set(0, 0.4, 1.5);
        group.add(frontWheel);
        
        // 后轮
        [-1, 1].forEach(side => {
            const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(side * 1.2, 0.4, -1);
            group.add(wheel);
        });
        
        return group;
    }
    
    /**
     * 创建玩家名称精灵
     */
    createNameSprite(name, color) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        canvas.width = 256;
        canvas.height = 64;
        
        // 背景
        context.fillStyle = 'rgba(0, 0, 0, 0.6)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // 名称
        context.font = 'bold 32px Microsoft YaHei, sans-serif';
        context.fillStyle = '#FFFFFF';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(name, canvas.width / 2, canvas.height / 2);
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(8, 2, 1);
        
        return sprite;
    }
    
    /**
     * 移除其他玩家
     */
    removeOtherPlayer(playerId) {
        const player = this.otherPlayers.get(playerId);
        if (player) {
            this.game.scene.remove(player.mesh);
            this.otherPlayers.delete(playerId);
        }
    }
    
    /**
     * 发送位置更新
     */
    sendPositionUpdate() {
        if (!this.isConnected || !this.isMultiplayer || !this.game.vehicle) return;
        
        const now = Date.now();
        if (now - this.lastSyncTime < this.syncInterval) return;
        this.lastSyncTime = now;
        
        const vehicle = this.game.vehicle;
        
        this.socket.emit('updatePosition', {
            position: {
                x: vehicle.position.x,
                y: vehicle.position.y,
                z: vehicle.position.z
            },
            rotation: {
                y: vehicle.rotation.y
            },
            velocity: {
                x: vehicle.velocity.x,
                y: vehicle.velocity.y,
                z: vehicle.velocity.z
            }
        });
    }
    
    /**
     * 发送金币更新
     */
    sendCoinsUpdate(coins) {
        if (!this.isConnected || !this.isMultiplayer) return;
        
        this.socket.emit('updateCoins', { coins });
    }
    
    /**
     * 检测与其他玩家的碰撞
     */
    checkPlayerCollisions() {
        if (!this.isMultiplayer || !this.game.vehicle) return;
        
        const myPosition = this.game.vehicle.position;
        const now = Date.now();
        
        for (const [playerId, player] of this.otherPlayers) {
            if (!player.isAlive) continue;
            
            // 检查碰撞冷却
            const cooldownKey = playerId;
            if (this.collisionCooldowns.has(cooldownKey)) {
                if (now - this.collisionCooldowns.get(cooldownKey) < 1000) continue;
            }
            
            // 计算距离
            const dx = myPosition.x - player.mesh.position.x;
            const dz = myPosition.z - player.mesh.position.z;
            const distance = Math.sqrt(dx * dx + dz * dz);
            
            if (distance < this.playerCollisionRadius * 2) {
                // 碰撞发生
                this.collisionCooldowns.set(cooldownKey, now);
                
                this.socket.emit('playerCollision', {
                    otherId: playerId
                });
                
                console.log(`💥 与 ${player.name} 碰撞!`);
            }
        }
    }
    
    /**
     * 更新其他玩家位置（插值）
     */
    update(deltaTime) {
        if (!this.isMultiplayer) return;
        
        // 发送自己的位置
        this.sendPositionUpdate();
        
        // 检测玩家碰撞
        this.checkPlayerCollisions();
        
        // 更新其他玩家位置（平滑插值）
        for (const [id, player] of this.otherPlayers) {
            if (player.mesh && player.targetPosition) {
                player.mesh.position.lerp(player.targetPosition, 0.2);
                
                // 平滑旋转
                const currentY = player.mesh.rotation.y;
                const targetY = player.targetRotation;
                player.mesh.rotation.y = currentY + (targetY - currentY) * 0.2;
            }
        }
    }
    
    /**
     * 发送聊天消息
     */
    sendChatMessage(message) {
        if (!this.isConnected || !this.isMultiplayer) return;
        
        this.socket.emit('chatMessage', message);
    }
    
    /**
     * 开始游戏
     */
    startGame() {
        if (!this.isConnected || !this.isMultiplayer) return;
        
        this.socket.emit('startGame');
    }
    
    /**
     * 断开连接
     */
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
        }
        
        // 清理其他玩家
        for (const [id, player] of this.otherPlayers) {
            this.game.scene.remove(player.mesh);
        }
        this.otherPlayers.clear();
        
        this.isConnected = false;
        this.isMultiplayer = false;
    }
    
    /**
     * 获取其他玩家数量
     */
    getPlayerCount() {
        return this.otherPlayers.size + 1;
    }
    
    /**
     * 获取所有玩家信息
     */
    getAllPlayers() {
        const players = [];
        
        // 添加自己
        if (this.playerData) {
            players.push({
                id: this.playerId,
                name: this.playerData.name,
                coins: this.game.coins,
                isLocal: true
            });
        }
        
        // 添加其他玩家
        for (const [id, player] of this.otherPlayers) {
            players.push({
                id: player.id,
                name: player.name,
                coins: player.coins,
                isLocal: false
            });
        }
        
        return players;
    }
}
