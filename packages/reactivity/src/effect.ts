//要点：依赖收集与更新过程，依赖收集的存储结构weakMap->Map->Map|Set(effect...)，track与trigger，
//     调度执行函数选项，如何防止递归调用，对象的深度代理，

export function effect(fn, options?){
    //创建一个响应式effect 数据变化后重新执行

    //创建一个effct，依赖的数据更改后执行回调
    const _effect = new ReactiveEffect(fn, ()=>{
        _effect.run();  
    });
    _effect.run();
    if(options){
        Object.assign(_effect, options)
    }

    const runner = _effect.run.bind(_effect)
    return runner;
}

export let activeEffect
function preCleanEffect(effect){
    effect._depsLength = 0;
    effect._trackId++; //每次执行+1，如果为同一个effect，id就是相同的
}
function cleanDepEffect(dep, effect){//清理旧依赖
    dep.delete(effect);
    if(dep.size == 0){
        dep.cleanUp();
    }
}
function postCleanEffect(effect){ //清理多余的依赖项
    if(effect.deps.length > effect._depsLength){
        for(let i = effect._depsLength;i<effect.deps.length;i++){
            cleanDepEffect(effect.deps[i],effect);
        }
    }
    effect.deps.length = effect._depsLength //更新依赖列表的长度
}

class ReactiveEffect{
    _trackId = 0; //用于记录当前effect的执行次数,并且标识不同的effect
    deps = [];
    _depsLength = 0;//收集的依赖数
    _running = 0;
    public active = true;
    constructor(public fn, public scheduler){

    }
    run(){
        if(!this.active){
            return this.fn();
        }
        //依赖收集
        let lastEffect = activeEffect;
        try{
            activeEffect = this;

            //effect重新收集前，需要将旧依赖清空
            preCleanEffect(this);
            this._running++;//防止递归调用，当effect正在执行时不触发trigger
            return this.fn();
        }finally{
            this._running--;
            postCleanEffect(this);
            activeEffect = lastEffect;
        }
    }
    stop(){
        this.active = false;
    }
}

export function trackEffect(effect, dep){
    //重新收集依赖，比对移除不需要的effect，简易diff算法
    if(dep.get(effect) !== effect._trackId){
        dep.set(effect, effect._trackId);

        let oldDep = effect.deps[effect._depsLength];//旧依赖
        if(oldDep !== dep){
            if(oldDep){
                cleanDepEffect(oldDep,effect);
            }
            effect.deps[effect._depsLength++] = dep;
        }else{
            effect._depsLength++;
        }
    }
}

export function triggerEffects(dep){
    for(const effect of dep.keys()){
        if(effect.scheduler){
            if(!effect._running){
                effect.scheduler();
            }
        }
    }
}

