import { CONFIG } from './config.js';

/**
 * 输入控制器 - 管理键盘和触摸输入
 */
export class InputController {
    constructor() {
        this.keys = {};
        this.touchControls = {
            forward: false,
            left: false,
            right: false,
            brake: false
        };
        this.callbacks = {
            reset: null
        };
        
        this.setupKeyboardControls();
        this.setupTouchControls();
    }
    
    /**
     * 设置键盘控制
     */
    setupKeyboardControls() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            
            // 特殊按键处理
            if (e.key.toLowerCase() === 'r' && this.callbacks.reset) {
                this.callbacks.reset();
            }
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
    }
    
    /**
     * 设置触摸控制
     */
    setupTouchControls() {
        const setupTouchButton = (id, control) => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    this.touchControls[control] = true;
                });
                btn.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    this.touchControls[control] = false;
                });
                btn.addEventListener('touchcancel', (e) => {
                    e.preventDefault();
                    this.touchControls[control] = false;
                });
            }
        };
        
        setupTouchButton('btn-forward', 'forward');
        setupTouchButton('btn-left', 'left');
        setupTouchButton('btn-right', 'right');
        setupTouchButton('btn-brake', 'brake');
    }
    
    /**
     * 注册重置回调
     * @param {Function} callback - 重置回调函数
     */
    onReset(callback) {
        this.callbacks.reset = callback;
    }
    
    /**
     * 获取当前输入状态
     * @returns {Object} 输入状态
     */
    getInput() {
        return {
            forward: this.keys['w'] || this.keys['arrowup'] || this.touchControls.forward,
            left: this.keys['a'] || this.keys['arrowleft'] || this.touchControls.left,
            right: this.keys['d'] || this.keys['arrowright'] || this.touchControls.right,
            brake: this.keys[' '] || this.touchControls.brake
        };
    }
    
    /**
     * 检查是否有任何输入
     * @returns {boolean} 是否有输入
     */
    hasInput() {
        const input = this.getInput();
        return input.forward || input.left || input.right || input.brake;
    }
    
    /**
     * 重置所有输入状态
     */
    reset() {
        this.keys = {};
        this.touchControls = {
            forward: false,
            left: false,
            right: false,
            brake: false
        };
    }
}
