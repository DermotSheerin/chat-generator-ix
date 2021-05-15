const promiseTimeout = function(ms, promise){

    // Create a promise that rejects in <ms> milliseconds
    let timeout = new Promise((resolve, reject) => {
        let id = setTimeout(() => {
            clearTimeout(id);
            resolve(false)
            //reject('Agent JOIN Timed out in '+ ms + 'ms !!! ')
        }, ms)
    })

    // Returns a race between our timeout and the passed in promise
    return Promise.race([
        promise,
        timeout
    ]).catch(err => {
        console.error(err)
    })
}

module.exports = promiseTimeout