import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';
import express from 'express';


let config = Config['localhost'];
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
web3.eth.defaultAccount = web3.eth.accounts[0];
let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);

let addresses = [];
web3.eth.getAccounts().then(res => {
  addresses = [...res];
  console.log(addresses);
  

// let addresses = [
//   "0xDF463504055c8cF3708CA4cdbde34F1dAD8a05fA",
//   "0x60c5ad46e5d2aFd2A9cA1E24dB44674B8F99F6F9",
//   "0x86c09e4Da05a1a4c2A0BbEBcf1d7600b620ED975",
//   "0xAf8c8c482c207443121cc9EFe33f2aA51967fFAd",
//   "0x157b11783f6FAbB77578f4A69618e4353A4E9Bb8",
//   "0x5d01b50110873Aa38F64E77A1Ed902F811838157",
//   "0xd12d73A51e4bEB0cdB8E269c0071bc0d0d7c1047",
//   "0x1C14B1B18BA3F2f1bCe99BAa72eef61aC3a416Df",
//   "0x73e11EB9700C5583FDD49833DE439f962Fae3EeD",
//   "0xDc75D27B3Ae7D7504485b7380bDE83c61deDF29e"
// ];

let indexes = [];
let status = [0,10,20,30,40,50];

let i = 0;
let initOracles = (acc) => new Promise((resolve, reject) => {
  const amount = web3.utils.toWei("1.00", "ether");
  console.log(amount);
  flightSuretyApp.methods
    .registerOracle()
    .send({ from: acc, value: amount, gas: 4700000 }, (error, result) => {
        if (error) console.log(error);
        console.log("From register oracle call.");
        flightSuretyApp.methods
          .getMyIndexes()
          .call({ from: acc }, (error, result) => {
            if (error) console.log(error);
            console.log("Address:",acc,"Indexes:",JSON.stringify(result));
            indexes.push([acc, ...result]);
            console.log(indexes);
            resolve();
            if (i < 39) {
              i++;
              initOracles(addresses[i]);
            }
          }); 
    }); 
});
initOracles(addresses[0]);


function callOracle(oracle_addr,index,airline,flight,timestamp) {
  //console.log(flightSuretyApp.methods);
  let random = Math.floor(Math.random() * 6);
  let _status = status[random]; //20
  console.log(oracle_addr,index,airline,flight,timestamp,_status);
  flightSuretyApp.methods
    .submitOracleResponse(index, airline, flight, timestamp, _status)
    .send({ from: oracle_addr, gas: 4700000 }, (error, result) => {
        console.log("Result is:",result);
    });
}


flightSuretyApp.events.OracleRequest({
    fromBlock: 0
  }, function (error, event) {
    if (error) console.log(error)
    let e = event.returnValues;
    console.log(event);
    console.log(e.index,e.airline,e.flight,e.timestamp);
    indexes.forEach(element => {
      console.log(element);
      if(element[1] == e.index || element[2] == e.index || element[3] == e.index) {
        //console.log(element[0],e.index,e.airline,e.flight,e.timestamp);
        callOracle(element[0],e.index,e.airline,e.flight,e.timestamp);
      }
    });
});

flightSuretyApp.events.BoughtInsurance({
    fromBlock: 0
  }, function (error, event) {
    if (error) console.log(error);
    console.log(event);
});

flightSuretyApp.events.FlightStatusInfo({
    fromBlock: 0
  }, function (error, event) {
    if (error) console.log(error);
    console.log("FlightStatusInfo: ",event.returnValues);
});

flightSuretyApp.events.PassengerPaid({
    fromBlock: 0
  }, function (error, event) {
    if (error) console.log(error);
    console.log("PassengerPaid: ",event.returnValues);
});

flightSuretyApp.events.FundsReceived({
    fromBlock: 0
  }, function (error, event) {
    if (error) console.log(error);
    console.log("FundsReceived: ",event.returnValues);
});


}); // end of promise


const app = express();
app.get('/api', (req, res) => {
    res.send({
      message: 'An API for use with your Dapp!'
    })
})

export default app;


