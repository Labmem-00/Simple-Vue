//创建虚拟dom节点
//传参情况：1.两个参数，第二个可能为属性或者子虚拟dom
//2.第二个参数为包含子虚拟dom的数组
//3.第二个参数为文本
//4.三个参数，第二个参数必须时属性
//5.三个参数后面的参数都是子虚拟dom

import { isObject, isVNode} from "@simple-vue/shared";
import { createVNode } from "./createVNode";

export function h(type, propsOrChildren?, children?){
    let l = arguments.length;
    if(l === 2){  //两个参数
        if(isObject(propsOrChildren) && !Array.isArray(propsOrChildren)){ //第二个参数是对象，但不是数组，所以只能是属性或者一个虚拟dom
            if(isVNode(propsOrChildren)){ //如果是子节点，那么将它包装成数组处理
                return createVNode(type,null,[propsOrChildren]);
            }else{//否则是属性对象
                return createVNode(type,propsOrChildren);
            }
        }
        return createVNode(type,null,propsOrChildren)//剩下的情况，是一个子虚拟dom数组
    }else{ //三个或以上参数
        if(l>3){
            children = Array.from(arguments).slice(2); //3个以上直接全部截取返回一个数组
        }
        if(l === 3 && isVNode(children)){
            children = [children];//刚好三个且是单独的虚拟dom，包装成数组
        }
    }

    return createVNode(type, propsOrChildren, children)//标志格式，三个参数，类型，属性，虚拟dom数组
}