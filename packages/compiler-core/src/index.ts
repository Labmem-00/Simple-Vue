import { NodeTypes } from "./Ast";
import {parse} from "./parser"
import { CREATE_ELEMENT_BLOCK, CREATE_ELEMENT_VNODE, helperNameMap, OPEN_BLOCK, TO_DISPLAY_STRING } from "./runtimeHelper";
import { transform } from "./transform";

function createCodegenContext(ast){
    const context = {
        code: '',
        level: 0,//缩进级别
        helper(name){
            return "_" + helperNameMap[name];
        }, 
        push(code){
            context.code += code
        },
        //换行并控制当前代码缩进,
        indent(){
            newLine(++context.level);
        }, 
        deindent(noNewLine=false){
            if(noNewLine){
                --context.level;
            }else{
                newLine(--context.level);
            }
            
        },
        //换行
        newLine(n?){
            if(n){
                while(n-->0){   
                    newLine(context.level);
                }
            }else{
                newLine(context.level);
            }
        }
    }


    function newLine(n){
        context.push("\n" + '   '.repeat(n));
    }

    return context;
}

function genFunctionPreamble(ast,context){
    const {push,indent,deindent,newLine} = context;

    if(ast.helpers.length > 0){
        push(
            `const { ${ast.helpers.map(
                (item)=>`${helperNameMap[item]}: ${context.helper(item)}`)}} = Vue`  
        )
    }

    newLine(2);
    push(`return function render(_ctx){`);


} 

function genText(node, context){
    context.push(` ${JSON.stringify(node.content)}`)
}

function genInterpolation(node, context){
    const {push,indent,deindent,newLine,helper} = context;

    push(`${helper(TO_DISPLAY_STRING)}(`);
    genNode(node.content,context);
    push(`)`)

}

function genExpression (node,context){
    context.push(node.content);
}

function genVnodeCall(node, context){
    const {push,indent,deindent,newLine,helper} = context;
    const {tag,props,children,isBlock} = node;
    if(isBlock){
        push(` (${helper(OPEN_BLOCK)}(), `);
    }

    const h = isBlock ? CREATE_ELEMENT_BLOCK : CREATE_ELEMENT_VNODE;

    push(`${helper(h)}(`);
    

    if(isBlock){
        push(`)`);
    }
    push(`)`)
}

function genNode(node,context){
    const {push,indent,deindent,newLine} = context;
    switch(node.type){
        
        case NodeTypes.TEXT:
            genText(node,context);
            break;
        case NodeTypes.INTERPOLATION:
            genInterpolation(node,context);
            break;
        case NodeTypes.SIMPLE_EXPRESSION:
            genExpression(node,context)
            break; 
        case NodeTypes.VNODE_CALL:
            genVnodeCall(node,context);
            break;
    }

}

//代码生成
function generate(ast){
    const context = createCodegenContext(ast);
    const {push,indent,deindent,newLine} = context;

    //拼接代码字符串
    genFunctionPreamble(ast,context); //导入帮助函数
    indent(); 
    push(`return`);  
    if(ast.codegenNode){
        genNode(ast.codegenNode, context)
    }else{
        push(` null`);
    }

    deindent();
    push(`}`)
    console.log(context.code)

    return context.code;

}

export function compile(template){

    const ast = parse(template) //词法分析器，生成语法树
    console.log(ast);
    transform(ast); //节点转换与优化，添加辅助函数

    return generate(ast);
    debugger

    
}

export {parse,transform};