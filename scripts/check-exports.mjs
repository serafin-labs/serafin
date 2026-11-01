// Pre-publish smoke test shared by the packages: verifies a built package can be consumed through
// its `exports` map in BOTH module systems, then type-checks a consumer against its declarations.
//
// The package is self-referenced by name, so it goes through the exact conditional resolution
// (`require` -> CJS, `import` -> ESM) that real consumers hit. Run it after `pnpm build`.
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { createRequire } from "node:module"
import { tmpdir } from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

/**
 * @param {ImportMeta} meta `import.meta` of the package script, to resolve modules as the package does
 * @param {object} check
 * @param {string} check.name the package name
 * @param {(label: string, mod: any, load: (name: string) => Promise<any>) => void | Promise<void>} check.usable
 *        exercises the exports of one build; `load` imports another module in the same module system
 * @param {string[]} check.consumer the lines of a TypeScript consumer of the package
 * @param {string[]} [check.dependencies] the packages the consumer imports, resolved to their declarations
 * @param {object} [check.compilerOptions] more compiler options for the consumer
 * @param {string} check.summary what the package was checked for, printed at the end
 */
export async function checkExports(meta, { name, usable, consumer, dependencies = [], compilerOptions = {}, summary }) {
    const require = createRequire(meta.url)
    const lib = (format) => fileURLToPath(new URL(`../lib/${format}/index.d.ts`, meta.url))

    const cjsPath = require.resolve(name)
    assert.match(cjsPath, /[/\\]lib[/\\]cjs[/\\]/, `require() resolved to unexpected path: ${cjsPath}`)
    await usable("cjs (require)", require(name), async (dependency) => require(dependency))
    console.log(`✓ cjs  require("${name}") -> ${cjsPath}`)

    const esmPath = fileURLToPath(meta.resolve(name))
    assert.match(esmPath, /[/\\]lib[/\\]esm[/\\]/, `import() resolved to unexpected path: ${esmPath}`)
    await usable("esm (import)", await import(meta.resolve(name)), (dependency) => import(meta.resolve(dependency)))
    console.log(`✓ esm  import("${name}")  -> ${esmPath}`)

    for (const format of ["esm", "cjs"]) {
        checkDeclarations(require, format, { name, entry: lib(format), consumer, dependencies, compilerOptions })
    }
    console.log(`\nBoth builds ${summary}.`)
}

/**
 * The default export of a CommonJS module, whichever module system loaded it.
 */
export const interop = (mod) => mod.default ?? mod

/**
 * Compile a consumer against the emitted declarations.
 *
 * `tsc` is happy to *emit* a `.d.ts` it cannot read back: a type inferred through a stack of
 * homomorphic mapped types can be written out referring to an `infer` binding the emit did not
 * carry over. That produces a package whose runtime is fine and whose types do not compile, which
 * nothing else here would notice -- so type-check the built declarations as a consumer sees them.
 */
function checkDeclarations(require, format, { name, entry, consumer, dependencies, compilerOptions }) {
    const dir = mkdtempSync(path.join(tmpdir(), "serafin-dts-"))
    try {
        writeFileSync(path.join(dir, "consumer.ts"), [...consumer, ""].join("\n"))
        writeFileSync(
            path.join(dir, "tsconfig.json"),
            JSON.stringify({
                compilerOptions: {
                    strict: true,
                    noEmit: true,
                    target: "esnext",
                    module: "esnext",
                    moduleResolution: "bundler",
                    types: [],
                    ...compilerOptions,
                    paths: {
                        [name]: [entry],
                        // resolved through the dependency's own `exports`, then swapped to the declarations next to it
                        ...Object.fromEntries(dependencies.map((dependency) => [dependency, [require.resolve(dependency).replace(/\.js$/, ".d.ts")]])),
                        ...compilerOptions.paths,
                    },
                },
                include: ["consumer.ts"],
            }),
        )
        execFileSync(process.execPath, [require.resolve("typescript/bin/tsc"), "--project", path.join(dir, "tsconfig.json")], {
            stdio: "pipe",
            encoding: "utf8",
        })
        console.log(`✓ ${format} declarations type-check for a consumer`)
    } catch (e) {
        const output = `${e.stdout ?? ""}${e.stderr ?? ""}`.trim()
        throw new Error(`${format}: the built declarations do not compile\n${output || e.message}`)
    } finally {
        rmSync(dir, { recursive: true, force: true })
    }
}
