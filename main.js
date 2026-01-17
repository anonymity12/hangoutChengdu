/**
 * 成都闲逛 - HangoutChengdu
 * 游戏入口文件
 */

import { Game } from './src/Game.js';

let game = null;

/**
 * 启动游戏
 */
async function startGame(mode, playerName, roomId) {
    // 隐藏大厅，显示加载
    document.getElementById('lobby-overlay').style.display = 'none';
    document.getElementById('loading').style.display = 'block';
    
    // 创建游戏实例
    game = new Game();
    
    // 如果是联机模式，设置URL参数
    if (mode === 'multiplayer') {
        const url = new URL(window.location);
        url.searchParams.set('room', roomId || generateRoomId());
        url.searchParams.set('name', playerName || '玩家');
        window.history.replaceState({}, '', url);
    }
    
    try {
        await game.init();
        
        // 联机模式显示玩家列表
        if (mode === 'multiplayer') {
            document.getElementById('player-list').style.display = 'block';
        }
    } catch (error) {
        console.error('❌ 游戏初始化失败:', error);
    }
    
    // 暴露给全局以便调试
    window.game = game;
}

/**
 * 生成随机房间ID
 */
function generateRoomId() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// 页面加载完成后设置事件监听
window.addEventListener('DOMContentLoaded', () => {
    console.log('🐼 欢迎来到成都闲逛！');
    
    const lobbyOverlay = document.getElementById('lobby-overlay');
    const playerNameInput = document.getElementById('player-name');
    const roomIdInput = document.getElementById('room-id');
    const btnSinglePlayer = document.getElementById('btn-single-player');
    const btnMultiplayer = document.getElementById('btn-multiplayer');
    
    // 检查URL是否有房间参数（直接加入房间）
    const urlParams = new URLSearchParams(window.location.search);
    const urlRoom = urlParams.get('room');
    const urlName = urlParams.get('name');
    
    if (urlRoom) {
        // 直接从URL加入房间
        startGame('multiplayer', urlName || '玩家', urlRoom);
        return;
    }
    
    // 单人模式
    btnSinglePlayer.addEventListener('click', () => {
        const playerName = playerNameInput.value.trim() || '玩家';
        startGame('single', playerName, null);
    });
    
    // 联机模式
    btnMultiplayer.addEventListener('click', () => {
        const playerName = playerNameInput.value.trim() || '玩家';
        const roomId = roomIdInput.value.trim() || generateRoomId();
        startGame('multiplayer', playerName, roomId);
    });
    
    // 回车键快速开始
    playerNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            btnSinglePlayer.click();
        }
    });
    
    roomIdInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            btnMultiplayer.click();
        }
    });
});
