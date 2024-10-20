export * from "./shapeFlags"
export * from "./patchFlags"

export function isObject(value) {
    return typeof(value) === "object" && value !== null;
}
export function isFunction(value) {
    return typeof(value) === "function";
}
export function isString(value){
    return typeof(value) === "string";
}
export function isVNode(value){
    return value?._v_isVNode;
}
export function isSameVNode(n1,n2){
    return n1.type === n2.type && n1.key === n2.key;
} 

const hasOwnProperty = Object.prototype.hasOwnProperty
export const hasOwn = (value, key) =>hasOwnProperty.call(value,key);//反柯里化