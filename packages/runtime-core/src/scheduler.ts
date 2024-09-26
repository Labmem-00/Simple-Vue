const queue = [] //缓存当前的执行函数队列
let isFlushing = false;
const resolvePromise = Promise.resolve();

//如果同时在组件中更新多个状态，job只记录一个
export function queueJob(job){
    if(!queue.includes(job)){
        queue.push(job);
    }
    if(!isFlushing){
        isFlushing = true;

        resolvePromise.then(()=>{
            isFlushing = false;
            const copy = queue.slice(0);
            queue.length = 0;
            copy.forEach((job)=>job());
            copy.length = 0;
        })
    }
}