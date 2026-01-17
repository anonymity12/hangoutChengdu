# 开发和测试说明 - Development & Testing Guide

## 项目结构

```
hangoutChengdu/
├── index.html          # 游戏主页面
├── game.js            # 游戏核心逻辑
├── README.md          # 项目说明文档
├── DEPLOYMENT.md      # 部署指南
└── .gitignore         # Git 忽略文件配置
```

## 技术实现细节

### 游戏架构

1. **渲染引擎**: Three.js (r160)
   - 使用 WebGL 渲染 3D 场景
   - 支持阴影、雾效等效果

2. **物理系统**: 简化的车辆物理
   - 速度向量控制
   - 摩擦力模拟
   - 转向系统

3. **地图系统**: 网格化城市布局
   - 50x50 米的街区网格
   - 程序化生成建筑
   - 预设的成都地标

### 关键类和方法

#### Game 类

主游戏类，包含所有游戏逻辑：

```javascript
class Game {
    constructor()      // 初始化游戏状态
    init()            // 设置场景、灯光、对象
    setupScene()      // 创建 Three.js 场景
    setupLights()     // 添加环境光和太阳光
    createGround()    // 创建地面
    createRoadNetwork() // 生成道路网络
    createBuildings() // 程序化生成建筑
    createLandmarks() // 创建成都地标
    createVehicle()   // 创建玩家车辆
    setupCamera()     // 设置相机
    updateVehicle()   // 更新车辆位置和物理
    updateCamera()    // 跟随车辆的相机
    updateUI()        // 更新界面显示
    animate()         // 游戏主循环
}
```

### 配置参数

在 `game.js` 顶部的 `CONFIG` 对象：

```javascript
const CONFIG = {
    vehicleSpeed: 0.3,        // 加速度
    vehicleTurnSpeed: 0.03,   // 转向速度
    vehicleBrake: 0.95,       // 减速系数
    cameraOffset: new THREE.Vector3(0, 8, 15),  // 相机偏移
    worldSize: 1000,          // 世界大小（米）
    blockSize: 50,            // 街区大小（米）
    buildingDensity: 0.3      // 建筑密度（0-1）
};
```

### 成都地标数据

```javascript
const CHENGDU_LANDMARKS = [
    { name: '地标名称', position: { x, z }, color: 0xHEXCOLOR }
];
```

## 本地开发

### 方法 1: 简单 HTTP 服务器

```bash
# Python 3
python3 -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000

# Node.js (需要安装 http-server)
npm install -g http-server
http-server -p 8000

# PHP
php -S localhost:8000
```

### 方法 2: VS Code Live Server

1. 安装 "Live Server" 扩展
2. 右键点击 `index.html`
3. 选择 "Open with Live Server"

### 方法 3: 使用浏览器开发者工具

某些现代浏览器允许直接打开本地 HTML 文件并使用 ES 模块（需要启用实验性功能）。

## 调试技巧

### 浏览器控制台

打开浏览器开发者工具（F12），查看：
- Console: 错误和日志信息
- Network: 资源加载状态
- Performance: 帧率和性能分析

### 常用调试代码

在 `game.js` 中添加：

```javascript
// 显示车辆位置
console.log('Vehicle position:', this.vehicle.position);

// 显示速度
console.log('Speed:', this.velocity.length());

// 显示帧率
console.log('FPS:', Math.round(1 / deltaTime));
```

## 性能优化

### 降低复杂度

1. **减少建筑数量**:
   ```javascript
   buildingDensity: 0.1  // 更少的建筑
   ```

2. **缩小世界**:
   ```javascript
   worldSize: 500  // 更小的世界
   ```

3. **关闭阴影**:
   ```javascript
   this.renderer.shadowMap.enabled = false;
   ```

4. **降低分辨率**:
   ```javascript
   this.renderer.setPixelRatio(1);  // 固定为 1
   ```

### 移动端优化

游戏已针对移动端优化：
- 像素比限制为 2
- 简化的几何体
- 雾效减少远距离渲染
- 触摸控制支持

## 扩展开发

### 添加新地标

1. 编辑 `game.js` 中的 `CHENGDU_LANDMARKS`
2. 添加新对象：
   ```javascript
   { 
       name: '新地标', 
       position: { x: 100, z: 200 },
       color: 0xFF0000 
   }
   ```

### 修改车辆外观

在 `createVehicle()` 方法中修改几何体和材质：

```javascript
// 改变车身颜色
const bodyMaterial = new THREE.MeshLambertMaterial({ 
    color: 0x00FF00  // 绿色
});

// 改变车辆大小
const bodyGeometry = new THREE.BoxGeometry(4, 2, 6);
```

### 添加新功能

常见扩展示例：

1. **音效**:
   ```javascript
   const audio = new Audio('engine.mp3');
   audio.loop = true;
   audio.play();
   ```

2. **昼夜循环**:
   ```javascript
   updateDayNight() {
       const time = (this.gameTime % 120) / 120;
       const sunIntensity = Math.sin(time * Math.PI);
       this.sunLight.intensity = Math.max(0.3, sunIntensity);
   }
   ```

3. **迷你地图**:
   添加正交相机俯视图

## 测试清单

- [ ] 游戏在 Chrome/Edge 中正常运行
- [ ] 游戏在 Firefox 中正常运行
- [ ] 游戏在 Safari 中正常运行
- [ ] 移动端触摸控制正常工作
- [ ] 所有地标可以被发现
- [ ] 统计数据正确更新
- [ ] 车辆物理感觉自然
- [ ] 无控制台错误
- [ ] 帧率稳定（建议 30+ FPS）

## 已知限制

1. **CDN 依赖**: 需要网络连接加载 Three.js
2. **浏览器兼容性**: 需要支持 WebGL 和 ES6 模块
3. **性能**: 在低端设备上可能需要降低设置
4. **碰撞检测**: 当前没有精确的碰撞检测
5. **地图细节**: 初始版本使用简化的城市模型

## 贡献指南

欢迎贡献代码！建议：

1. Fork 仓库
2. 创建功能分支
3. 提交清晰的 commit 信息
4. 确保代码通过测试
5. 提交 Pull Request

## 许可

MIT License - 可自由使用和修改
