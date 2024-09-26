import { isObject, isString, ShapeFlags } from "@simple-vue/shared";

export const Text = Symbol("Text");
export const Fragment = Symbol("Fragment"); //多根节点的实现
export function createVNode(type, props, children?){
    const shapeFlag = isString(type) ? 
                        ShapeFlags.ELEMENT : isObject(type) ? 
                        ShapeFlags.STATEFUL_COMPONENT : 0;
    const vnode = {
        _v_isVNode: true,
        type,
        props,
        children,
        key: props?.key, //diff算法需要的key
        el: null, //对应的真实节点
        shapeFlag, 
    }

    if(children){
        if(Array.isArray(children)){
            vnode.shapeFlag = vnode.shapeFlag | ShapeFlags.ARRAY_CHILDREN //组合标志，存在子虚拟节点的数组
        }else{
            children = String(children);
            vnode.shapeFlag = vnode.shapeFlag | ShapeFlags.TEXT_CHILDREN //组合标志，存在文本子节点
        }
    }
    return vnode;
}