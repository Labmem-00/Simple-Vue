//vue模板编译过程 
//1.模板通过词法分析，语法分析转化为ast语法树 
//2.语法树通过语义分析转化生成codegennode => 生成block，动态数据插入key值，生成编译优化的js代码(重用与靶向更新)
//3.最后返回render函数 

import { NodeTypes } from "./Ast";

function createParseContext(content: string){ //创建解析上下文
    return{
        originalSource: content,//原模板内容
        source: content , //当前解析内容，
        line: 1, //当前解析行数
        column: 1, //当前解析列数
        offset: 0, //偏移值，原模板起始位置与当前解析模板字符的距离
    };
}

function parseInterpolation(context){ //处理插值表达式
    const start = getCursor(context);
    const closeIndex = context.source.indexOf("}}", 2);
    advanceBy(context, 2);
    const innerStart = getCursor(context);
    const innerEnd = getCursor(context);
    const preTrimContent = parseTextData(context, closeIndex-2); //插值内容
    const content = preTrimContent.trim(); //除去插值文本前后的空格
    
    const startOffset = preTrimContent.indexOf(content);
    if(startOffset >0){
        advacePositionMutation(innerStart, preTrimContent, startOffset);
    }

    const endOffset = startOffset + content.length;
    advacePositionMutation(innerEnd, preTrimContent, endOffset);
    advanceBy(context, 2);

    return{
        type: NodeTypes.INTERPOLATION,
        content:{
            type: NodeTypes.SIMPLE_EXPRESSION,
            isStatic: false,
            isConstant: false,
            content,
            location: getSelection(context, innerStart, innerEnd),
        },
        location: getSelection(context, start)
    }
}

function parseText(context){
    let tokens = ['<','{{']; //匹配文本值当前最近的词法,去除标签和表达式
    let endIndex = context.source.length;
    for(let i=0 ; i<tokens.length ; i++){
        const index = context.source.indexOf(tokens[i], 1);
        if(index != -1 && endIndex > index){
            endIndex = index; //0 - endIndex 
        }
    }
    let start = getCursor(context);
    let content = parseTextData(context, endIndex);

    return{
        type: NodeTypes.TEXT,
        content,
        locatiob: getSelection(context, start)
    }
}
function parseTextData(context, endIndex){
    const content = context.source.slice(0,endIndex);
    advanceBy(context, endIndex);
    return content;
}

function parseAttributeValue(context) {
    let quote = context.source[0];
  
    const isQuoted = quote === '"' || quote === "'";
  
    let content;
    if (isQuoted) {
      advanceBy(context, 1);
      const endIndex = context.source.indexOf(quote, 1);
      content = parseTextData(context, endIndex); // slice()
      advanceBy(context, 1);
    } else {
      content = context.source.match(/([^ \t\r\n/>])+/)[1]; // 取出内容，删除空格
      advanceBy(context, content.length);
      advanceSpaces(context);
    }
    return content;
  }

function parseAttribute(context){
    let start = getCursor(context);
    let match = /^[^\t\r\n\f />][^\t\r\n\f />=]*/.exec(context.source);
    if(!match){
        return null
    }
    const name = match[0];
    let value;
    advanceBy(context, name.length);
    if (/^[\t\r\n\f ]*=/.test(context.source)) { //删除空格与等号
        advanceSpaces(context);
        advanceBy(context, 1);
        advanceSpaces(context);

        value = parseAttributeValue(context)
    }

    let location = getSelection(context, start);
    return{
        type: NodeTypes.ATTRIBUTE,
        name,
        value:{
            type: NodeTypes.TEXT,
            content: value,
        },
        location
    }
}

function parseAttributes(context){
    const props = [];
    while(context.source.length > 0 && 
            (!context.source.startsWith(">")) 
        ){
        const prop = parseAttribute(context);
        if(prop){
            props.push(prop);
        }else{
            break
        }
        advanceSpaces(context);
    }
    return props;
}

function parseTag(context){
    const start = getCursor(context);
    const match = /^<\/?([a-z][^ \t\r\n/>]*)/.exec(context.source )
    const tag = match[1];

    advanceBy(context, match[0].length) //删除匹配的open标签
    advanceSpaces(context); //删除多余的空格

    let props = parseAttributes(context); //处理标签属性
    
    const isSelfClosing = context.source.startsWith("/>");
    advanceBy(context,isSelfClosing ? 2 : 1) //删除匹配的selfclose标签
   
    return {
        type: NodeTypes.ELEMENT,
        tag,
        isSelfClosing,
        location: getSelection(context, start),
        props
    }
}

function parseElement(context){
    const ele = parseTag(context);
    const children = parseChildren(context);

    if(context.source.startsWith('</')){
        parseTag(context); //直接移除闭合标签
    }

    (ele as any).children = children;
    (ele as any).location = getSelection(context, ele.location.start);

    return ele;
}

function advanceBy(context, endIndex){
    let c = context.source;
    advacePositionMutation(context, c, endIndex)
    context.source = c.slice(endIndex);
}
function advanceSpaces(context){
    const match = /^[ \t\r\n]+/.exec(context.source)
    
    if(match){
        advanceBy(context, match[0].length);
    }
}
function getCursor(context) {
    let { line, column, offset } = context;
    return { line, column, offset };
}
function getSelection(context, start, e?) { //返回当前解析文本在上下文中的位置信息
    let end = e || getCursor(context);
    // eslint 可以根据 start，end找到要报错的位置
    return {
      start,
      end,
      source: context.originalSource.slice(start.offset, end.offset),
    };
}
function advacePositionMutation(context, content, endIndex){ //更新当前解析位置信息
    let linesCount = 0; //用于计数字符串中换行符的数量，初始值为 0
    let linePos = -1;//用于记录最后一个换行符的位置，初始值为 -1（表示尚未找到任何换行符）

    for(let i = 0 ; i < endIndex ; i++){
        if(content.charCodeAt(i) == 10 ){ //10为换行符
            linesCount++; 
            linePos = i; 
        }
    }

    context.offset += endIndex;
    context.line +=linesCount;
    context.column = linePos == -1 ? context.column + endIndex : endIndex - linePos;
}
   
function isEnd(context) {
    const c = context.source;
    if (c.startsWith("</")) {
      // 如果是闭合标签，也要停止循环
      return true;
    }
    return !context.source;
}



function parseChildren(context){
    const nodes = [] as any;
    //有限状态机
    while(!isEnd(context)){
        const c = context.source;
        let node;
        if(c.startsWith("{{")){ //{{}}
            node = parseInterpolation(context)
        }else if(c[0]==='<'){ //<div>
            node = parseElement(context)
        }else { //文本
           node =  parseText(context)
        }
        nodes.push(node);
    }
    //去除空结点
    for (let i = 0; i < nodes.length; i++) {
        let node = nodes[i];
        // 将空节点进行压缩
        if (node.type === NodeTypes.TEXT) {
          // 如果是空白字符 清空
          if (!/[^\t\r\n\f ]/.test(node.content)) {
            nodes[i] = null; // 空白字符清空
          } else {
            node.content = node.content.replace(/[\t\r\n\f ]+/g, " ");
          }
        }
      }
    return nodes.filter(Boolean);
}

function createRoot(children){
    return{
        type: NodeTypes.ROOT,
        children
    }
}

function parse(template){
    //使用template生成树
    const context = createParseContext(template);
    return createRoot(parseChildren(context)) 
}

export {parse}