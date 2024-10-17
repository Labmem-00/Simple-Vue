import { CREATE_ELEMENT_VNODE, CREATE_TEXT_VNODE, Fragment } from "./runtimeHelper";

export enum NodeTypes {
    ROOT,
    ELEMENT,
    TEXT,
    COMMENT,
    SIMPLE_EXPRESSION, // {{ name }}
    INTERPOLATION, // {{}}
    ATTRIBUTE,
    DIRECTIVE,
    // containers
    COMPOUND_EXPRESSION, // {{ name}} + 'abc'
    IF,
    IF_BRANCH,
    FOR,
    TEXT_CALL, // createVnode
    // x
    VNODE_CALL,
    JS_CALL_EXPRESSION, // ()
    JS_OBJECT_EXPRESSION, // props
    JS_PROPERTY,
    JS_ARRAY_EXPRESSION,
    JS_FUNCTION_EXPRESSION,
    JS_CONDITIONAL_EXPRESSION,
    JS_CACHE_EXPRESSION,
  
    // ssr codegen
    JS_BLOCK_STATEMENT,
    JS_TEMPLATE_LITERAL,
    JS_IF_STATEMENT,
    JS_ASSIGNMENT_EXPRESSION,
    JS_SEQUENCE_EXPRESSION,
    JS_RETURN_STATEMENT,
  }

  export function createCallExpression(context,args){
    let name = context.helper(CREATE_TEXT_VNODE);

    return{
      type: NodeTypes.JS_CALL_EXPRESSION,
      arguments: args,
      callee: name,//返回值
    }
  }

  export function createVNodeCall(context, tag, props, children){ //创建vnode结构
      let name;
      if(tag !== Fragment){
        name = context.helper(CREATE_ELEMENT_VNODE);
      }
      return{
        type: NodeTypes.VNODE_CALL,
        tag, 
        props, 
        children,
        callee:name
      }
  }

  export function createObjectExpression(properties) {
    return {
      type: NodeTypes.JS_OBJECT_EXPRESSION,
      properties,
    }
  }