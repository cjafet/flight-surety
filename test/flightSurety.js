
var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');

contract('Flight Surety Tests', async (accounts) => {

  var config;
  before('setup contract', async () => {
    config = await Test.Config(accounts);
    //await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address);
  });

  fromWei = amount => {
    return web3.utils.fromWei(amount, "ether")
  }

  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/

  it(`(multiparty) has correct initial isOperational() value`, async function () {

    // Get operating status
    let status = await config.flightSuretyData.isOperational.call();
    assert.equal(status, true, "Incorrect initial operating status value");

  });

  it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {

      // Ensure that access is denied for non-Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false, { from: config.testAddresses[2] });
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, true, "Access not restricted to Contract Owner");
            
  });

  it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {

      // Ensure that access is allowed for Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false);
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, false, "Access not restricted to Contract Owner");
      
  });

  it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {

      await config.flightSuretyData.setOperatingStatus(false);

      let reverted = false;
      try 
      {
          await config.flightSurety.setTestingMode(true);
      }
      catch(e) {
          reverted = true;
      }
      assert.equal(reverted, true, "Access not blocked for requireIsOperational");      

      // Set it back for other tests to work
      await config.flightSuretyData.setOperatingStatus(true);

  });

//   it('(airline) cannot register an Airline using registerAirline() if it is not funded', async () => {
    
//     // ARRANGE
//     let newAirline = accounts[2];

//     // ACT
//     try {
//         await config.flightSuretyApp.registerAirline(newAirline, {from: config.firstAirline});
//     }
//     catch(e) {

//     }
//     let result = await config.flightSuretyData.isAirline.call(newAirline); 

//     // ASSERT
//     //assert.equal(result, false, "Airline should not be able to register another airline if it hasn't provided funding");

