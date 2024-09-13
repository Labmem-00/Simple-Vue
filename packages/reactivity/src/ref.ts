//要点： api的实现，代理自动解包


import { activeEffect, trackEffect, triggerEffects } from "./effect";
import { toReactive } from "./reactive";
import { createDep } from "./reactiveEffect";

export function ref(value){
    return creatRef(value);
}

function creatRef(value){
    return new RefImpl(value);
}

class RefImpl{ //ref对象
    public __v_isRef = true; //增加ref标识
    public _valuel; //保存当前ref的值
    public dep;
    constructor(public rawValue){
        this._valuel = toReactive(rawValue); 
    }
    get value(){
        trackRefValue(this);
        return this._valuel;
    }
    set value(newValue){
        if(newValue !== this.rawValue){
            this.rawValue = new newValue;
            this._valuel = newValue;
            triggerRefValue(this);
        }
    }
}


function  trackRefValue(ref){
    if(activeEffect){
        trackEffect(
            activeEffect, 
            ref.dep = createDep(()=>(ref.dep = undefined), 'undifined')
        )
    }
}

function  triggerRefValue(ref){
    let dep = ref.dep;
    if(dep){
        triggerEffects(dep);
    }
}


class ObjectRefImpl{
    public __v_isRef = true; //增加ref标识

    constructor(public _object, public _key){}

    get value(){
        return this._object[this._key];
    }

    set value(newValue){
        this._object[this._key] = newValue;
    }
}
export function toRef(object, key){
    return new ObjectRefImpl(object, key);
}
export function toRefs(object){
    const res = {};
    for(let key in object){
        res[key] = toRef(object,key);
    }
    return res;
} 

export function proxyRefs(objectWithRef){
    return new Proxy(objectWithRef,{
        get(target,key,receiver){
            let r = Reflect.get(target,key,receiver);
            return r.__v_isRef ? r.value : r
        },
        set(target,key,value,receiver){
            const oldValue = target.get[key];
                if(oldValue.__v_isRef){
                    oldValue.value = value;
                    return true;
                }
                else{
                    return Reflect.set(target,key,value,receiver);
                }
        } 
    })
}