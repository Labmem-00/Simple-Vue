//对节点元素的属性进行操作

import patchAttr from "./modules/patchAttr";
import { patchClass } from "./modules/patchClass";
import { patchEvent } from "./modules/patchEvent";
import { patchStyle } from "./modules/patchStyle";


export default function patchProp(el:HTMLElement, key, preValue, nextValue){
    if(key === "class"){
        return patchClass(el, nextValue)
    }else if(key === "style"){
        return patchStyle(el, preValue, nextValue);
    }else if(/^on[^a-z]/.test(key)){
        return patchEvent(el, key ,nextValue);
    }else{
        return patchAttr(el, key, nextValue)
    }
}