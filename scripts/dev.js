import minimist from "minimist"; // 解析命令行参数模块
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createRequire } from 'module';
import esbuild from "esbuild";

const args = minimist(process.argv.slice(2));
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

const target = args._[0] || "reactivity"; // 打包项目
const format = args.f || "iife"; // 打包后的模块规范

const entry = resolve(__dirname, `../packages/${target}/src/index.ts`);
const pkg = require(`../packages/${target}/package.json`);

esbuild.context({
    entryPoints: [entry], // 打包入口
    outfile: resolve(__dirname, `../packages/${target}/dist/${target}.js`), // 出口
    bundle: true,
    platform: "browser",
    sourcemap: true, // 可以调试源代码
    format,
    globalName: pkg.buildOptions?.name 
}).then((ctx) => {
    console.log('start dev');
    return ctx.watch();
});
