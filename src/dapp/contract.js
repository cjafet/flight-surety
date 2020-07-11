import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';

export default class Contract {
    constructor(network, callback) {

        let config = Config[network];
        this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
        this.initialize(callback);
        this.owner = null;
        this.airlines = [];
        this.passengers = [];
    }

    initialize(callback) {
        this.web3.eth.getAccounts((error, accts) => {
           
            this.owner = accts[0];

            let counter = 1;
            
            while(this.airlines.length < 5) {
                this.airlines.push(accts[counter++]);
            }

            while(this.passengers.length < 5) {
                this.passengers.push(accts[counter++]);
            }

            callback();
        });
    }

    isOperational(callback) {
       let self = this;
       self.flightSuretyApp.methods
            .isOperational()
            .call({ from: this.owner}, callback);
    }

    fetchFlightStatus(flight, callback) {
        let self = this;
        let payload = {
            airline: this.owner, //self.airlines[0],
            flight: flight,
            timestamp: Math.floor(Date.now() / 1000)
        } 
        self.flightSuretyApp.methods
            .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
            .send({ from: this.owner}, (error, result) => {
                callback(error, payload);
            });
    }

    addFunds(callback) {
       let self = this;
       let payload = {
            airline: this.owner,
            //value: amount
        } 
       self.flightSuretyApp.methods
            .addFunds()
            .send({ from: payload.airline, value: "10000000000000000000", gas: 4700000 }, (error, result) => {
                callback(error, payload);
            });
    }

    buyInsurance(flight, amount, callback) {
       let self = this;
       let payload = {
            airline: this.owner,//self.airlines[0],
            flight: flight,
            value: amount
        } 
       self.flightSuretyApp.methods
            .buyInsurance(payload.airline, payload.flight)
            .send({ from: this.passengers[1], value: amount, gas: 4700000 }, (error, result) => {
                callback(error, payload);
            });
    }

    getInsurance(callback) {
       let self = this;
       let payload = {
            passenger: this.passengers[1],
        } 
       self.flightSuretyApp.methods
            .getInsurance(payload.passenger)
            .call({ from: this.owner }, (error, result) => {
                console.log({
                    airline: result._air, 
                    passenger: result._pas, 
                    flight: result._fli, 
                    amount: result._amo,
                    payout: result._payout 
                });
                callback(error, result);
            });
    }

    payPassenger(callback) {
       let self = this; 
       self.flightSuretyApp.methods
        .getInsurance(this.passengers[1])
        .call({ from: this.owner }, (error, result) => {
        
            let air = result._air; 
            let p1 = result._pas;
            let amount = result._payout; 
            
       self.flightSuretyApp.methods
            .payPassenger(p1)
            .send({ from: air, value: amount, gas: 4700000 }, (error, result) => {
                callback(error, result);
            });
        
        });
    }
}