import * as THREE from 'three';

/**
 * 游戏配置常量
 */
export const CONFIG = {
    // 车辆配置
    vehicle: {
        speed: 0.15,              // 前进速度（已降低）
        reverseSpeed: 0.08,       // 倒车速度
        turnSpeed: 0.03,
        brake: 0.95,
        maxHealth: 1000,
        collisionDamage: 1,       // 每次碰撞的伤害值
        criticalHealth: 20,       // 低于此值显示危险警告
        collisionCooldown: 0.5,   // 碰撞冷却时间（秒）
    },
    
    // 相机配置
    camera: {
        offset: new THREE.Vector3(0, 8, 15),
        fov: 60,
        near: 0.1,
        far: 1000,
        lerpFactor: 0.1,
        // 相机旋转配置
        rotationSpeed: 0.005,      // 旋转灵敏度
        minPolarAngle: 0.1,        // 最小极角（接近正上方往下看）
        maxPolarAngle: Math.PI / 2 - 0.1,  // 最大极角（水平视角）
        defaultDistance: 17,       // 默认相机距离
        minDistance: 8,            // 最小距离
        maxDistance: 50,           // 最大距离
    },
    
    // 世界配置
    world: {
        size: 1000,           // 兼容旧代码
        blockSize: 50,        // 街区大小
        buildingDensity: 0.3,
        roadWidth: 8,
        chunkSize: 200,       // 区块大小
        renderDistance: 3,    // 渲染距离（区块数）
    },
    
    // 碰撞配置
    collision: {
        vehicleBoundingRadius: 2.5,
        buildingPadding: 1,
        reboundFactor: 0.3,
    },
    
    // 场景配置
    scene: {
        backgroundColor: 0x87CEEB,
        fogNear: 100,
        fogFar: 500,
    }
};

/**
 * 成都地标数据
 */
export const CHENGDU_LANDMARKS = [
    { name: '天府广场', position: { x: 0, z: 0 }, color: 0xFF6B6B },
    { name: '春熙路', position: { x: 100, z: 50 }, color: 0xFFD93D },
    { name: '宽窄巷子', position: { x: -80, z: 80 }, color: 0x6BCB77 },
    { name: '武侯祠', position: { x: -120, z: -100 }, color: 0x4D96FF },
    { name: '锦里', position: { x: -100, z: -120 }, color: 0xFF6B9D },
    { name: '杜甫草堂', position: { x: -200, z: 50 }, color: 0xC1A3FF },
    { name: '人民公园', position: { x: 50, z: 150 }, color: 0x95E1D3 },
    { name: '成都东站', position: { x: 250, z: -50 }, color: 0xF38181 },
    { name: 'IFS国际金融中心', position: { x: 80, z: 20 }, color: 0xAA96DA },
    { name: '太古里', position: { x: 110, z: 30 }, color: 0xFCBF49 }
];
