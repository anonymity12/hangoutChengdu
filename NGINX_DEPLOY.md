# Nginx 部署配置

## 快速部署步骤

### 1. 安装依赖并打包

```bash
# 安装依赖
npm install

# 打包项目
npm run build
```

打包后的文件在 `dist/` 目录下。

### 2. 复制到 Nginx 目录

```bash
# 复制 dist 目录内容到 nginx 的 html 目录
sudo cp -r dist/* /usr/share/nginx/html/

# 或者复制到自定义目录
sudo cp -r dist/* /var/www/hangout-chengdu/
```

### 3. Nginx 配置

创建或编辑 nginx 配置文件：

```bash
sudo vim /etc/nginx/conf.d/hangout-chengdu.conf
```

配置内容：

```nginx
server {
    listen 80;
    server_name your-domain.com;  # 替换为你的域名或IP
    
    root /var/www/hangout-chengdu;  # 替换为你的部署目录
    index index.html;
    
    # 启用 gzip 压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    gzip_min_length 1000;
    
    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # SPA 路由支持
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
}
```

### 4. 重启 Nginx

```bash
# 测试配置
sudo nginx -t

# 重启 nginx
sudo systemctl restart nginx

# 或
sudo nginx -s reload
```

## macOS 本地 Nginx 部署

```bash
# 安装 nginx (如果没有)
brew install nginx

# 复制打包文件
cp -r dist/* /usr/local/var/www/

# 或者使用 Homebrew 默认路径 (Apple Silicon)
cp -r dist/* /opt/homebrew/var/www/

# 启动 nginx
brew services start nginx
```

访问 http://localhost:8080 查看效果。

## Docker 部署（可选）

创建 `Dockerfile`：

```dockerfile
FROM nginx:alpine
COPY dist/ /usr/share/nginx/html/
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

构建并运行：

```bash
docker build -t hangout-chengdu .
docker run -d -p 80:80 hangout-chengdu
```

## 注意事项

1. **HTTPS**: 生产环境建议配置 SSL 证书
2. **CDN**: 可以将静态资源托管到 CDN 加速
3. **域名**: 记得将 `your-domain.com` 替换为实际域名

## 本地预览打包结果

```bash
npm run preview
```

访问 http://localhost:4173 预览打包后的效果。
