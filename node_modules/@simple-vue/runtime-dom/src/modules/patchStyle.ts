export function patchStyle(el:HTMLElement, preValue, nextValue){
    let style = el.style;

    for(let key in nextValue){
        style[key] = nextValue[key]; //增加新样式
    }

    if(preValue){
        for(let key in preValue){
            if(nextValue){
                if(nextValue[key] == null){ //删除不存在的旧样式
                    style[key] = null;
                }
            }

        }
    }
}
