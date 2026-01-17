import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// 游戏配置
const CONFIG = {
    maxPlayers: 6,
    playerCollisionPenalty: 20,  // 玩家碰撞掉落金币
    startingCoins: 100,          // 初始金币
    syncInterval: 50,            // 同步间隔(ms)
    roomCleanupInterval: 30000   // 房间清理间隔
};

// 房间管理
const rooms = new Map();

// 玩家颜色
const PLAYER_COLORS = [
    0xFF4444, // 红
    0x44FF44, // 绿
    0x4444FF, // 蓝
    0xFFFF44, // 黄
    0xFF44FF, // 紫
    0x44FFFF  // 青
];

/**
 * 创建新房间
 */
function createRoom(roomId) {
    return {
        id: roomId,
        players: new Map(),
        gameState: 'waiting', // waiting, playing, ended
        createdAt: Date.now()
    };
}

/**
 * 获取或创建房间
 */
function getOrCreateRoom(roomId) {
    if (!rooms.has(roomId)) {
        rooms.set(roomId, createRoom(roomId));
        console.log(`🏠 创建房间: ${roomId}`);
    }
    return rooms.get(roomId);
}

/**
 * 获取可用的玩家颜色
 */
function getAvailableColor(room) {
    const usedColors = new Set([...room.players.values()].map(p => p.color));
    for (const color of PLAYER_COLORS) {
        if (!usedColors.has(color)) return color;
    }
    return PLAYER_COLORS[0];
}

/**
 * 广播房间内玩家列表
 */
function broadcastPlayerList(roomId) {
    const room = rooms.get(roomId);
    if (!room) return;
    
    const playerList = [...room.players.values()].map(p => ({
        id: p.id,
        name: p.name,
        color: p.color,
        coins: p.coins,
        position: p.position,
        rotation: p.rotation,
        isAlive: p.isAlive
    }));
    
    io.to(roomId).emit('playerList', playerList);
}

