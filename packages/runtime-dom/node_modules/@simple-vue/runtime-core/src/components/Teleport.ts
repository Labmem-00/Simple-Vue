import { ShapeFlags } from "@simple-vue/shared";

export const Teleport = {
    _isTeleport: true,
    process(oldVN, newVN, container, anchor,parentComponent,internals){
        const {mountChildren, patchChildren,move} = internals;

        if(!oldVN){
            const target = newVN.target =document.querySelector(newVN.props.to);
            if(target){
                mountChildren(newVN.children, target ,parentComponent);
            }
        }else{
            patchChildren(oldVN, newVN, newVN.target,parentComponent);
            if(newVN.props.to != oldVN.props.to){
                const nextTarget = newVN.target =document.querySelector(newVN.props.to);
                newVN.children.forEach((child)=>move(child,nextTarget,anchor))
            }   
        }
    },
    remove(vnode, unmountChildren){
        const {shapeFlag, children} =vnode;
        if(shapeFlag & ShapeFlags.ARRAY_CHILDREN){
            unmountChildren(children);
        }
    }
} 

export const isTeleport = (value)=>{return value._isTeleport};