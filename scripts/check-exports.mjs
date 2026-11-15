// Pre-publish smoke test shared by the packages: verifies a built package can be consumed through
// its `exports` map, with `import` and with `require`, then type-checks consumers against its declarations.
//
// The package is self-referenced by name, so it goes through the exact resolution real consumers hit.
// Run it after `pnpm build`.
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { createRequire } from "node:module"
import path from "node:path"
import { fileURLToPath } from "node:url"

/**
 * @param {ImportMeta} meta `import.meta` of the package script, to resolve modules as the package does
 * @param {object} check
 * @param {string} check.name the package name
 * @param {(label: string, mod: any, load: (name: string) => Promise<any>) => void | Promise<void>} check.usable
 *        exercises the exports of the package; `load` loads another module in the same way
 * @param {string[]} check.consumer the lines of a TypeScript consumer of the package
 * @param {object} [check.compilerOptions] more compiler options for the consumer
 * @param {string} check.summary what the package was checked for, printed at the end
 */
export async function checkExports(meta, { name, usable, consumer, compilerOptions = {}, summary }) {
    const require = createRequire(meta.url)
    const packageDir = fileURLToPath(new URL("..", meta.url))

    const esmPath = fileURLToPath(meta.resolve(name))
    assert.match(esmPath, /[/\\]lib[/\\]index\.js$/, `import() resolved to unexpected path: ${esmPath}`)
    await usable("import", await import(meta.resolve(name)), (dependency) => import(meta.resolve(dependency)))
    console.log(`✓ import("${name}")  -> ${esmPath}`)

    // CommonJS applications load the ES module with require(), which Node supports from 20.19 and 22.12
    const cjsPath = require.resolve(name)
    assert.equal(cjsPath, esmPath, `require() resolved to another file than import(): ${cjsPath}`)
    await usable("require", require(name), async (dependency) => require(dependency))
    console.log(`✓ require("${name}") -> ${cjsPath}`)

    const consumers = [
        { label: "bundler", file: "consumer.ts", options: { module: "esnext", moduleResolution: "bundler" } },
        { label: "nodenext, ES module", file: "consumer.mts", options: { module: "nodenext", moduleResolution: "nodenext" } },
        { label: "nodenext, CommonJS", file: "consumer.cts", options: { module: "nodenext", moduleResolution: "nodenext" } },
    ]
    for (const { label, file, options } of consumers) {
        checkDeclarations(require, packageDir, label, file, consumer, { ...options, ...compilerOptions })
    }
    console.log(`\nThe build ${summary}.`)
}

/**
 * The default export of a CommonJS module, whichever module system loaded it.
 */
export const interop = (mod) => mod.default ?? mod

/**
 * Compile a consumer against the emitted declarations, with `skipLibCheck` off as in a new project.
 *
 * `tsc` is happy to *emit* a `.d.ts` it cannot read back: a type inferred through a stack of
 * homomorphic mapped types can be written out referring to an `infer` binding the emit did not
 * carry over, and the import of a CommonJS dependency can be typed for one module resolution and
 * not for another. That produces a package whose runtime is fine and whose types do not compile,
 * which nothing else here would notice -- so type-check the built declarations as consumers see them.
 *
 * The consumer is written inside the package, so it resolves the package by its name, and its
 * dependencies, as an application that installed them.
 */
function checkDeclarations(require, packageDir, label, file, consumer, compilerOptions) {
    const dir = mkdtempSync(path.join(packageDir, ".check-exports-"))
    try {
        writeFileSync(path.join(dir, file), [...consumer, ""].join("\n"))
        writeFileSync(
            path.join(dir, "tsconfig.json"),
            JSON.stringify({
                compilerOptions: { strict: true, noEmit: true, target: "esnext", types: [], skipLibCheck: false, ...compilerOptions },
                include: [file],
            }),
        )
        execFileSync(process.execPath, [require.resolve("typescript/bin/tsc"), "--project", path.join(dir, "tsconfig.json")], {
            stdio: "pipe",
            encoding: "utf8",
        })
        console.log(`✓ the declarations type-check for a consumer (${label})`)
    } catch (e) {
        const output = `${e.stdout ?? ""}${e.stderr ?? ""}`.trim()
        throw new Error(`${label}: the built declarations do not compile\n${output || e.message}`)
    } finally {
        rmSync(dir, { recursive: true, force: true })
    }
}
