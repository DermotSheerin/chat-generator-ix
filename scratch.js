wait = async (ms) => {
    try {
        return new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    } catch (err) {
        console.log(`Error in function wait: ${err.message}`);
    }
};


async function startTest() {
    let i;
    let j;
    console.log('startTest: ' + new Date().toISOString().substr(11, 8))


    for (i = 0; i < 100;i++) {
        tryThis(i);
        await wait(10);
    }
    console.log('end: ' + new Date().toISOString().substr(11, 8))
}

function tryThis(i) {
    console.log(`here in function and here is i: ${i}`)
    //return true
}

startTest();