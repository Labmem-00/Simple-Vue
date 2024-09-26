export function getSequence(arr){
    const result = [0];
    let start,end;
    let middle; //二分查找标签
    const p = result.slice(0); //每个节点得前驱节点列表 
    const len = arr.length;
    for(let i = 0 ; i<len ; i++){
        const arrI = arr[i]; //当前的值
        if(arrI !== 0){ //为0则是新节点，不进行复用
            let resultLastIndex = result[result.length-1];//结果集最后一项索引
            if(arr[resultLastIndex] < arrI){ //如果前一个值小于后一个值，则有连续性潜力，放入索引
                p[i] = result[result.length-1];
                result.push(i);
                continue;
            }
        }
        start = 0;
        end = result.length-1;
        while(start<end){
            middle = (( start + end ) / 2 ) | 0; //向下取整位运算

            if( arr[result[middle]] < arrI){
                 start = middle + 1;
            }else{
                 end = middle;
            }
        }

        if(arrI < arr[result[start]]){
            p[i] =  result[start-1];
            result[start] = i;
        }
    }

    let l = result.length;
    let last = result[l-1];
    while(l-- > 0){
        result[l] = last;
        last = p[last];
    }
    return result;
} 
