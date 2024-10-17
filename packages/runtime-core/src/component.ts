import { proxyRefs, reactive } from "@simple-vue/reactivity";
import { hasOwn, isFunction, ShapeFlags } from "@simple-vue/shared";
import { provide } from "vue";

//组件更新，基于状态data，属性props，插槽slots 

export function createComponentInstance(vnode,parent){
    //创建组件实例
    const instance = { 
        data: null,  
        vnode,//组件的虚拟节点
        subTree: null, 
        isMounted: false,
        update: null, //组件的更新函数
        props:{}, //用户自定义组件属性，响应式 
        attrs:{}, //dom节点属性，非响应式
        slots:{}, //插槽
        propsOptions: vnode.type.props, //
        component: null,
        proxy: null,  //代理对象，代理props，attrs，data,方便用户访问 
        setupState: {},
        exposed: null, //向组件外部暴露属性
        parent,
        provides: parent ? parent.provides : Object.create(null), //父组件存在则拷贝一份引用
        ctx: {} as any,//弱国是keepAlive组件，就将dom api放入 
    };
    return instance;
}

//初始化实例属性
//根据propsOptions区分attrs和props
const initProps = (instance, rawProps)=>{ //raw为组件的所有属性
    const props = {};
    const attrs = {};
    const propsOptions = instance.propsOptions || {};
    if(rawProps){ //从所有的属性中分离出props和attr
        for(let key in rawProps){
            const value = rawProps[key];

            if(key in propsOptions){
                props[key] = value;//不需要深度代理，组件不需要更改属性 
            }else{
                attrs[key] = value;
            }
        }
    }
    instance.props = reactive(props);
    instance.attrs = attrs;
}

const initSlots = (instance, slotsChildren)=>{
    if(instance.vnode.shapeFlag & ShapeFlags.SLOTS_CHILDREN){
        instance.slots = slotsChildren;
    }else{
        instance.slots = {};
    }
}

//组件实例代理对象，代理props，attrs，data,方便用户访问
const publicProperty = {
    $attrs: (instance)=>instance.attrs,
    $slots: (instance)=>instance.slots
}
const handlerProxy = (instance)=>{
        instance.proxy = new Proxy(instance, {
        get(target,key){
            const {data, props, setupState} = target;
            if(data && hasOwn(data,key)){ //用户
                return data[key];  
            }else if(props&&hasOwn(props,key)){
                return props[key];
            }else if(setupState && hasOwn(setupState,key)){
                return setupState[key];
            }   
            const getter = publicProperty[key];
            if(getter){ 
                return getter(target);
            }
        },
        set(target,key,value){
            const {data, props, setupState} = target;
            if(data && hasOwn(data,key)){
                data[key] = value;
            }else if(hasOwn(props,key)){
                console.log("props are only readonly");
            }else if(setupState && hasOwn(setupState,key)){
                setupState[key] = value;
            }   
            return true;
        }
    })
}
 
//初始化组件实例
export function setupComponent(instance){
    const {vnode} = instance;
    initProps(instance,vnode.props);
    initSlots(instance,vnode.children);
    handlerProxy(instance);
    const {data = ()=>{}, render, setup} = vnode.type ;

    if(setup){
        const setupContext = {
            attrs : instance.attrs,
            slots : instance.slots,
            expose(value){
                instance.exposed = value
            },
            emit(event, ...payload){

                const eventName = `on${event[0].toUpperCase() + event.slice(1)}`;
                const handler = instance.vnode.props[eventName];
                handler && handler(...payload) 
            }
       
        }
        
        setCurrentInstance(instance);
        const setupResult =  setup(instance.props,setupContext);
        unsetCurrentInstance();

        if(isFunction(setupResult)){
            instance.render = setupResult;
        }else{
            instance.setupState = proxyRefs(setupResult); //将返回值自动.value
        }
    }

    if(!isFunction(data)){
        console.warn("data must be a function");
    }else{
        instance.data = reactive(data.call(instance.proxy));
    }
    //this指向proxy，data中可以取值proxy
    if((!instance.render)&&render){
        instance.render = render; //setup中没有render用自定义的render
    }else if(!instance.render){
        console.warn( 'Component is missing a render function');
    }
}   

export let currentInstance = null;
export const getCurrentInstance = ()=>{
    return currentInstance; 
};

export const setCurrentInstance = (instance)=>{
    currentInstance = instance;
};

export const unsetCurrentInstance = () =>{
    currentInstance = null;
};