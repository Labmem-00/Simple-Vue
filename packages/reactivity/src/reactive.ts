import { isObject } from "@simple-vue/shared";
import { ReactiveFlags, mutableHandlers } from "./baseHandlers";

//记录代理的响应式对象
const reactiveMap = new WeakMap();

export function reactive(target){
    return createReactiveObject(target);
}

function createReactiveObject(target){
    //必须传入对象
    if(!isObject(target)){
        return target;
    }
    
    if(target[ReactiveFlags.IS_REACTIVE]){
        return target;
    }
    //缓存中存在代理对象，则直接返回
    const existProxy = reactiveMap.get(target);
    if(existProxy){
        return existProxy;
    }
    let proxy = new Proxy(target, mutableHandlers);
    //根据对象缓存代理后的结果
    reactiveMap.set(target, proxy);
    return proxy;
}

export function toReactive(value){
    return isObject(value) ? reactive(value) : value
}