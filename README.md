## 简化版vue3核心功能实现
目前基本实现了三个模块: reactivity,runtime-core,runtime-dom;

compiler-core模块仅实现了对模板进行AST语法树的转换，以及transform生成CodegenNode;

ts类型待补充，指完全没有类型🤣;

## 目录示例
和官方源码目录布局相同，模块命名与函数命名基本一致

- packages
  - reactivity(模块目录)
    - dist(源码打包文件，默认为ESM模块，可以直接引入项目使用)
    - src(源码)
    - package.json(项目依赖)

## 使用工具
包管理器：pnpm

打包工具：ESBuild

# 打包脚本文件 scripts/dev.js
可在package.json中进行命令配置

例：node scripts/dev.js compiler-core(打包模块名称) -f esm(打包格式)

# 项目运行
默认已经完成打包

每个模块都可以进行单独引入，目前reactivity模块可以较为完整地引入实际项目使用

若要进行源码调试与编写

git clone...

pnpm i





