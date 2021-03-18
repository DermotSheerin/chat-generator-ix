const process = require("process");

const usedMem = () => {
    const used = process.memoryUsage().heapUsed / 1024 / 1024;
    return Math.round(used * 100) / 100
}

// User CPU time is the amount of time the processor spends in running your application code. System CPU Time is the
// amount of time the processor spends in running the operating system(i.e., kernel) functions connected to your application
const cpuTime = () => {
    const cpuTime = process.cpuUsage();
    const userTime = cpuTime.user / 1000000;
    const systemTime = cpuTime.system / 1000000;
    return { userTime, systemTime }
}

module.exports.usedMem = usedMem;
module.exports.cpuTime = cpuTime;