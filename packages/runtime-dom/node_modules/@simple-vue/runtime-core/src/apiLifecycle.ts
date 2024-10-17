import { currentInstance, setCurrentInstance, unsetCurrentInstance } from "./component";

export const enum LifeCycle{
    BEFORE_MOUNT = "bm",
    MOUNTED = "m",
    BEFORE_UPDATE = "bu",
    UPDATED = "u"
}

function createHook(type){
    //将当前实例存在此钩子上
    return (hook, target = currentInstance)=>{
        if(target){
            const hooks = target[type] || (target[type] = []); //？浅拷贝

            const wrapHook =()=>{ //hook包装函数,形成闭包，保持对当前实例的访问
                //在钩子执行前，对实例执行矫正
                setCurrentInstance(target);
                hook.call(target);
                unsetCurrentInstance(); 

            }

            hooks.push(wrapHook);
        } 
    } 
}

export const onBeforeMount = createHook(LifeCycle.BEFORE_MOUNT);
export const onMounted = createHook(LifeCycle.MOUNTED);
export const onBeforeUpdate = createHook(LifeCycle.BEFORE_UPDATE);
export const onUpdated = createHook(LifeCycle.UPDATED);

export function invokeArray(fns){
    for(let i = 0 ; i < fns.length ; i++){
        fns[i](); 
    }
}

//传参示例
// function createHook(type){                                 (fn)=>{
//   ...                        return => onBeforeMount(fn) =   (fn,type);
// }                                                          }