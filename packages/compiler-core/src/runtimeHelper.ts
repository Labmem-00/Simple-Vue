export const TO_DISPLAY_STRING = Symbol('TO_DISPLAY_STRING');
export const CREATE_TEXT_VNODE = Symbol("CREATE_TEXT_VNODE");
export const CREATE_ELEMENT_VNODE = Symbol(" CREATE_ELEMENT_VNODE")

export const OPEN_BLOCK = Symbol("OPEN_BLOCK");
export const CREATE_ELEMENT_BLOCK = Symbol("ELEMENT_BLOCK")
export const Fragment = Symbol("Fragment")

export const helperNameMap = {
    [TO_DISPLAY_STRING] : "toDisplayString",
    [CREATE_TEXT_VNODE] : "createTextVNode",
    [CREATE_ELEMENT_VNODE] : "createElementVNode",
    [CREATE_ELEMENT_BLOCK] : "createElementBlock",
    [OPEN_BLOCK] : "openBlock",
    [Fragment] : "Fragment"
}
//宏