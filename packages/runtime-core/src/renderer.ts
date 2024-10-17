import { hasOwn, isSameVNode, PatchFlags, ShapeFlags } from "@simple-vue/shared";
import { getSequence } from "./seq"
import { createVNode, Fragment, Text } from "./createVNode";
import { isRef, reactive, ReactiveEffect } from "@simple-vue/reactivity";
import { queueJob } from "./scheduler";
import { createComponentInstance, setupComponent } from "./component";
import { invokeArray } from "./apiLifecycle";
import { isKeepAlive } from "@simple-vue/runtime-dom";


export function createRenderer(renderOptions){
    //创建渲染器，
    //运行时核心模块，不关心如何渲染，只定义渲染行为
    //可以跨平台定义渲染api
    const{
        insert: hostInsert,
        remove: hostRemove,
        createElement: hostCreateElement,
        createText: hostCreateText,
        setText: hostSetText,
        setElementText: hostsetElementText,
        parentNode: hostparentNode,
        nextSibling: hostnextSibling,
        patchProp: hostpatchProp
    } = renderOptions;

    // 如果是字符串，格式化成文本节点
    const normalize = (children)=>{
        for(let i=0;i<children.length;i++){
            if(typeof(children[i])==="string" || typeof(children[i])==="number"){
            children[i] = createVNode(Text,null,String(children[i])); 
              }
        }
        return children;
    }

    //挂载子元素
    const mountChildren = (children, container,parentComponent)=>{
        normalize(children);
        for(let i=0;i<children.length;i++){
            patch(null,children[i],container,parentComponent);
        }
    }
    //挂载元素
    const  mountElement = (vnode, container,anchor, parentComponent)=>{
        const {type, children, props,shapeFlag,transition} = vnode;

        //第一次渲染的时候，将虚拟dom与其挂载的真实dom关联，添加一个属性记录，同时可以做比对更新
        let el = (vnode.el =  hostCreateElement(type));

        if(props) {
            for(let prop in props){
                hostpatchProp(el, prop, null, props[prop]);
            }
        }

        if(shapeFlag & ShapeFlags.TEXT_CHILDREN){
            hostsetElementText(el,children)
        }else if(shapeFlag & ShapeFlags.ARRAY_CHILDREN){
            mountChildren(children, el, parentComponent);
        }
        if(transition){
            transition.beforeEnter(el);
        }

        hostInsert(el,container,anchor);

        if(transition){
            transition.enter(el)
        }
    }

    function processElement(oldVN, newVN, container,anchor, parentComponent){        
        if(oldVN == null){
            //元素初始化
            mountElement(newVN, container,anchor,parentComponent);
        }else{
            patchElement(oldVN, newVN, anchor,container,parentComponent)
        }
    }

    //属性更新
    function patchProps(oldProps,newProps,el){
        for(let key in newProps){
            hostpatchProp(el,key,oldProps[key],newProps[key]);
        }
        for(let key in oldProps){
            if(!(key in newProps)){
                hostpatchProp(el,key,oldProps[key],null);
            }
        }
    }
    const unmount = (vnode, parentComponent)=> {
        const {shapeFlag,transition,el} = vnode;
        const performRemove = ()=>hostRemove(vnode.el);
        if(shapeFlag & ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE){
            parentComponent.ctx.deactivate(vnode);
        }else if(vnode.type === Fragment){
            unmountChildren(vnode.children, parentComponent)
        }else if(shapeFlag & ShapeFlags.COMPONENT){
            unmount(vnode.component.subTree,parentComponent)
        }else if(shapeFlag & ShapeFlags.TELEPORT){
            vnode.type.remove(vnode, unmountChildren);
        }
        else{

            if(transition){
                transition.leave(el,performRemove);
            }else{
                performRemove();
            }
        }
    }; //卸载元素

    const unmountChildren = (children, parentComponent)=>{ //卸载子元素
        for(let i = 0;i<children.length;i++){
            let child = children[i];
            unmount(child, parentComponent);
        }
    }
    const patchKeyedChildren = (oldC,newC,container, parentComponent)=>{
        //key值存在的情况
        //比较带key子节点差异，同层比较，双端比较
        //1.减少比较范围，先从头部比较，再从尾部比较，确定需要比较的范围
        //2.再从头比对，尾部比对，如果有不同的直接操作

        let i = 0;//开始比对的索引,头部指针
        let e1 = oldC.length - 1;//第一个数组的尾部索引，尾部指针
        let e2 = newC.length - 1;//第二个数组的尾部索引

        //双端比较
        while(i<=e1 && i<=e2){ // 1.从前往后，任何一个子节点数组循环结束，中止比较
            const n1 = oldC[i];
            const n2 = newC[i];
            if(isSameVNode(n1,n2)){
                patch(n1,n2,container); //更新当前节点的属性和子节点
            }else{
                break;
            }
            i++;
        }
        while(i<=e1 && i<=e2){ 2.//从后往前比对
            const n1 = oldC[e1]; 
            const n2 = newC[e2];

            if(isSameVNode(n1,n2)){
                patch(n1,n2,container);
            }else{
                break;
            }
            e1--;
            e2--;
        }   
        //双端比对完成，比较指针位置
        //3.i>e1时，有新增元素，i到e2的内容
        if(i>e1){
            if(i<=e2){
               while(i<=e2) { 
                    const nextPos = e2+1;
                    //追加，如果e2后存在下一个元素，说明在头部追加，拿到下一个元素对应的真实dom
                    //没有下一个元素，说明尾部追加
                    const anchor = nextPos < newC.length ? newC[nextPos].el :null
                    patch(null,newC[i],container,anchor);
                    i++;
               }   
            }
        }else if(i>e2){ //4.i>e2时,需要删除元素
            while(i<=e1){
                unmount(oldC[i], parentComponent);
                i++;
            }
        }
        //以上确定不变化的节点，复用
        //5. 最后特殊情况，既无法前后匹配的乱序，unknown sequence

        let s1 = i;
        let s2 = i; 
        //build key:index map for newChildren
        const keyToNewIndexMap = new Map();
        let toBePatched = e2 -s2 + 1 //需要插入的个数

        let newIndexToOldMapIndex = new Array(toBePatched).fill(0); 
        //记录乱序 节点的对应原始位置，0为未创建的节点，对该数组求连续性最强的子序列索引

        for(let i =s2;i<=e2;i++){
            const vnode = newC[i];
            keyToNewIndexMap.set(vnode.key, i); 
        }
        for(let i =s1;i<=e1;i++){
            const vnode =oldC[i];
            const newIndex = keyToNewIndexMap.get(vnode.key);//在新的子节点map中匹配存在的旧节点 
            if(newIndex == undefined){ 
                unmount(vnode, parentComponent);//删除不需要的旧节点
            }else{
                newIndexToOldMapIndex[newIndex-s2] = i+1;
                patch(vnode,newC[newIndex],container);//复用存在的旧节点 
            }
        }
        //调整顺序   
        //根据新队列调整插入顺序,通过参照物倒序插入

        //vue3 全量diff，快速diff(靶向更新，基于编译模块)
        let increasingSeq = getSequence(newIndexToOldMapIndex);
        //diff算法优化，针对重复出现的最长子序列不进行移除插入操作
        let seqLast = increasingSeq.length-1;
        
        for(let i = toBePatched - 1;i>=0;i--){
            let newIndex =  s2 + i //需要更新乱序节点的末尾对应的索引 
            let anchor = newC[newIndex+1]?.el;  // 当前参照物
            let vnode = newC[newIndex];
            if (!vnode.el) {  // 没有对应的真实节点，则是新增元素
                patch(null, vnode, container, anchor);
            } else {
                if(i === increasingSeq[seqLast]){
                    seqLast--;
                }else{
                    hostInsert(vnode.el, container, anchor);
                }
            }
        }
    } 

    function patchChildren(oldVN,newVN,container,parentComponent){
        const oldC = oldVN.children;
        const newC = normalize(newVN.children);
        //子节点的组合情况
        //1.新文本，旧数组，移除数组,加入新文本
        //2.新文本，旧文本，直接替换
        //3.新数组, 旧数组,全量diffn
        //4.新不是数组，旧数组
        //5.新空，旧数组
        //6.新数组，旧文本
        const preShapeFlag = oldVN.shapeFlag;
        const shapeFlag = newVN.shapeFlag;  
        if(shapeFlag & ShapeFlags.TEXT_CHILDREN){ 
            if(preShapeFlag & ShapeFlags.ARRAY_CHILDREN){   
                unmountChildren(oldC, parentComponent);//情况1，移除旧数组
            }
            if(oldC !==  newC){ //两个子节点不同，设置新的文本，包含情况1，2
                hostsetElementText(container,newC);
            }
        }else{
            if(preShapeFlag & ShapeFlags.ARRAY_CHILDREN){
                if(shapeFlag & ShapeFlags.ARRAY_CHILDREN){//情况3，新旧都是数组，全量diff
                    patchKeyedChildren(oldC,newC,container,parentComponent);
                }else{
                    unmountChildren(oldC, parentComponent)//情况4和5，新不是数组，移除旧数组
                }
            }else{
                if(preShapeFlag & ShapeFlags.TEXT_CHILDREN){
                    hostsetElementText(container,"")
                }
                if(shapeFlag & ShapeFlags.ARRAY_CHILDREN){//情况6，新的是文本，挂载新数组
                    mountChildren(container,newC,parentComponent);
                }
            }
        }
 
    }

    const patchBlockChildren = (oldVN, newVN, anchor,container, parentComponent)=>{
        for(let i = 0; i<newVN.dynamicChildren.length ; i++){
            patch(oldVN.dynamicChildren[i], newVN.dynamicChildren[i],container, anchor, parentComponent)
        }
    }

    function patchElement(oldVN, newVN, anchor,container, parentComponent){
        //1.比较元素差异
        //2.比较属性和子节点
        let el = (newVN.el = oldVN.el); //对真实dom元素的复用，只更新一些属性等，不销毁
        let oldProps = oldVN.props || {};
        let newProps = newVN.props || {};
        
        //靶向更新,存在动态的属性
        const {patchFlag, dynamicChildren} = newVN;
        if(patchFlag){

        }else{
             patchProps(oldProps,newProps,el); 
        } 
        if(patchFlag & PatchFlags.TEXT){
            if(oldVN.children !== newVN.children){
               return hostsetElementText(el, newVN.children);
            }
        }
        if(dynamicChildren){
            patchBlockChildren(oldVN, newVN, anchor,container, parentComponent)
        }else{
            //全量diff
            patchChildren(oldVN,newVN,el,parentComponent);
        }
   
    }

    const processText = (oldVN,newVN,container)=>{
        if(oldVN === null){
           //管理真实节点，将节点插入页面中
           hostInsert(newVN.el = hostCreateText(newVN.children),container);
        }else{
            let el = (newVN.el = oldVN.el);
            if(oldVN.children !== newVN.children){
                hostSetText(el,newVN.children); 
           }  
        }
    }       

    const processFragment = (oldVN,newVN,container,parentComponent)=>{
        if(oldVN == null){
            mountChildren(newVN.children, container,parentComponent);
        }else{
            patchChildren(oldVN,newVN,container, parentComponent);
        }
    }

    const updataComponentPreRender = (instance,next)=>{
        instance.next = null;
        instance.vnode =next;
        updataProps(instance,instance.props,next.props || {});

        Object.assign(instance.slots,next.children)
    }

    const renderComponent = (instance)=>{
        const {render, vnode, proxy, props, attrs,slots} = instance;
        if(vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT){
            return render.call(proxy, proxy );
        }else{
            return vnode.type(attrs,{slots});
        }
    } 
    //3.组件挂载与更新，创建effect，依赖收集
    function setupRenderEffect(instance, container, anchor,  parentComponent) {
        const {render} = instance; //组件中的render
        const componentUpdateFn = ()=>{

            const {bm,m} = instance

            if(!instance.isMounted){//组件首次渲染  
                if(bm){
                    invokeArray(bm);//挂载前生命周期钩子
                }

                const subTree = renderComponent(instance);
                patch(null,subTree,container,anchor, instance);
                instance.isMounted = true;
                instance.subTree = subTree;
                if(m){
                    invokeArray(m);//挂载后生命周期钩子
                }

            }else{ //基于状态的更新,组件更新
                const {next, bu, u} = instance;

                if(next){
                    //更新属性和插槽
                    updataComponentPreRender(instance,next);
                }

                if(bu){
                    invokeArray(bu);//更新前生命周期钩子
                }

                const subTree = renderComponent(instance);
                patch(instance.subTree,subTree,container,anchor,instance);
                instance.subTree = subTree;

                if(u){
                    invokeArray(u);//更新后生命周期钩子
                }
            }   
        }


        const effect = new ReactiveEffect(componentUpdateFn, ()=>queueJob(update )); 
        const update = (instance.update = ()=>{
            effect.run();
        });
        update(); 
    }

    const mountComponent = (newVN, container, anchor, parentComponent)=>{
        //1.创建组件实例
        const instance = newVN.component = createComponentInstance(newVN, parentComponent);

        if(isKeepAlive(newVN)){
            instance.ctx.renderer ={
                createELement: hostCreateElement,//内部创建一个div来存储dom
                move(newVN, container){//将已经渲染的函数dom放入容器中
                    hostInsert(newVN.component.subTree.el,container);
                },
                unmount  //如果组件切换，将现在容器中的元素移除
            }
        }

        //2.实例初始化
        setupComponent(instance); 
        //3.创建effect，依赖收集
        setupRenderEffect(instance, container, anchor,  parentComponent)
      
    } 

    const hasPropsChange = (prevProps,nextProps)=>{
        let nkeys = Object.keys(nextProps)
        if(nkeys.length !== Object.keys(prevProps).length){
            return true;
        } 
        for(let i = 0 ; i < nkeys.length ; i++){
            const key = nkeys[i];
            if(nextProps[key] !== prevProps[key]){
                return true;
            }
        }
        return false;
    }

    const updataProps = (instance,prevProps,nextProps)=>{
        if(hasPropsChange(prevProps,nextProps)){
            for(let key in nextProps){
                instance.props[key] = nextProps[key];
            }
            for(let key in instance.props){
                if(!(key in nextProps)){
                    delete instance.props[key];
                }
            }
        }
        
    }

    const shouldComponentUpdate = (oldVN,newVN)=>{
        const {props: prevProps, children: preChildren} = oldVN;
        const {props: nextProps, children: nextChildren} = newVN;

        if(preChildren || nextChildren) return true; //有插槽直接重新渲染
        if(prevProps === nextProps) return false;
    
        // 如果属性不一致，更新
        return hasPropsChange(prevProps,nextProps || {});
    }

    const updateComponent = (oldVN,newVN)=>{
        //元素更新，复用dom n2.el = n1.el
        //组件更新，复用组件实例 n2.component= n1.component
        const instance = (newVN.component = oldVN.component)

        if(shouldComponentUpdate(oldVN,newVN)){
            instance.next = newVN; //有next属性，说明是属性更新或者插槽更新
            instance.update();
        }
    }

    const processComponent = (oldVN, newVN, container, anchor, parentComponent)=>{
        if(oldVN === null){
            if(newVN.shapeFlag & ShapeFlags.COMPONENT_KEPT_ALIVE){
                parentComponent.ctx.activate(newVN, container, anchor)
            }else{
                mountComponent(newVN, container, anchor,parentComponent);
            }
        }else{
            updateComponent(oldVN,newVN);
        }
    }

    //首次渲染与更新，oldVN为null则是首次渲染
    const patch = (oldVN, newVN, container,anchor = null,parentComponent = null)=>{
        if(oldVN == newVN){
            return;
        } 
        if(oldVN && !isSameVNode(oldVN,newVN)){
            unmount(oldVN, parentComponent); 
            oldVN=null;
        }
        const {type,shapeFlag,ref} = newVN;
        switch(type){
            case Text:
                processText(oldVN,newVN,container);
                break;
            case Fragment:
                processFragment(oldVN,newVN,container,parentComponent);
                break;
            default:
                if(shapeFlag & ShapeFlags.ELEMENT){
                    processElement(oldVN, newVN, container,anchor,parentComponent);
                    //对元素处理
                }else if(shapeFlag & ShapeFlags.TELEPORT){
                    type.process(oldVN, newVN, container, anchor,parentComponent,{
                        mountChildren, 
                        patchChildren,
                        move(vnode,container,anchor){
                            hostInsert(
                                vnode.component ? vnode.component.subTree.el : vnode.el,
                                container,
                                anchor
                            );
                        }
                    })
  
                }else if(shapeFlag & ShapeFlags.COMPONENT){
                    //对组件的处理，vue3中函数式组件废弃
                    processComponent(oldVN,newVN,container,anchor,parentComponent);
                }
           
        }
        if(ref != null){
            setRef(ref,newVN);
        }
        
    }
    function setRef(ref,newVN){
        //如果是组件，存在expose，则ref为expose，否则为组件实例
        //如果是一把元素，则ref是dom节点
        let value = newVN.shapeFlag & ShapeFlags.STATEFUL_COMPONENT ? 
                    newVN.component.exposed || newVN.component.proxy :
                    newVN.el;
        if(isRef(ref)){
            ref.value = value;
        }

    }

    const render = (vnode, container)=>{
        //定义渲染行为，将虚拟节点转化为真实节点

        if(vnode == null){ 
            if(container._vnode){
                unmount(container._vnode, null);
            }
        }else{
            patch(container._vnode || null,vnode,container);
            container._vnode = vnode; //缓存旧的虚拟节点
        }
 
    }; 
    return {
        render //返回渲染器
    };
}