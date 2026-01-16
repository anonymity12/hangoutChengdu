/**
 * 成都闲逛 - HangoutChengdu
 * 游戏入口文件
 */

import { Game } from './src/Game.js';

// 创建并初始化游戏
window.addEventListener('DOMContentLoaded', () => {
    console.log('🐼 欢迎来到成都闲逛！');
    
    const game = new Game();
    game.init().catch(error => {
        console.error('❌ 游戏初始化失败:', error);
    });
    
    // 暴露给全局以便调试
    window.game = game;
});
