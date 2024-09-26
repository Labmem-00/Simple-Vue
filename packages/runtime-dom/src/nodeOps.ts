

//对节点元素的操作
export const nodeOps = {
    insert(el, parent, anchor=null){ //参照物存在则插入前面
        parent.insertBefore(el, anchor || null);
        //如果插入参照元素不存在，则直接插入父元素中
        // parent.insertBefore(el, null) === parent.appendChild(el);
    },
    remove(el){
        const parent = el.parentNode;
        if(parent){
            parent.removeChild(el); 
        }
    },
    createElement:(type)=>document.createElement(type),
    createText:(text)=>document.createTextNode(text),
    setText:(node,text)=>node.nodeValue = text,
    setElementText:(el, text)=> el.textContent =text,
    parentNode: (node)=>node.parentNode,
    nextSibling: (node)=>node.nextSibling
};