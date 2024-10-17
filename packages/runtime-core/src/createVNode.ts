import { isFunction, isObject, isString, ShapeFlags } from "@simple-vue/shared";
import { isTeleport } from "./components/Teleport";

export const Text = Symbol("Text");
export const Fragment = Symbol("Fragment"); //多根节点的实现
export function createVNode(type, props, children?, patchFlag?){
    const shapeFlag = isString(type) ? ShapeFlags.ELEMENT : //元素
                        isTeleport(type) ? ShapeFlags.TELEPORT :   //teleport组件
                        isObject(type) ?  ShapeFlags.STATEFUL_COMPONENT : //状态组件
                        isFunction(type) ? ShapeFlags.FUNCTIONAL_COMPONENT :0; //函数组件
                       
    const vnode = {
        _v_isVNode: true,
        type,
        props,
        children,
        key: props?.key, //diff算法需要的key
        el: null, //对应的真实节点 
        shapeFlag, 
        ref: props?.ref,
        patchFlag,
    }

    if(children){
        if(Array.isArray(children)){
            vnode.shapeFlag = vnode.shapeFlag | ShapeFlags.ARRAY_CHILDREN //组合标志，存在子虚拟节点的数组
        }else if(isObject(children)){
            vnode.shapeFlag |= ShapeFlags.SLOTS_CHILDREN //插槽
        }
        else{
            children = String(children);
            vnode.shapeFlag = vnode.shapeFlag | ShapeFlags.TEXT_CHILDREN //组合标志，存在文本子节点
        }
    }
    return vnode;
}


//靶向更新 收集动态数据节点，跳过diff层级对比，直接对比节点
let currentBlock = null;
export function openBlock(){
    currentBlock = []; 
}

export function closeBlock(){
    currentBlock = null;
}

export function setupBlock(vnode){
    vnode.dynamicChildren = currentBlock;
    closeBlock();
    return vnode;
}

//block 收集虚拟节点的能力
export function createElementBlock(type, props, children, patchFlag?){
    const vnode =createVNode(type, props, children, patchFlag);
    // if(currentBlock){ 
    //     currentBlock.push(vnode)
    // }
    return setupBlock(vnode); 

}

export {createVNode as createElementVNode};