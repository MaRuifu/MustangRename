/**
 * 纯 Node 生成应用图标（无第三方依赖）：
 * 蓝色圆角方形 + 白色双向箭头（重命名语义）
 * 输出：src-tauri/icons/{32x32.png,128x128.png,128x128@2x.png,icon.png,icon.ico,icon.icns}
 */
import zlib from 'node:zlib'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.resolve(__dirname, '../src-tauri/icons')
fs.mkdirSync(OUT, { recursive: true })

/* ---------- CRC32 ---------- */
const crcTable = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const t = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])))
  return Buffer.concat([len, t, data, crc])
}

/* ---------- 像素绘制 ---------- */
function lerp(a, b, t) {
  return Math.round(a + (b - a) * t)
}

function pixel(x, y, size) {
  const u = (x + 0.5) / size
  const v = (y + 0.5) / size
  // 圆角矩形遮罩
  const r = 0.2
  const cx = Math.max(Math.abs(u - 0.5) - (0.5 - r), 0)
  const cy = Math.max(Math.abs(v - 0.5) - (0.5 - r), 0)
  if (Math.hypot(cx, cy) > r) return [0, 0, 0, 0]
  // 背景渐变 #4d8dff -> #2453e6
  let R = lerp(0x4d, 0x24, v)
  let G = lerp(0x8d, 0x53, v)
  let B = lerp(0xff, 0xe6, v)
  // 白色双向箭头
  const white = () => {
    R = 255
    G = 255
    B = 255
  }
  // 上箭头：向右，y ∈ [0.30, 0.44]
  if (v >= 0.3 && v <= 0.44) {
    if (u >= 0.2 && u <= 0.6) white()
    else if (u > 0.6 && u <= 0.8) {
      const half = ((0.8 - u) / 0.2) * 0.14
      if (Math.abs(v - 0.37) <= half) white()
    }
  }
  // 下箭头：向左，y ∈ [0.56, 0.70]
  if (v >= 0.56 && v <= 0.7) {
    if (u >= 0.4 && u <= 0.8) white()
    else if (u >= 0.2 && u < 0.4) {
      const half = ((u - 0.2) / 0.2) * 0.14
      if (Math.abs(v - 0.63) <= half) white()
    }
  }
  return [R, G, B, 255]
}

function png(size) {
  const stride = size * 4 + 1
  const raw = Buffer.alloc(size * stride)
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixel(x, y, size)
      const o = y * stride + 1 + x * 4
      raw[o] = r
      raw[o + 1] = g
      raw[o + 2] = b
      raw[o + 3] = a
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ])
}

/* ---------- ICO（内嵌 PNG，Vista+ 支持） ---------- */
function ico(pngBuf) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(1, 4)
  const entry = Buffer.alloc(16)
  entry[0] = 0 // 256
  entry[1] = 0
  entry.writeUInt16LE(1, 4) // planes
  entry.writeUInt16LE(32, 6) // bpp
  entry.writeUInt32LE(pngBuf.length, 8)
  entry.writeUInt32LE(22, 12)
  return Buffer.concat([header, entry, pngBuf])
}

/* ---------- ICNS（内嵌 PNG） ---------- */
function icns(entries) {
  const body = []
  let total = 8
  for (const [type, buf] of entries) {
    const head = Buffer.alloc(8)
    head.write(type, 0, 'ascii')
    head.writeUInt32BE(buf.length + 8, 4)
    body.push(head, buf)
    total += buf.length + 8
  }
  const header = Buffer.alloc(8)
  header.write('icns', 0, 'ascii')
  header.writeUInt32BE(total, 4)
  return Buffer.concat([header, ...body])
}

const p32 = png(32)
const p128 = png(128)
const p256 = png(256)
const p512 = png(512)
const p1024 = png(1024)

fs.writeFileSync(path.join(OUT, '32x32.png'), p32)
fs.writeFileSync(path.join(OUT, '128x128.png'), p128)
fs.writeFileSync(path.join(OUT, '128x128@2x.png'), p256)
fs.writeFileSync(path.join(OUT, 'icon.png'), p1024)
fs.writeFileSync(path.join(OUT, 'icon.ico'), ico(p256))
fs.writeFileSync(
  path.join(OUT, 'icon.icns'),
  icns([
    ['ic07', p128],
    ['ic08', p256],
    ['ic09', p512],
    ['ic10', p1024]
  ])
)
console.log('icons generated ->', OUT)
