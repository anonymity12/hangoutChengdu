import { CONFIG } from './config.js';

/**
 * 输入控制器 - 管理键盘和触摸输入
 */
export class InputController {
    constructor() {
        this.keys = {};
        this.touchControls = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            brake: false
        };
        this.callbacks = {
            reset: null
        };
        
        // 相机拖拽控制
        this.isDragging = false;
        this.lastDragPosition = { x: 0, y: 0 };
        this.cameraRotation = { azimuth: 0, polar: Math.PI / 4 }; // 方位角和极角
        this.cameraDistance = 17;
        
        this.setupKeyboardControls();
        this.setupTouchControls();
        this.setupCameraDragControls();
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
        setupTouchButton('btn-backward', 'backward');
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
            backward: this.keys['s'] || this.keys['arrowdown'] || this.touchControls.backward,
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
     * 设置相机拖拽控制
     */
    setupCameraDragControls() {
        const canvas = document.getElementById('gameCanvas');
        if (!canvas) return;
        
        // 鼠标事件
        canvas.addEventListener('mousedown', (e) => this.onDragStart(e.clientX, e.clientY, e));
        canvas.addEventListener('mousemove', (e) => this.onDragMove(e.clientX, e.clientY));
        canvas.addEventListener('mouseup', () => this.onDragEnd());
        canvas.addEventListener('mouseleave', () => this.onDragEnd());
        
        // 触摸事件（双指或单指在非控制区域）
        canvas.addEventListener('touchstart', (e) => {
            // 如果是在移动控制按钮上，不处理相机旋转
            if (e.target.classList.contains('control-btn')) return;
            if (e.touches.length === 1) {
                const touch = e.touches[0];
                this.onDragStart(touch.clientX, touch.clientY, e);
            }
        }, { passive: false });
        
        canvas.addEventListener('touchmove', (e) => {
            if (this.isDragging && e.touches.length === 1) {
                const touch = e.touches[0];
                this.onDragMove(touch.clientX, touch.clientY);
            }
        }, { passive: false });
        
        canvas.addEventListener('touchend', () => this.onDragEnd());
        canvas.addEventListener('touchcancel', () => this.onDragEnd());
        
        // 鼠标滚轮缩放
        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoomSpeed = 0.001;
            this.cameraDistance += e.deltaY * zoomSpeed * this.cameraDistance;
            this.cameraDistance = Math.max(
                CONFIG.camera.minDistance,
                Math.min(CONFIG.camera.maxDistance, this.cameraDistance)
            );
        }, { passive: false });
    }
    
    /**
     * 拖拽开始
     */
    onDragStart(x, y, event) {
        // 检查是否点击在控制按钮上
        if (event && event.target && event.target.classList.contains('control-btn')) {
            return;
        }
        this.isDragging = true;
        this.lastDragPosition = { x, y };
    }
    
    /**
     * 拖拽移动
     */
    onDragMove(x, y) {
        if (!this.isDragging) return;
        
        const deltaX = x - this.lastDragPosition.x;
        const deltaY = y - this.lastDragPosition.y;
        
        // 更新方位角（水平旋转）
        this.cameraRotation.azimuth -= deltaX * CONFIG.camera.rotationSpeed;
        
        // 更新极角（垂直旋转），并限制范围
        this.cameraRotation.polar += deltaY * CONFIG.camera.rotationSpeed;
        this.cameraRotation.polar = Math.max(
            CONFIG.camera.minPolarAngle,
            Math.min(CONFIG.camera.maxPolarAngle, this.cameraRotation.polar)
        );
        
        this.lastDragPosition = { x, y };
    }
    
    /**
     * 拖拽结束
     */
    onDragEnd() {
        this.isDragging = false;
    }
    
    /**
     * 获取相机旋转状态
     * @returns {Object} 相机旋转信息
     */
    getCameraState() {
        return {
            azimuth: this.cameraRotation.azimuth,
            polar: this.cameraRotation.polar,
            distance: this.cameraDistance,
            isDragging: this.isDragging
        };
    }
    
    /**
     * 重置所有输入状态
     */
    reset() {
        this.keys = {};
        this.touchControls = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            brake: false
        };
    }
    
    /**
     * 重置相机视角
     */
    resetCameraView() {
        this.cameraRotation = { azimuth: 0, polar: Math.PI / 4 };
        this.cameraDistance = CONFIG.camera.defaultDistance;
    }
}
