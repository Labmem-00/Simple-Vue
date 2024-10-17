import { currentInstance } from "./component";

export function provide(key, value){

    if(!currentInstance) return; //仅在setup时才能运行

    const parentProvides = currentInstance.parent?.provides;
    let provides = currentInstance.provides

    // 如果当前实例的 provides 与父组件的 provides 是同一个对象
    // 说明当前组件还没有自己独立的 provides，需要拷贝父组件的 provides
    if(parentProvides === provides){
        //如果子组件新增provides ，拷贝一份全新的
        provides = currentInstance.provides = Object.create(provides)
    }

    provides[key] = value;
}
export function inject(key, defaultValue="key  is not in provide"){
    if(!currentInstance) return;
    const parentProvides = currentInstance.parent?.provides;
    if(parentProvides&&(key in parentProvides)){
        return parentProvides[key];
    }else{
        return defaultValue;
    }
}