import { isObject } from "@simple-vue/shared";
import { activeEffect } from "./effect";
import { reactive } from "./reactive";
import { track, trigger} from "./reactiveEffect";
export enum ReactiveFlags {
    IS_REACTIVE = '__v_isReactive',
}
export const mutableHandlers: ProxyHandler<any>= {
    get(target, key, recevier){
        if(key === ReactiveFlags.IS_REACTIVE){
            return true;
        }
        //当取值时，让响应式属性与effect映射
        //依赖收集
        track(target, key);//收集对象属性

        let res = Reflect.get(target, key, recevier);
        if(isObject(res)){
            return reactive(res); //取值为对象时，将对象设置为reactive实现深度代理
        }
        return res;
    },
    set(target, key, value, recevier){
        //使用Reflect调用对象的默认行为

        let oldValue = target[key];
        let result = Reflect.set(target, key, value, recevier);
        if(oldValue !== value){
        //触发更新
            trigger(target, key, value, oldValue);
            return Reflect.set(target, key, value, recevier);
        }
       return result;
    },
};