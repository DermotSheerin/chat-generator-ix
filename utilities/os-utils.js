const process = require("process");
let maxMem = 0;
let maxUserTime = 0;
let maxSystemTime = 0;

// get current time
const currentTime = () => {
    let currentTime = new Date().toLocaleTimeString();
    return currentTime
}

const usedMem = () => {
    const used = process.memoryUsage().heapUsed / 1024 / 1024;
    return Math.round(used * 100) / 100
}

// User CPU time is the amount of time the processor spends in running your application code. System CPU Time is the
// amount of time the processor spends in running the operating system(i.e., kernel) functions connected to your application
const cpuTime = () => {
    const cpuTime = process.cpuUsage();
    const userTime = Math.round((cpuTime.user / 1000000) * 100) / 100;
    const systemTime = Math.round((cpuTime.system / 1000000) * 100) / 100;
    return { userTime, systemTime }
}

const getMaxValues = (usedMem, userTime, systemTime) => {
    if (usedMem > maxMem) maxMem = usedMem;
    if (userTime > maxUserTime) maxUserTime = userTime;
    if (systemTime > maxSystemTime) maxSystemTime = systemTime;
    return { maxMem, maxUserTime, maxSystemTime };
}

// https://medium.com/the-boujoukos-bulletin/javascript-scope-hoisting-and-arrow-functions-8f80684be458
// const maxValues = (value) => {
//     this.maxValue = 0;
//     if (value > this.maxValue) {
//         this.maxValue = value;
//     }
//     return this.maxValue
// }

module.exports.currentTime = currentTime;
module.exports.usedMem = usedMem;
module.exports.cpuTime = cpuTime;
module.exports.getMaxValues = getMaxValues;