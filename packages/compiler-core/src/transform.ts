import { CREATE_ELEMENT_BLOCK, CREATE_ELEMENT_VNODE,Fragment, OPEN_BLOCK, TO_DISPLAY_STRING } from "./runtimeHelper";
import { createCallExpression, createObjectExpression, createVNodeCall, NodeTypes } from "./Ast";
import { PatchFlags } from "@simple-vue/shared";


//遍历ast语法树， 先序搜索，返回并保存函数，后序执行
function transformElement(node, context){
    if(node.type == NodeTypes.ELEMENT){
        return function(){
            let {tag, props, children} = node;
            let vnodeTag = tag;
            let properties = [];
            
            for(let i=0 ; i<props.length ; i++){
                properties.push({key:props[i].name,value: props[i].value.content} );
             }

            const propsExpression = properties.length > 0 ? createObjectExpression(properties):null 

            let vnodeChildren = null;
            if(children.length == 1){
                vnodeChildren = children[0];
            }else if(children.length > 1){
                vnodeChildren = children;
            };

            node.codegenNode = createVNodeCall(context,vnodeTag,propsExpression,vnodeChildren)
            
            
        }
    }

}

function isText(node){
    return node.type === NodeTypes.INTERPOLATION || node.type === NodeTypes.TEXT
}
function transformText(node, context){
    if(node.type == NodeTypes.ELEMENT || node.type == NodeTypes.ROOT){
    
        //处理顺序，等待子节点全部处理后，赋值给父元素
        return function(){ 
            const children = node.children;
            let containner = null;
            let hasText = false;
            for(let i=0 ; i<children.length ; i++){ //合并表达式与文本节点，优化效率
                let child =children[i];

                if(isText(child)){
                    hasText = true;
                    for(let j = i+1; j<children.length ; j++){
                        const next = children[j];

                        if(isText(next)){
                            if(!containner){
                                containner = children[i] = {
                                    type: NodeTypes.COMPOUND_EXPRESSION,
                                    children: [child]

                                }
                            }
                            containner.children.push('+', next);
                            children.splice(j,1);
                            j--;
                        }else{
                            containner = null; 
                            break;
                        }
                    }
                }
 
            //如果文本节点仅有一个，无需创建新元素，直接作为子节点
            if(!hasText || children.length == 1){
                return;
            };

            for(let i=0 ; i<children.length ; i++){
                let child = children[i];

                if(isText( child) || child.type === NodeTypes.COMPOUND_EXPRESSION){
                    const args = [];
                    args.push(child);

                    if(child.type !== NodeTypes.TEXT){
                        args.push(PatchFlags.TEXT);
                    }

                    children[i] = {
                        type: NodeTypes.TEXT_CALL,
                        context:child,
                        codegenNode: createCallExpression(context, args)
                    }
                }
            }
              
        }
    }
}}

function transformExpression(node, context){
    if(node.type == NodeTypes.INTERPOLATION){
        node.content.content = `_ctx.${node.content.content}`;
    }
} 


function createTransformContext(root){
    const context = { //创建遍历上下文
        currentNode: root,
        parent: null,
        transformNode:[ //遍历方法，依次元素，文本，表达式
            transformElement,
            transformText,
            transformExpression
        ],
        helpers: new Map(), //记录方法与调用次数
        helper(name){
            let count = context.helpers.get(name) || 0;
            context.helpers.set(name, count+1);
            return name; 
        },
        removeHelper(name){
           let count = context.helpers.get(name);

           if(count){
            let v =count - 1;

            if(!count){
                context.helpers.delete(name);
            }else{
                context.helpers.set(name,count);
            }
           }
        }
    }
    return context;
}

function traverseNode(node, context){
    context.currentNode = node;
    const transforms = context.transformNode;

    const exits = []; //回退栈执行后序遍历，先存储转换函数，不断遍历子节点，遍历完成从栈顶取出依次执行
    for(let i = 0; i < transforms.length; i++){
       let exit = transforms[i](node,context);

       exit && exits.push(exit);
    }

    switch(node.type){
        case NodeTypes.ROOT:
        case NodeTypes.ELEMENT:
            for(let i=0 ; i < node.children.length; i++){
                context.parent = node;
                traverseNode(node.children[i],context);
            }
            break;
        case NodeTypes.INTERPOLATION:
            context.helper(TO_DISPLAY_STRING);
            break
    }
    context.currentNode = node; //当前子节点重新赋值
    let i = exits.length
    if(i>0){
        while(i--){
            exits[i]();
        }
    }
}

function createRootCodegenNode(ast, context){
    let {children} = ast;

    if(children.length == 1){
        let child = children[0];
        if(child.type === NodeTypes.ELEMENT){
            ast.codegenNode = child.codegenNode;
            context.removeHelper(CREATE_ELEMENT_VNODE);
            context.helper(CREATE_ELEMENT_BLOCK);
            context.helper(OPEN_BLOCK);
            ast.codegenNode.isBlock = true;
        }else{
            ast.codegenNode = child;
        }
    }else if(children.length > 0){

        ast.codegenNode = createVNodeCall(context,context.helper(Fragment),undefined,children)

        context.helper(CREATE_ELEMENT_BLOCK);
        context.helper(OPEN_BLOCK);
        ast.codegenNode.isBlock = true;
    }
}

function transform(ast){
    const context = createTransformContext(ast);
    traverseNode(ast,context);

    //对根节点进行处理1.文本 2.一个元素 使用ElementBlock 3.多个元素 Fragment包裹多个ElementBlock
    createRootCodegenNode(ast, context);

    (ast as any).helpers = [...context.helpers.keys()]
}

export {transform};
