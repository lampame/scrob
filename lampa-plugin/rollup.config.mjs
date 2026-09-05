import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import babel from '@rollup/plugin-babel'
import commonjs from '@rollup/plugin-commonjs'
import nodeResolve from '@rollup/plugin-node-resolve'
import { compileString } from 'sass'

const __dirname = dirname(fileURLToPath(import.meta.url))
const isProduction = process.env.NODE_ENV === 'production'

const banner = `/**
 * Scrob — Lampa plugin for self-hosted media tracking
 * Build: ${new Date().toISOString().split('T')[0]}
 * Source: https://github.com/ellite/scrob
 */`

/**
 * Custom rollup plugin: inline file content via @@include("path") directive.
 * Supports both .css and .scss — compiles SCSS on the fly.
 */
function includeFile() {
    return {
        name: 'rollup-plugin-include-file',
        transform(code, id) {
            const dir = dirname(id)
            const regex = /@@include\("([^"]+)"\)/g
            let match
            let result = code
            let changed = false

            while ((match = regex.exec(code)) !== null) {
                const filePath = resolve(dir, match[1])
                try {
                    let content = readFileSync(filePath, 'utf-8')

                    // Compile SCSS to CSS if needed
                    if (filePath.endsWith('.scss') || filePath.endsWith('.sass')) {
                        const compiled = compileString(content, {
                            style: isProduction ? 'compressed' : 'expanded'
                        })
                        content = compiled.css
                    }

                    // Escape for embedding in JS string
                    const escaped = content
                        .trim()
                        .replace(/\\/g, '\\\\')
                        .replace(/'/g, "\\'")
                        .replace(/\n/g, '\\n')
                        .replace(/\r/g, '\\r')

                    result = result.replace(match[0], escaped)
                    changed = true
                } catch (e) {
                    this.warn(`@@include: could not read ${filePath}: ${e.message}`)
                }
            }

            return changed ? { code: result, map: null } : null
        }
    }
}

export default {
    input: 'src/main.js',
    output: {
        file: '../frontend/public/plugins/scrob.js',
        format: 'iife',
        banner,
        sourcemap: false
    },
    plugins: [
        includeFile(),
        nodeResolve(),
        commonjs(),
        babel({
            babelHelpers: 'bundled',
            presets: [
                ['@babel/preset-env', {
                    targets: { chrome: '37' }  // Android 5 Lollipop WebView
                }]
            ]
        })
    ]
}
