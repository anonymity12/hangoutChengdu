/**
 * 随机地名生成器 - 生成有趣的中文地名
 */

// 地名前缀词
const PREFIXES = [
    '东', '西', '南', '北', '中', '大', '小', '新', '老', '上', '下',
    '金', '银', '玉', '龙', '凤', '虎', '熊', '猫', '兔', '鹤',
    '青', '红', '紫', '白', '黑', '翠', '碧', '彩', '明', '暗',
    '春', '夏', '秋', '冬', '风', '雨', '雪', '云', '雾', '霞',
    '天', '地', '日', '月', '星', '山', '水', '林', '石', '花',
    '长', '短', '高', '低', '深', '浅', '宽', '窄', '远', '近',
    '快', '慢', '静', '动', '清', '浊', '香', '甜', '苦', '辣',
    '仙', '魔', '神', '圣', '灵', '妖', '鬼', '怪', '精', '魅'
];

// 地名中间词
const MIDDLES = [
    '熊猫', '火锅', '茶馆', '竹林', '古城', '老街', '新村', '花园',
    '龙门', '凤凰', '麒麟', '神龟', '仙鹤', '蝴蝶', '蜻蜓', '萤火',
    '桃花', '梅花', '荷花', '菊花', '兰花', '杜鹃', '牡丹', '芙蓉',
    '美食', '小吃', '夜市', '早茶', '烧烤', '串串', '冒菜', '兔头',
    '书院', '学堂', '武馆', '道观', '寺庙', '教堂', '祠堂', '宗庙',
    '迷宫', '秘境', '仙境', '梦境', '幻境', '异界', '天堂', '乐园',
    '温泉', '瀑布', '峡谷', '悬崖', '洞穴', '森林', '草原', '沙漠',
    '码头', '渡口', '桥头', '城门', '关口', '驿站', '客栈', '酒楼'
];

// 地名后缀词
const SUFFIXES = [
    '广场', '公园', '商场', '中心', '大厦', '塔楼', '会馆', '剧院',
    '街', '路', '巷', '弄', '胡同', '里', '坊', '村',
    '山', '岭', '峰', '谷', '湖', '河', '江', '海',
    '园', '苑', '庄', '府', '宅', '居', '阁', '轩',
    '城', '堡', '寨', '营', '驿', '亭', '台', '榭',
    '洞', '穴', '窟', '潭', '泉', '井', '池', '塘',
    '林', '丛', '坡', '坎', '岗', '墩', '滩', '洲',
    '门', '关', '隘', '口', '渡', '津', '埠', '港'
];

// 特殊有趣的完整地名
const SPECIAL_NAMES = [
    '来福士不来福', '躺平居', '卷王塔', '摸鱼湾', '划水港',
    '吃货天堂', '减肥明天', '今天不加班', '永远周五',
    '财务自由路', '暴富广场', '锦鲤湖', '欧皇殿', '非酋谷',
    '程序员秃头峰', '产品经理深渊', '设计师颈椎山',
    '奶茶续命馆', '咖啡提神阁', '火锅治愈所', '烧烤快乐园',
    '失眠者俱乐部', '起床困难户', '熬夜冠军台', '早睡协会',
    '社恐避难所', '社牛欢乐谷', 'i人静音区', 'e人喧嚣城',
    '猫咖天堂', '狗粮批发站', '单身贵族府', '恋爱酸臭街',
    '发际线保护区', '体重禁区', '年龄忘却林', '皱纹消失湾',
    '老板看不见角落', '摸鱼专用工位', '带薪如厕区',
    '熊猫不想动园', '懒癌晚期镇', '拖延症候群'
];

/**
 * 生成随机地名
 * @param {number} seed - 随机种子（用于确定性生成）
 * @returns {string} 生成的地名
 */
export function generatePlaceName(seed) {
    // 使用简单的伪随机数生成器保证相同种子产生相同结果
    const random = seededRandom(seed);
    
    // 20% 概率使用特殊有趣地名
    if (random() < 0.2) {
        const index = Math.floor(random() * SPECIAL_NAMES.length);
        return SPECIAL_NAMES[index];
    }
    
    // 决定地名结构
    const structure = random();
    
    if (structure < 0.3) {
        // 前缀 + 后缀 (如：东街、北路)
        const prefix = PREFIXES[Math.floor(random() * PREFIXES.length)];
        const suffix = SUFFIXES[Math.floor(random() * SUFFIXES.length)];
        return prefix + suffix;
    } else if (structure < 0.6) {
        // 中间词 + 后缀 (如：熊猫广场、火锅街)
        const middle = MIDDLES[Math.floor(random() * MIDDLES.length)];
        const suffix = SUFFIXES[Math.floor(random() * SUFFIXES.length)];
        return middle + suffix;
    } else if (structure < 0.85) {
        // 前缀 + 中间词 + 后缀 (如：大熊猫公园)
        const prefix = PREFIXES[Math.floor(random() * PREFIXES.length)];
        const middle = MIDDLES[Math.floor(random() * MIDDLES.length)];
        const suffix = SUFFIXES[Math.floor(random() * SUFFIXES.length)];
        return prefix + middle + suffix;
    } else {
        // 双前缀 + 后缀 (如：东北街、金龙路)
        const prefix1 = PREFIXES[Math.floor(random() * PREFIXES.length)];
        const prefix2 = PREFIXES[Math.floor(random() * PREFIXES.length)];
        const suffix = SUFFIXES[Math.floor(random() * SUFFIXES.length)];
        return prefix1 + prefix2 + suffix;
    }
}

/**
 * 生成随机颜色
 * @param {number} seed - 随机种子
 * @returns {number} 十六进制颜色值
 */
export function generateRandomColor(seed) {
    const random = seededRandom(seed);
    
    // 生成饱和度较高的鲜艳颜色
    const hue = random();
    const saturation = 0.6 + random() * 0.3;  // 60%-90%
    const lightness = 0.5 + random() * 0.2;   // 50%-70%
    
    return hslToHex(hue, saturation, lightness);
}

/**
 * 带种子的随机数生成器
 * @param {number} seed - 种子
 * @returns {Function} 返回0-1之间随机数的函数
 */
function seededRandom(seed) {
    let s = seed;
    return function() {
        s = Math.sin(s * 9999) * 10000;
        return s - Math.floor(s);
    };
}

/**
 * HSL 转 十六进制颜色
 */
function hslToHex(h, s, l) {
    let r, g, b;
    
    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    
    const toHex = x => {
        const hex = Math.round(x * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };
    
    return parseInt(toHex(r) + toHex(g) + toHex(b), 16);
}
