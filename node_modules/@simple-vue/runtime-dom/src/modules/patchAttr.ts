export default function patchAttr(el:HTMLElement, key, value){
    if(!value || value == null){
        el.removeAttribute(key);
    }else{
        el.setAttribute(key, value);
    }
}
