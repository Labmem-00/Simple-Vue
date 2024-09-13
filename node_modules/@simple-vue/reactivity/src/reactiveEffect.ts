import { activeEffect, trackEffect, triggerEffects } from "./effect";

const targetMap = new WeakMap(); //存放依赖收集的关系

export const createDep = (cleanUp, key)=>{
    const dep = new Map() as any;
    dep.cleanUp = cleanUp;
    dep.name = key;//标识映射表服务的属性
    return dep;
}

export function track(target, key){
    if(activeEffect) {
        let depsMap = targetMap.get(target)
        if(!depsMap){
            targetMap.set(target,(depsMap = new Map()));
        }

        let dep = depsMap.get(key)
        if(!dep) {
            depsMap.set(
                key, 
                dep = createDep(()=>{depsMap.delete(key)}, key)
            )
        }
        trackEffect(activeEffect, dep) //将当前的effect放入映射表
    }
   
}

export function trigger(target, key, newValue, oldValue){
    const depsMap = targetMap.get(target)

    if(!depsMap){
        return
    }
    let dep = depsMap.get(key);
    if(dep){
        triggerEffects(dep);
    }
}   

