# 联机功能部署指南

## 架构说明

游戏使用 **Socket.IO** 实现实时多人联机：

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   玩家 A    │────▶│   服务器    │◀────│   玩家 B    │
│  (浏览器)   │◀────│  (Node.js)  │────▶│  (浏览器)   │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   玩家 C    │
                    │  (浏览器)   │
                    └─────────────┘
```

## 本地开发

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发服务器

```bash
# 前端开发服务器 (Vite)
npm run dev

# 后端服务器 (另一个终端)
npm run server
```

前端运行在 `http://localhost:5173`
后端运行在 `http://localhost:3000`

### 3. 测试联机

打开多个浏览器窗口/标签页，输入相同房间号即可联机。

## 生产部署

### 方式一：单服务器部署

打包前端并用Node.js服务器同时提供静态文件和WebSocket服务：

```bash
# 打包前端
npm run build

# 启动服务器 (同时提供静态文件和WebSocket)
npm run start
# 或
node server.js
```

访问 `http://your-server:3000`

### 方式二：Nginx + Node.js 分离部署

1. **打包前端**
```bash
npm run build
```

2. **Nginx 配置** (前端 + WebSocket代理)

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # 静态文件
    root /var/www/hangout-chengdu/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # WebSocket 代理
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket 超时设置
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
}
```

3. **启动Node.js服务器**
```bash
# 使用 PM2 管理进程
npm install -g pm2
pm2 start server.js --name hangout-chengdu
pm2 save
pm2 startup
```

### 方式三：Docker 部署

创建 `Dockerfile`:

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["node", "server.js"]
```

构建和运行:

```bash
docker build -t hangout-chengdu .
docker run -d -p 3000:3000 --name hangout-game hangout-chengdu
```

### 方式四：Docker Compose (推荐)

创建 `docker-compose.yml`:

```yaml
version: '3.8'
services:
  game:
    build: .
    ports:
      - "3000:3000"
    restart: unless-stopped
    environment:
      - NODE_ENV=production
```

```bash
docker-compose up -d
```

## 联机规则

- **最大玩家数**: 6人/房间
- **初始金币**: 100
- **玩家碰撞惩罚**: 双方各扣20金币
- **地标奖励**: 普通地标 +50，成都核心地标 +100
- **失败条件**: 金币归零

## API 端点

- `GET /api/rooms` - 获取所有房间列表

## WebSocket 事件

### 客户端 -> 服务器

| 事件 | 数据 | 说明 |
|------|------|------|
| `joinRoom` | `{roomId, playerName}` | 加入房间 |
| `updatePosition` | `{position, rotation, velocity}` | 更新位置 |
| `playerCollision` | `{otherId}` | 玩家碰撞 |
| `updateCoins` | `{coins}` | 更新金币 |
| `startGame` | - | 开始游戏 |
| `chatMessage` | `string` | 发送聊天 |

### 服务器 -> 客户端

| 事件 | 数据 | 说明 |
|------|------|------|
| `joinedRoom` | `{roomId, playerId, playerData, config}` | 加入成功 |
| `playerList` | `[players]` | 玩家列表 |
| `playerMoved` | `{id, position, rotation, velocity}` | 玩家移动 |
| `playerJoined` | `playerData` | 新玩家加入 |
| `playerLeft` | `{id, name}` | 玩家离开 |
| `coinsUpdated` | `{players, penalty}` | 金币更新 |
| `playerEliminated` | `{id, name}` | 玩家被淘汰 |
| `gameOver` | `{winner}` | 游戏结束 |

## 注意事项

1. **HTTPS**: 生产环境建议配置SSL证书
2. **防火墙**: 确保服务器端口3000开放
3. **负载均衡**: 如需多服务器，需使用Redis适配器
4. **性能**: 默认50ms同步间隔，可根据需要调整
