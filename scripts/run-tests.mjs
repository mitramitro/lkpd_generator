// Runner test M4 tanpa framework/dependency baru:
// 1. transpile tests/ (dan dependency graph src/) ke CommonJS di .test-build
//    menggunakan tsc (devDependency yang sudah ada).
// 2. jalankan hasilnya dengan node.
import { execSync } from 'node:child_process'
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(root, '.test-build')

rmSync(outDir, { recursive: true, force: true })
mkdirSync(outDir, { recursive: true })

// .js hasil transpile diperlakukan sebagai CommonJS agar require() tanpa
// ekstensi (style project) bisa di-resolve oleh node.
writeFileSync(path.join(outDir, 'package.json'), JSON.stringify({ type: 'commonjs' }))

const testDir = path.join(root, 'tests')
const testFiles = readdirSync(testDir)
  .filter((file) => file.endsWith('.test.ts'))
  .map((file) => `tests/${file}`)

if (testFiles.length === 0) {
  console.error('Tidak ada file test ditemukan di tests/.')
  process.exit(1)
}

const tscFlags = [
  '--ignoreConfig',
  '--outDir', '.test-build',
  '--module', 'commonjs',
  '--target', 'es2022',
  '--moduleResolution', 'node10',
  '--esModuleInterop',
  '--skipLibCheck',
  '--lib', 'es2022,dom',
  '--types', 'node',
  '--ignoreDeprecations', '6.0',
]

execSync(`npx tsc ${testFiles.join(' ')} ${tscFlags.join(' ')}`, { cwd: root, stdio: 'inherit' })

let failed = false
const compiledTests = testFiles.map((file) => path.join('.test-build', file.replace(/\.ts$/, '.js')))
for (const file of compiledTests) {
  try {
    execSync(`node ${file}`, { cwd: root, stdio: 'inherit' })
  } catch {
    failed = true
  }
}

if (failed) {
  process.exitCode = 1
}
