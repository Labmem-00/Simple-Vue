import { isFunction, isObject } from "@simple-vue/shared";
import { ReactiveEffect } from "./effect";
import { isReactive } from "./reactive";
import { isRef } from "./ref";

//监控响应式数据
export function watch(source,cb,options={} as any){
    if(!isFunction(cb)){
        return;
    }
    return doWatch(source,cb,options);
}

export function watchEffect(source,options = {}){
    return doWatch(source, null, options as any)
}

//遍历函数,控制监控的层级
function traverse(source,depth,currentDepth = 0,seen = new WeakMap()){
    if(!isObject(source)){
        return source;
    }
    if(depth){
        if(depth <= currentDepth){
            return source;
        }
        currentDepth++;
    }
    if(seen.has(source)){
        return source;
    }
    seen.set(source,true);
    for(let key in source){
        traverse(source[key],depth,currentDepth,seen)
    }
    return source;
}

function doWatch(source,cb,{deep,immediate}){

    //产生一个getter,关联到reactiveEffect
    const reactiveGetter = (source) => traverse(source,deep === false ? 1 :undefined);
    
    let getter
     if(isReactive(source)){
        getter = () => reactiveGetter(source);
    } else if(isRef(source)){
        if(isReactive(source.value)){
            //如果当前为ref对象
            getter = () => reactiveGetter(source.value)
        }else{
            getter = () => source.value;
        }
    }else if(isFunction(source)){
        getter = source;
    }

    let oldValue;
    let clean
    const onCleanup = (fn) =>{
        clean = ()=>{
            fn();
            clean = undefined; //执行清理
        }
    }

    const job = () => {
        if(cb){
            const newValue = effect.run();
            if(clean){
                clean()
            }
            cb(newValue,oldValue,onCleanup);
            oldValue = newValue;
        }else{
            effect.run()
        }
    }

    const effect = new ReactiveEffect(getter,job)

    if(cb){
        if(immediate){
            job();
        }else{
            oldValue = effect.run();
        }
    }else{
        effect.run();
    }

    const unWatch = () =>{
        effect.stop();
    };

    return unWatch;
} 