//实现目的：计算属性的作用是基于已有数据的变化，自动计算并缓存值，而不需要在模板或方法中重复执行逻辑。与方法不同的是，
//计算属性具有缓存功能，只有在其依赖的属性变化时才会重新计算，这使得它更加高效。
//实现原理：
//1.维护 dirty 变量：
// 初始时，dirty 变量设置为 true，表示计算属性需要重新计算。第一次访问计算属性时，会执行相关的计算逻辑，然后将 dirty 设置为 false。
// 当计算属性依赖的某个值发生变化时，会将 dirty 重新赋值为 true，在下次访问时，会再次执行计算逻辑。
//2.依赖收集：
// 计算属性具有依赖收集的能力，能够自动收集与其相关的响应式数据。这通常是通过使用 effect 来实现的。
// 在计算属性内部，当访问依赖的响应式数据时，Vue 会将这些依赖关系记录下来，以便在数据变化时能够触发重新计算。
//3.计算属性作为 effect：
// 计算属性本质上是一个 effect，即它是一个函数，返回不可变的ref，并且在这个函数内部会访问一些响应式数据。Vue 在第一次执行这个函数时会进行依赖收集，并在后续数据变化时自动触发这个函数。

import { isFunction } from "@simple-vue/shared";
import { ReactiveEffect, triggerEffects } from "./effect";
import { trackRefValue } from "./ref";
import { triggerRefValue } from "./ref";

class ComputedRefImpl{
    public _value; //缓存计算值
    public effect;
    public dep;
    constructor(getter,public setter){
       this.effect = new ReactiveEffect(
            ()=>getter(this._value),
            ()=>{
                triggerRefValue(this)//计算属性变化重新触发
        })
    }
    get value(){
        if(this.effect.dirty){
        //默认为脏，执行一次
            this._value = this.effect.run();
            //当前在effect中访问了计算属性，计算属性可以收集effect
            trackRefValue(this)
        }
        return this._value
        
    }
    set value(v){
        this.setter(v);
    }
}


export function computed(getterOrOptions){
    let onlyGetter = isFunction(getterOrOptions);
    let getter,setter;
    if(onlyGetter){
        getter = getterOrOptions;
        setter = function(){};
    }else{
        getter = getterOrOptions.get;
        setter = getterOrOptions.set;
    }

    return new ComputedRefImpl(getter,setter);
}