# 部署指南 - Deployment Guide

## GitHub Pages 部署 (推荐 / Recommended)

### 快速部署步骤：

1. **启用 GitHub Pages**
   - 进入仓库的 Settings
   - 找到 "Pages" 选项
   - 在 "Source" 下选择 "Deploy from a branch"
   - 选择 `main` 或 `master` 分支
   - 目录选择 `/root`
   - 点击 Save

2. **等待部署完成**
   - 几分钟后，页面会显示访问链接
   - 格式类似：`https://anonymity12.github.io/hangoutChengdu/`

3. **访问游戏**
   - 点击链接即可开始游戏
   - 支持手机和PC浏览器

### 自定义域名（可选）

如果有自己的域名，可以在 GitHub Pages 设置中添加自定义域名。

## 其他部署方式

### Netlify

1. 登录 [Netlify](https://netlify.com)
2. 点击 "Add new site" > "Import an existing project"
3. 选择 GitHub 仓库
4. 无需构建命令，直接部署
5. 获得访问链接

### Vercel

1. 登录 [Vercel](https://vercel.com)
2. 点击 "New Project"
3. 导入 GitHub 仓库
4. 无需配置，直接部署
5. 获得访问链接

### 本地测试

```bash
# 方法 1: Python
python3 -m http.server 8000

# 方法 2: Node.js
npx http-server -p 8000

# 方法 3: PHP
php -S localhost:8000
```

然后访问 `http://localhost:8000`

## 注意事项

- ✅ 游戏使用 CDN 加载 Three.js，无需安装依赖
- ✅ 纯静态文件，任何静态托管都可以使用
- ✅ 支持 HTTPS（GitHub Pages 自动启用）
- ⚠️ 首次加载需要下载 Three.js 库（约 1.5MB）
- ⚠️ 需要支持 ES6 模块的现代浏览器

## 移动端访问

游戏完全支持移动端浏览器：
- 自动适配屏幕尺寸
- 触摸控制按钮
- 优化的渲染性能

直接用手机浏览器打开部署后的链接即可！

## 故障排除

### 页面空白或加载失败

1. 检查浏览器控制台是否有错误
2. 确认浏览器支持 WebGL
3. 尝试清除缓存后重新加载
4. 检查网络连接（需要从 CDN 加载 Three.js）

### 性能问题

1. 在 `game.js` 中调低建筑密度：
   ```javascript
   buildingDensity: 0.2  // 降低到 0.2
   ```

2. 减小世界大小：
   ```javascript
   worldSize: 500  // 从 1000 降到 500
   ```

3. 关闭阴影（在 `setupScene` 方法中）：
   ```javascript
   this.renderer.shadowMap.enabled = false;
   ```
