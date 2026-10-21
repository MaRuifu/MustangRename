import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import http from 'node:http'
import https from 'node:https'

/**
 * 开发期 AI 请求代理：浏览器（含 Tauri dev 窗口）直连 AI 接口会被 CORS 拦截，
 * 前端在 DEV 下把请求发到 /ai-proxy<path>，并用 x-proxy-target 头携带目标 origin，
 * 由本中间件在服务端转发，绕开 CORS。生产桌面版走 Rust http_json 代理。
 */
function aiProxy(): Plugin {
  return {
    name: 'ai-proxy',
    configureServer(server) {
      server.middlewares.use('/ai-proxy', (req, res) => {
        const target = req.headers['x-proxy-target']
        if (typeof target !== 'string' || !target) {
          res.statusCode = 400
          res.end('missing x-proxy-target')
          return
        }
        const chunks: Buffer[] = []
        req.on('data', (c) => chunks.push(c as Buffer))
        req.on('end', () => {
          const body = Buffer.concat(chunks)
          let base: URL
          try {
            base = new URL(target)
          } catch {
            res.statusCode = 400
            res.end('invalid x-proxy-target')
            return
          }
          const path = req.url && req.url !== '/' ? req.url : '/'
          const mod = base.protocol === 'https:' ? https : http
          const headers: Record<string, string | string[]> = {}
          for (const [k, v] of Object.entries(req.headers)) {
            if (['host', 'connection', 'x-proxy-target', 'content-length'].includes(k)) continue
            if (v !== undefined) headers[k] = v
          }
          headers['host'] = base.host
          if (body.length) headers['content-length'] = String(body.length)
          const upstream = mod.request(
            {
              hostname: base.hostname,
              port: base.port || (base.protocol === 'https:' ? 443 : 80),
              path,
              method: req.method,
              headers
            },
            (up) => {
              res.writeHead(up.statusCode ?? 502, up.headers)
              up.pipe(res)
            }
          )
          upstream.on('error', (e) => {
            if (!res.headersSent) res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' })
            res.end(`代理请求失败: ${e.message}（目标 ${target}${path}）`)
          })
          upstream.end(body)
        })
      })
    }
  }
}

// Tauri 期望固定端口，勿随意改动
export default defineConfig({
  plugins: [vue(), aiProxy()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ['**/src-tauri/**']
    }
  }
})
