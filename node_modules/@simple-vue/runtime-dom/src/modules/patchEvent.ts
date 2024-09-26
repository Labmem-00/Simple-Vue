function createInvoker(handle:Function){//事件执行器
    const invoker = (e)=> invoker.value(e);
    invoker.value = handle;
    return invoker;
}

export function patchEvent(el:HTMLElement | any , name:string, nextValue){
    //vue_event_invoker
    const invokers = el._vei || (el._vei = {});
    const eventName = name.slice(2).toLowerCase();
    const exisitInv = invokers[name]; //是否存在同名的事件绑定

    if(nextValue && exisitInv){
        return exisitInv.value = nextValue //直接换绑事件
    }
    if(nextValue){
        const invoker = (invokers[name] = createInvoker(nextValue));
        return el.addEventListener(eventName, invoker);
    }

    if(exisitInv){ //现在没有，以前有的事件
        el.removeEventListener(eventName, exisitInv);
        invokers[name] = undefined;
    }
}