//   });

    it(`can add vote to an airline in the register queue`, async function () {

      let votes;
      let addVotes;
      let airline = accounts[2]; 

      try 
      {
          let owner = await config.flightSuretyApp.getOwner();
          console.log("Owner is:", owner);

          // Add airline to the register queue
          await config.flightSuretyApp.registerAirline(airline, {from: accounts[0]});
          
          // Get airline vote number
          votes = await config.flightSuretyData.getVotes(airline);

          // Add votes to the airline
          await config.flightSuretyData.addVotes(airline,1);
          addVotes = await config.flightSuretyData.getVotes(airline);
          
          // Remove airline from queue
          await config.flightSuretyData.removeVotes(airline);

      }
      catch(e) {
        console.log("ERROR: ",e.message);
      }
      assert.equal(votes.toNumber(), 0, "Votes should be equal to zero at this point");
      assert.equal(addVotes.toNumber(), 1, "Airline should have one vote");    
  });

    it(`only registered airlines with funds can add another airline to the register queue`, async function () {

      let votes;
      let airline = accounts[4]; 

      try 
      {
        await config.flightSuretyApp.registerAirline(airline, {from: accounts[3]});
        votes = await config.flightSuretyData.getVotes(airline);

      }
      catch(e) 
      {
        console.log("ERROR:",e.message);
      }
      assert.equal(votes, undefined, "Votes should be undefined");
  });

    it(`can add up to 4 airlines without voting`, async function () {

      let votes2, votes3, votes4, votes5;
      let countAirlines;

      try 
      {
        votes2 = await config.flightSuretyData.getVotes(accounts[2]);
        votes3 = await config.flightSuretyData.getVotes(accounts[3]);
        votes4 = await config.flightSuretyData.getVotes(accounts[4]);
        
        // Add 2nd, 3rd and 4th airline
        await config.flightSuretyApp.registerAirline(accounts[2], {from: accounts[0]});
        await config.flightSuretyApp.setAirlineStatus(accounts[2], {from: accounts[0]});

        await config.flightSuretyApp.registerAirline(accounts[3], {from: accounts[0]});
        await config.flightSuretyApp.setAirlineStatus(accounts[3], {from: accounts[0]});

        await config.flightSuretyApp.registerAirline(accounts[4], {from: accounts[0]});
        await config.flightSuretyApp.setAirlineStatus(accounts[4], {from: accounts[0]});
        
        // Add 5th airline
        await config.flightSuretyApp.registerAirline(accounts[5], {from: accounts[0]});
        await config.flightSuretyApp.setAirlineStatus(accounts[5], {from: accounts[0]});

        // Get the number of airlines added to the contract
        countAirlines = await config.flightSuretyApp.getNumberOfAirlines();

        // Get number of votes of the 5th airline. Should be one.
        votes5 = await config.flightSuretyData.getVotes(accounts[5]);
        
        console.log("Number of airlines: ", countAirlines.toNumber());
        console.log("Votes2: ", votes2.toNumber());
        console.log("Votes3: ", votes3.toNumber());
        console.log("Votes4: ", votes4.toNumber());
        console.log("Votes5: ", votes5.toNumber());

      }
      catch(e) {
        console.log("ERROR:",e.message);
      }
      assert.equal(countAirlines, 4, "Should have 4 airlines registered in the contract");
      assert.equal(votes5, 1, "Airline 5 should have 1 vote and not 2");
  });


    it(`same airline should not vote twice in the same airline`, async function () {

      let votes5, countAirlines;
      let airline = accounts[5];

      try 
      {

        // Try to vote again in the 5th airline
        await config.flightSuretyApp.setAirlineStatus(airline, {from: accounts[0]});

      }
      catch(e) 
      {
        console.log("ERROR:",e.message);
      }

      try 
      {
        // Get number of votes of the 5th airline. Should be one.
        votes5 = await config.flightSuretyData.getVotes(airline);
        console.log("Votes5: ", votes5.toNumber());

        // Get the number of airlines added to the contract
        countAirlines = await config.flightSuretyApp.getNumberOfAirlines();
        console.log("Number of airlines:", countAirlines.toNumber());

      }
      catch(e) 
      {
        console.log("ERROR:",e.message);
      }
      
      assert.equal(countAirlines, 4, "Should still have 4 airlines registered in the contract");
      assert.equal(votes5, 1, "Airline 5 should still have 1 vote and not 2");

  });

  it(`5th airline should be added after 2nd vote`, async function () {

      let votes5, countAirlines;

      try 
      {

        // Vote to add 5th airline
        await config.flightSuretyApp.setAirlineStatus(accounts[5], {from: accounts[2]});

        // Get the number of airlines added to the contract
        countAirlines = await config.flightSuretyApp.getNumberOfAirlines();
        console.log("Number of airlines:", countAirlines.toNumber());

      }
      catch(e) 
      {
        console.log("ERROR:",e.message);
      }
      
      assert.equal(countAirlines, 5, "Should have 5 airlines registered in the contract");

  });

      it(`should add funds to airline`, async function () {

      let result, eth;
      let airline = accounts[5];

      try 
      {

        // Add funds to airline
        await config.flightSuretyApp.addFunds({from: airline, value: "10000000000000000000" });
        
        // Get airline info
        result = await config.flightSuretyApp.getAirlineInfo(airline);

        // Convert to ether
        eth = web3.utils.fromWei(result.value, "ether");
        console.log("Fund value is:", eth);


      }
      catch(e) 
      {
        console.log("ERROR:",e.message);
      }
      
      assert.equal(result.haveFund, true, "haveFund should be true");
      assert.equal(eth, 10, "Airline should have 10 ether after adding funds");

  });


    it(`should fail add funds to airline when value is not 10 ether`, async function () {

      let result, eth;
      let airline = accounts[4];

      try 
      {
        // Add funds to airline
        console.log("----------------------------------------------------------------------------")
        console.log("Should fail adding funds of 1 ether only.");
        console.log("----------------------------------------------------------------------------")
        await config.flightSuretyApp.addFunds({from: airline, value: "1000000000000000000"});
      }
      catch(e) 
      {
        console.log("ERROR:",e.message);
      }

      try {          
      // Get airline info
      result = await config.flightSuretyApp.getAirlineInfo(airline);

      // Convert to ether
      eth = web3.utils.fromWei(result.value, "ether");
      console.log("----------------------------------------------------------------------------")
      console.log("Fund value should still be zero");
      console.log("Fund value is:", eth);
      console.log("----------------------------------------------------------------------------")
      } catch (e) {
        console.log("ERROR:",e.message);  
      }
      
      assert.equal(result.haveFund, false, "haveFund should be false");
      assert.equal(eth, 0, "Airline fund should still be 0");

  });


    it(`passenger should be able to buy insurance`, async function () {

      let result; 
      let eth;

      let airline = accounts[0];
      let passenger = accounts[7];
      let flight = "1010";
      let amount = "1";

      try 
      {
        await config.flightSuretyApp.addFunds({from: airline, value: "10000000000000000000"});

        // Buy flight insurance
        await config.flightSuretyApp.buyInsurance(airline, flight, {from: passenger, value: "1000000000000000000" });
        
      }
      catch(e) 
      {
        console.log("ERROR:",e.message);
      }

      try 
      {          
      // Get airline info
      
      console.log("----------------------------------------------------------------------------")
      console.log("passenger should be able to buy insurance");
      console.log("----------------------------------------------------------------------------")
      result = await config.flightSuretyData.getInsurance(passenger);
      let a = web3.utils.fromWei(result.amount, "ether");
      let p = web3.utils.fromWei(result.payout, "ether");
      console.log("Insurance Information")
      console.log(result.airline, result.passenger, result.flight, a, p, result.open);
      
      // Convert to ether
      eth = web3.utils.fromWei(result.amount, "ether");
      console.log("Amount value for insurance is:", eth);
      
      console.log("----------------------------------------------------------------------------")
        
      
      } catch (e) {
        console.log("ERROR:",e.message);  
      }
      
      assert.equal(result.airline, airline, "Airline should match");
      assert.equal(result.passenger, passenger, "Passenger should match");
      assert.equal(result.flight, flight, "Flight should match");
      assert.equal(eth, amount, "Amount should match");
      
  });

  it(`should credit passenger with 1.5X the amount paid for the insurance`, async function () {

      let result; 

      let airline = accounts[0];
      let flight = "1010";
      let flight2 = "2020";
      let timestamp = "1593986448";
      let statusCode = 20;
      let p1 = accounts[8];
      let p2 = accounts[9];
      let amount1 = "1.0";
      let amount2 = "0.5";
      let payout, payout2;
      let insurance, insurance2;

      try 
      {

        console.log("----------------------------------------------------------------------------")
        console.log("should credit passenger with 1.5X the amount paid for the insurance");
        console.log("----------------------------------------------------------------------------")

        console.log("Passanger 1 balance is:", fromWei(await web3.eth.getBalance(p1)));
        console.log("Initial Passanger 1 balance is:", fromWei(await web3.eth.getBalance(p1)));
        
        // Buy insurance with different values

        await config.flightSuretyApp.buyInsurance(airline, flight, {from: p1, value: "1000000000000000000" });
        await config.flightSuretyApp.buyInsurance(airline, flight2, {from: p2, value: "500000000000000000" });

        console.log("Passanger 1 balance is:", fromWei(await web3.eth.getBalance(p1)));
        console.log("----------------------------------------------------------------------------")

        // Check if passengers are in the insurances array
        let insurances = await config.flightSuretyData.getInsurees(flight);
        console.log("Flight " + flight + " Insurances:", insurances);

        let insurances2 = await config.flightSuretyData.getInsurees(flight2);
        console.log("Flight " + flight2 + "Insurances:", insurances2);
        console.log("----------------------------------------------------------------------------")
        
        // Process Flight Status
        await config.flightSuretyApp.processFlightStatus(airline, flight, timestamp, statusCode);

        insurance = await config.flightSuretyData.getInsurance(p1);
        console.log("Insurance passenger_1:", insurance.airline, insurance.passenger, insurance.flight, insurance.amount.toString(), insurance.payout.toString(), insurance.open);
        
        insurance2 = await config.flightSuretyData.getInsurance(p2);
        console.log("Insurance passenger_2:", insurance2.airline, insurance2.passenger, insurance2.flight, insurance2.amount.toString(), insurance2.payout.toString(), insurance2.open);
        console.log("----------------------------------------------------------------------------")

        // Get passenger1 payout
        payout = await config.flightSuretyApp.getPayment(p1);
        console.log("Payout values:", payout.toString());

        // Get passenger2 payout
        payout2 = await config.flightSuretyApp.getPayment(p2);
        console.log("Payout2 values:", payout2.toString());
        console.log("----------------------------------------------------------------------------")

      }
      catch(e) 
      {
        console.log("ERROR:",e.message);
      }
      
      assert.equal(payout.toString(), "1500000000000000000", "Airline late. Passenger should receive 1.5x the insure amount");
      assert.equal(payout2.toString(), "0", "Airline not late");
      

  });


    it(`Passenger should receive the insurance value`, async function () {

      let p1 = accounts[8];
      let p2 = accounts[9];
      let balance;

      try 
      {
        
        let passenger_insurance = await config.flightSuretyData.getInsurance(p1);
        
        let tx = await config.flightSuretyApp.addFunds({from: passenger_insurance.airline, value: "10000000000000000000" });
        const CONTRACT_ADDRESS = tx.receipt.to;

        console.log("Contract balance is:", fromWei(await web3.eth.getBalance(CONTRACT_ADDRESS)));
        console.log("Airline balance is:", fromWei(await web3.eth.getBalance(passenger_insurance.airline)));
        console.log("----------------------------------------------------------------------------")

        let amount1 = await config.flightSuretyApp.getPayment(p1);
        console.log("Passenger_1 payout", amount1.toString());

        let amount2 = await config.flightSuretyApp.getPayment(p2);
        console.log("Passenger_2 payout", amount2.toString()); 
        console.log("----------------------------------------------------------------------------")

        await config.flightSuretyApp.payPassenger(p1, {from: passenger_insurance.airline, value: amount1 }); // web3.utils.toWei("1", "ether")
        console.log("Passanger_1 balance is:", fromWei(await web3.eth.getBalance(p1)));

        balance = await config.flightSuretyApp.getPayment(p1);
        console.log("Passenger_1 payout balance after payment", balance.toString()); 
        console.log("----------------------------------------------------------------------------")

        console.log("Airline balance is:", fromWei(await web3.eth.getBalance(passenger_insurance.airline)));

        console.log("----------------------------------------------------------------------------")
        console.log("Simulating Re-Entrancy Attack");
        console.log("Trying to send new transaction to the passenger account")
        console.log("Should return Insufficient funds!")
        console.log("----------------------------------------------------------------------------")

        // TRANSACTION SHOULD FAIL AFTER PASSENGER PAYMENT, REVERTING WITH INSUFFICIENT FUNDS
        await config.flightSuretyApp.payPassenger(p1, {from: passenger_insurance.airline, value: web3.utils.toWei("1", "ether")});


      }
      catch(e) 
      {
        console.log("ERROR:",e.message);
      }
      
      assert.equal(balance, 0, "Passanger balance should be 0 after payment");

      

  });


});
