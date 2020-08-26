//
// var promiseMap = {};
//
//
//
//
// // express app handler
// app.post('/webhook', (req, res) => {
//
//     // Get the engagementId from the http post request for agent join http message (will need to filter events)
//     var engagementId = req. ....
//
//     // resolve the promise
//     promiseMap[engagementId](true);
//
// });
//
//
//
// async function createEngagement() {
//     return axios({
//         method: "post",
//         url: "http://localhost:31380/api/digital/v1/engagements",
//         data: { name: "john" }
//     }).then(res => res.data.engagementId);
// }
//
// async function createCustomerChatWorkFlow () {
//     const engagementId = await createEngagement();
//
//     console.log(`engagementId ${engagementId}` ) ;
//     const promise = new Promise(resolve => {promiseMap[engagementId] = resolve});
//
//     console.log(`Wait for promise to be resolved in express message handler above` ) ;
//     var result = await promise;
//
//     console.log(`Agent has now join?  ${result}` ) ;
//
// }