// Socket.IO 连接处理
io.on('connection', (socket) => {
    console.log(`🔌 玩家连接: ${socket.id}`);
    
    let currentRoom = null;
    let playerData = null;
    
    // 加入房间
    socket.on('joinRoom', (data) => {
        const { roomId, playerName } = data;
        
        // 检查房间人数
        const room = getOrCreateRoom(roomId);
        if (room.players.size >= CONFIG.maxPlayers) {
            socket.emit('error', { message: '房间已满（最多6人）' });
            return;
        }
        
        // 创建玩家数据
        playerData = {
            id: socket.id,
            name: playerName || `玩家${room.players.size + 1}`,
            color: getAvailableColor(room),
            coins: CONFIG.startingCoins,
            position: { x: 0, y: 0, z: 0 },
            rotation: { y: 0 },
            velocity: { x: 0, y: 0, z: 0 },
            isAlive: true,
            lastUpdate: Date.now()
        };
        
        // 随机初始位置（避免重叠）
        const angle = (room.players.size / CONFIG.maxPlayers) * Math.PI * 2;
        const radius = 20;
        playerData.position.x = Math.cos(angle) * radius;
        playerData.position.z = Math.sin(angle) * radius;
        
        // 加入房间
        socket.join(roomId);
        room.players.set(socket.id, playerData);
        currentRoom = roomId;
        
        console.log(`👤 ${playerData.name} 加入房间 ${roomId} (${room.players.size}/${CONFIG.maxPlayers})`);
        
        // 发送加入成功消息
        socket.emit('joinedRoom', {
            roomId,
            playerId: socket.id,
            playerData,
            config: CONFIG
        });
        
        // 广播新玩家加入
        socket.to(roomId).emit('playerJoined', playerData);
        
        // 发送当前所有玩家
        broadcastPlayerList(roomId);
    });
    
    // 玩家位置更新
    socket.on('updatePosition', (data) => {
        if (!currentRoom || !playerData) return;
        
        const room = rooms.get(currentRoom);
        if (!room) return;
        
        // 更新玩家数据
        playerData.position = data.position;
        playerData.rotation = data.rotation;
        playerData.velocity = data.velocity || { x: 0, y: 0, z: 0 };
        playerData.lastUpdate = Date.now();
        
        // 广播给其他玩家
        socket.to(currentRoom).emit('playerMoved', {
            id: socket.id,
            position: data.position,
            rotation: data.rotation,
            velocity: data.velocity
        });
    });
    
    // 玩家碰撞事件
    socket.on('playerCollision', (data) => {
        if (!currentRoom || !playerData) return;
        
        const room = rooms.get(currentRoom);
        if (!room) return;
        
        const otherPlayer = room.players.get(data.otherId);
        if (!otherPlayer) return;
        
        // 双方扣除金币
        const penalty = CONFIG.playerCollisionPenalty;
        
        playerData.coins = Math.max(0, playerData.coins - penalty);
        otherPlayer.coins = Math.max(0, otherPlayer.coins - penalty);
        
        console.log(`💥 碰撞: ${playerData.name} vs ${otherPlayer.name}, 各扣${penalty}金币`);
        
        // 检查是否失败
        if (playerData.coins <= 0) {
            playerData.isAlive = false;
            io.to(currentRoom).emit('playerEliminated', { id: socket.id, name: playerData.name });
        }
        if (otherPlayer.coins <= 0) {
            otherPlayer.isAlive = false;
            io.to(currentRoom).emit('playerEliminated', { id: otherPlayer.id, name: otherPlayer.name });
        }
        
        // 广播金币更新
        io.to(currentRoom).emit('coinsUpdated', {
            players: [
                { id: socket.id, coins: playerData.coins },
                { id: otherPlayer.id, coins: otherPlayer.coins }
            ],
            penalty
        });
        
        // 检查游戏是否结束
        const alivePlayers = [...room.players.values()].filter(p => p.isAlive);
        if (alivePlayers.length <= 1 && room.players.size > 1) {
            const winner = alivePlayers[0];
            io.to(currentRoom).emit('gameOver', {
                winner: winner ? { id: winner.id, name: winner.name, coins: winner.coins } : null
            });
            room.gameState = 'ended';
        }
    });
    
    // 金币更新（捡到地标金币等）
    socket.on('updateCoins', (data) => {
        if (!currentRoom || !playerData) return;
        
        playerData.coins = Math.max(0, data.coins);
        
        // 广播给所有玩家
        io.to(currentRoom).emit('playerCoinsChanged', {
            id: socket.id,
            coins: playerData.coins
        });
        
        // 检查是否失败
        if (playerData.coins <= 0 && playerData.isAlive) {
            playerData.isAlive = false;
            io.to(currentRoom).emit('playerEliminated', { id: socket.id, name: playerData.name });
        }
    });
    
    // 聊天消息
    socket.on('chatMessage', (message) => {
        if (!currentRoom || !playerData) return;
        
        io.to(currentRoom).emit('chatMessage', {
            playerId: socket.id,
            playerName: playerData.name,
            message: message.substring(0, 100), // 限制长度
            timestamp: Date.now()
        });
    });
    
    // 开始游戏
    socket.on('startGame', () => {
        if (!currentRoom) return;
        
        const room = rooms.get(currentRoom);
        if (!room || room.gameState !== 'waiting') return;
        
        room.gameState = 'playing';
        
        // 重置所有玩家
        room.players.forEach((player, id) => {
            player.coins = CONFIG.startingCoins;
            player.isAlive = true;
        });
        
        io.to(currentRoom).emit('gameStarted', {
            players: [...room.players.values()].map(p => ({
                id: p.id,
                name: p.name,
                color: p.color,
                coins: p.coins,
                position: p.position
            }))
        });
        
        console.log(`🎮 房间 ${currentRoom} 游戏开始!`);
    });
    
    // 断开连接
    socket.on('disconnect', () => {
        console.log(`🔌 玩家断开: ${socket.id}`);
        
        if (currentRoom && playerData) {
            const room = rooms.get(currentRoom);
            if (room) {
                room.players.delete(socket.id);
                
                // 通知其他玩家
                socket.to(currentRoom).emit('playerLeft', {
                    id: socket.id,
                    name: playerData.name
                });
                
                // 如果房间空了，删除房间
                if (room.players.size === 0) {
                    rooms.delete(currentRoom);
                    console.log(`🏠 删除空房间: ${currentRoom}`);
                } else {
                    broadcastPlayerList(currentRoom);
                }
            }
        }
    });
});

// 定期清理空房间
setInterval(() => {
    const now = Date.now();
    for (const [roomId, room] of rooms) {
        if (room.players.size === 0 && now - room.createdAt > CONFIG.roomCleanupInterval) {
            rooms.delete(roomId);
            console.log(`🧹 清理空房间: ${roomId}`);
        }
    }
}, CONFIG.roomCleanupInterval);

// 静态文件服务（生产环境）
app.use(express.static(path.join(__dirname, 'dist')));

// API: 获取房间列表
app.get('/api/rooms', (req, res) => {
    const roomList = [...rooms.values()].map(room => ({
        id: room.id,
        playerCount: room.players.size,
        maxPlayers: CONFIG.maxPlayers,
        gameState: room.gameState
    }));
    res.json(roomList);
});

// 所有其他路由返回 index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
    console.log(`📡 WebSocket 服务已启动`);
});
