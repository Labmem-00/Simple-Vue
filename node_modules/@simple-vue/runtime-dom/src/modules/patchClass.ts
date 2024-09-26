export function patchClass(el:Element, value){
    if(value == null){
        el.removeAttribute("class");
    }else{
        el.className=value;
    }
}