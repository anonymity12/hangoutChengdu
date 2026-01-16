import { defineConfig } from 'vite';

export default defineConfig({
  // 基础路径，如果部署在子目录下需要修改
  // 例如部署在 /game/ 目录下，设置为 '/game/'
  base: './',
  
  build: {
    // 输出目录
    outDir: 'dist',
    
    // 静态资源目录
    assetsDir: 'assets',
    
    // 生成sourcemap便于调试（生产环境可设为false）
    sourcemap: false,
    
    // 代码分割配置
    rollupOptions: {
      output: {
        // 分离vendor代码
        manualChunks: {
          'three': ['three']
        },
        // 资源文件命名
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
      }
    },
    
    // 压缩选项
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,  // 移除console.log
        drop_debugger: true
      }
    }
  },
  
  // 开发服务器配置
  server: {
    port: 3000,
    open: true,
    host: true
  },
  
  // 预览服务器配置
  preview: {
    port: 4173,
    open: true
  }
});
