//缓存组件，不会重新渲染
import { onMounted, onUpdated } from "../";
import { getCurrentInstance } from "../component";
import { ShapeFlags } from "@simple-vue/shared";



export const KeepAlive = {
    __isKeepAlive: true,
    props:{
        max:Number //最大缓存数,
    },
    setup(props, {slots}){
        const {max} = props;
        const keys = new Set(); //用来记录哪些组件缓存过
        const cache = new Map();//缓存表

 
        let pendingCacheKey = null;
        const instance = getCurrentInstance();

        //keepalivede组件的激活方法
        const {move, createELement, unmount:_unmount} = instance.ctx.renderer;

        function reset(vnode){ //还原组件原始状态
            let shapeFlag = vnode.shapeFlag;
            if(shapeFlag & ShapeFlags.COMPONENT_KEPT_ALIVE){
                shapeFlag -= ShapeFlags.COMPONENT_KEPT_ALIVE;
            }
            if(shapeFlag & ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE){
                shapeFlag -= ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE;
            }
            vnode.shapeFlag =shapeFlag;
        }
        function unmount(vnode){
            reset(vnode);
            _unmount(vnode);
        }

        function purneCacheEntry(key){
            keys.delete(key);
            const cached = cache.get(key);//真正卸载最旧访问的组件
            unmount(cached);
        }


        instance.ctx.activate = function(vnode, container, anchor){
            move(vnode, container, anchor)
        };
        //卸载方法
        const storageContent = createELement("div");
        instance.ctx.deactivate = function(vnode){
            move(vnode,storageContent, null);//将当前dom移动到容器里
        };


        const cacheSubtree = ()=>{
            cache.set(pendingCacheKey,instance.subTree);
        }

        onMounted(cacheSubtree) //缓存组件的虚拟节点，保存有组件的dom元素
        onUpdated(cacheSubtree )

        return ()=>{
            const vnode = slots?.default();
            const comp = vnode.type;
            const key = vnode.key == null ? comp:vnode.key

            const cacheV = cache.get(key);
            pendingCacheKey = key;
            if(cacheV){
                vnode.component = cacheV.component; //存在则无需创建组件实例，直接复用
                vnode.shapeFlag |= ShapeFlags.COMPONENT_KEPT_ALIVE;
                keys.delete(key);
                keys.add(key); //刷新缓存
            }else{
                keys.add(key);
                if(max && keys.size > max){ //当缓存空间不够时，删除第一个元素
                    //获取set的第一个元素
                    purneCacheEntry(keys.values().next().value);
                }
            }

            vnode.shapeFlag |= ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE;//将组件临时放入存储容器
            return vnode; //等待组件加载完缓存
        }
    }
}

export const isKeepAlive = (value)=> value.type.__isKeepAlive