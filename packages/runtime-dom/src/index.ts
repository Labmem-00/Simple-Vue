//提供操作dom的api
//createRenderer 创建一个渲染器，定义渲染行为
//render 设置渲染函数
//h, createVNode，创建一个虚拟dom节点

import {nodeOps} from "./nodeOps";
import patchProp from "./patchProp";
import {createRenderer} from "@simple-vue/runtime-core"

const renderOptions = Object.assign({patchProp},nodeOps);

export const render = (vnode, container)=>{
    return  createRenderer( renderOptions).render(vnode, container);
}
export {renderOptions};

 
export * from "@simple-vue/runtime-core"
