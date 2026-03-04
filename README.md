<div align="center">
  <img src="src/assets/logo.svg" alt="ZHIYIN Logo" width="128" />
  <h1>ZHIYIN · 知音</h1>
  <p>自部署 NAS 音乐流媒体 Web 客户端</p>

  ![Vue](https://img.shields.io/badge/Vue_3-4FC08D?logo=vuedotjs&logoColor=white)
  ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
  ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?logo=tailwindcss&logoColor=white)
  ![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)
</div>

---

## 简介

**ZHIYIN（知音）** 是一个面向 NAS 用户的音乐流媒体前端应用，提供现代化的 Web 界面来管理和播放你的个人音乐库。

### 主要功能

- 🎵 在线串流播放，支持多种音质（128k / 192k / 320k / FLAC / 原始）
- 📝 歌词同步显示，支持双语歌词
- 🎨 亮色 / 暗色主题切换
- 🌐 中文 / English 双语界面
- 📱 响应式设计，适配桌面与移动端
- 🔍 音乐库扫描与管理
- 📊 播放统计与数据可视化
- 🎯 智能推荐

### 技术栈

| 技术 | 用途 |
|------|------|
| Vue 3 + Composition API | 前端框架 |
| TypeScript | 类型安全 |
| Tailwind CSS | 样式 |
| Pinia | 状态管理 |
| Vue Router | 路由 |
| Vue I18n | 国际化 |
| Howler.js | 音频播放 |
| Vite | 构建工具 |

---

## 后端部署

> **本项目仅包含前端代码。** 要完整体验 ZHIYIN，你需要先部署后端服务。

后端 github 地址（包含 docker 示例和配置文件示例）：[**github/zhiyin**](https://github.com/qwex888/zhiyin)

后端 Docker 镜像：[**qwex333/zhiyin**](https://hub.docker.com/r/qwex333/zhiyin)

```bash
docker pull qwex333/zhiyin:latest
```

使用 Docker Compose 快速启动（示例）：

```yaml
version: '3.8'

services:
  zhiyin:
    image: qwex333/zhiyin:latest
    container_name: zhiyin
    
    ports:
      - "8080:8080"
    
    volumes:
      # 音乐目录（只读）- 请修改为你的实际路径，如需更多路径，先在这里挂载目录，然后在 config.toml 中添加 docker路径
      # 示例：- /vol1/1000/Music:/music:ro
      - ./music:/music:ro
      
      # 数据库目录（持久化）
      - ./data:/data

      # 配置文件
      # 首次使用：cp config.toml.example config.toml
      # 然后修改 config.toml 中的配置
      - ./config.toml:/app/config.toml:ro
      
      # 封面缓存目录(可选， 如果想手动管理封面)
      # - ./covers:/covers
      
      
      # Web 前端（可选，将前端构建产物挂载到容器）
      # - ./web:/app/web:ro
    
    environment:
      # 日志级别
      - RUST_LOG=info
      
      # 初始管理员（仅首次启动时生效，创建后可删除）
      # - MUSIC_ADMIN_USER=admin
      # - MUSIC_ADMIN_PASSWORD=your_secure_password
      
      # 注意：其他配置项请在 config.toml 中修改
    
    restart: unless-stopped
    
    # 健康检查（镜像中未安装 curl/wget，使用内置二进制的 HTTP 自检）
    # 如安装了 wget 可替换为: test: ["CMD-SHELL", "wget -qO- http://localhost:8080/api/health || exit 1"]
    healthcheck:
      test: ["CMD", "zhiyin", "--health-check"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 10s
    
    networks:
      - music-network

networks:
  music-network:
    driver: bridge

# 使用说明：
# 1. 复制配置文件：cp config.toml.example config.toml
# 2. 修改 config.toml 中的配置：
#    - 音乐扫描目录（roots）
#    - 数据库路径（path）
#    - 其他可选配置
# 3. 修改 volumes 中的音乐目录路径（./music 改为你的实际路径）
# 4. 运行: docker-compose up -d
# 5. 查看日志: docker-compose logs -f
# 6. 停止服务: docker-compose down
# 7. 访问 API: http://localhost:8080/api/songs
# 8. 访问文档: http://localhost:8080/swagger-ui
#
# 配置热重载（无需重启）：
#   docker-compose kill -s SIGHUP zhiyin


```

后端服务默认监听 `8080` 端口，前端开发时通过 Vite 代理将 `/api` 请求转发到后端。

---

## 本地开发

### 前置条件

- Node.js >= 18
- pnpm / npm / yarn

### 安装与启动

```bash
# 安装依赖
npm install

# 启动开发服务器（默认端口 7321）
npm run dev

# 构建生产版本
npm run build

# 运行测试
npm test
```

### 开发代理配置

开发模式下，API 请求会代理到后端服务。修改 `vite.config.ts` 中的 `proxy.target` 指向你的后端地址：

```ts
proxy: {
  '/api': {
    target: 'http://127.0.0.1:8080',
    changeOrigin: true,
  }
}
```

---

## 许可证

MIT
