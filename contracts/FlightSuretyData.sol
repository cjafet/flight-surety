pragma solidity ^0.4.25;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address private contractOwner;                                      // Account used to deploy contract
    bool private operational = true;                                   // Blocks all state changes throughout the contract if false
    
    struct Insurance {
        address airline;
        address passenger;
        string flight;
        uint256 amount;
        uint256 payout;
        bool isOpen;        
    }

    struct VoteQueue {
        uint8 vote;
        bool isQueued;
    }

    mapping(address => VoteQueue) private countVote;            // Track the number of votes for an airline
    mapping(address => Insurance) insurance;             // Track all purchased insurances
    mapping(string => address[]) insurees;
    mapping(address => uint256) private payment;                // Add values to be paid
    // address[] memory insurees = new address[]();              // Keep track of the addresses that bought an insurance 
    // mapping (address => uint256) private insurancesIndexes;  // Keep track the index of the address in the insurances array

    

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/


    /**
    * @dev Constructor
    *      The deploying account becomes contractOwner
    */
    constructor
                                (
                                ) 
                                public 
    {
        contractOwner = msg.sender;
    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
    * @dev Modifier that requires the "operational" boolean variable to be "true"
    *      This is used on all state changing functions to pause the contract in 
    *      the event there is an issue that needs to be fixed
    */
    modifier requireIsOperational() 
    {
        require(operational, "Contract is currently not operational");
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireContractOwner()
    {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }


    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
    * @dev Get operating status of contract
    *
    * @return A bool that is the current operating status
    */      
    function isOperational() 
                            public 
                            view 
                            returns(bool) 
    {
        return operational;
    }


    /**
    * @dev Sets contract operations on/off
    *
    * When operational mode is disabled, all write transactions except for this one will fail
    */    
    function setOperatingStatus
                            (
                                bool mode
                            ) 
                            external
                            requireContractOwner 
    {
        operational = mode;
    }

    /**
    * @dev Get passenger insurance
    *
    * @return Insurance struct { address airline; address passenger; string flight; uint256 amount; }
    */      
    function getInsurance
                            (
                                address _passenger
                            ) 
                            external 
                            view 
                            returns
                            (
                                address airline,
                                address passenger,
                                string flight,
                                uint256 amount,
                                uint256 payout,
                                bool open 
                            ) 
    {
        airline = insurance[_passenger].airline;
        passenger = insurance[_passenger].passenger;
        flight = insurance[_passenger].flight;
        amount = insurance[_passenger].amount;
        payout = insurance[_passenger].payout;
        open = insurance[_passenger].isOpen;

        return
        (
            airline,
            passenger,
            flight,
            amount,
            payout,
            open
        );
    }


    /**
    * @dev Get passenger addresses who bought an insurance
    *
    * @return An array of addresses that represent the bought insurances
    */   
    function getInsurees(string flight) public view returns(address[]) {
        return insurees[flight];
    }



    /**
    * @dev Get passenger payout
    *
    * @return A uint256 representing the passenger payout
    */      
    function getPayout(address a) external view returns(uint256) {
        return payment[a];
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

   
    /**
    * @dev Return the number of votes of an airline in the registration queue
    *      Can only be called from FlightSuretyApp contract
    *
    */   
    function getVotes
                            (
                                address airline   
                            )
                            external
                            view
                            returns(uint8)
    {
        return countVote[airline].vote; 
    }

    
    /**
    * @dev Add vote to an airline in the registration queue
    *      Can only be called from FlightSuretyApp contract
    *
    */ 
    function addVotes
                        (
                            address airline,
                            uint8 value   
                        )
                        external
    {
        countVote[airline].vote = countVote[airline].vote + value;
   
    }


    /**
    * @dev Delete an airline from the registration queue
    *      Can only be called from FlightSuretyApp contract
    *
    */ 
    function removeVotes
                            (
                                address airline
                            )
                            external
    {
        delete countVote[airline];     
    }
   
   
   /**
    * @dev Add an airline to the registration queue
    *      Can only be called from FlightSuretyApp contract
    *
    */   
    function registerAirline
                            (
                                address airline   
                            )
                            external
    {
        // require()
        //countVote[airline] = 0;
        countVote[airline] = VoteQueue({
                vote: 0,
                isQueued: true
            });   
    }

    /**
    * @dev Return if airline is in the registration queue
    *      Can only be called from FlightSuretyApp contract
    *
    */   
    function isQueued
                        (
                            address airline   
                        )
                        external
                        view
                        returns(bool)
    {
        return countVote[airline].isQueued; 
    }


   /**
    * @dev Buy insurance for a flight
    *
    */   
    function buy
                    (
                    address airline,
                    address passenger,
                    string flight,
                    uint256 amount,
                    uint256 payout                             
                    )
                    external
                    payable
    {

        insurance[passenger] = Insurance({
            airline: airline,
            passenger: passenger,
            flight: flight,
            amount: amount,
            payout: payout,
            isOpen: false
        });

        //uint256 i = insurees.length;
        //insurancesIndexes[passenger] = i;
        insurees[flight].push(passenger);

    }

    /**
     *  @dev Credits payouts to insurees
    */
    function creditInsurees
                                (
                                    address p,
                                    uint256 a
                                )
                                external
    {
        payment[p] = a;
    }
    

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
    */
    function pay
                            (
                                address account
                            )
                            external
                            returns
                            (
                                uint256
                            )
    {

        //require(msg.sender == tx.origin, "Contracts not allowed");
        //require(payout[msg.sender] > 0, "Insufficient funds");
        
        uint256 amount = payment[account];
        payment[account] = payment[account].sub(amount);

        return amount; 
    }

   /**
    * @dev Initial funding for the insurance. Unless there are too many delayed flights
    *      resulting in insurance payouts, the contract should be self-sustaining
    *
    */   
    function fund
                            (   
                            )
                            public
                            payable
    {
        //require(msg.sender == airlines[msg.sender].airline, "You need to be a registered airline to add funds to this contract");
        //require(msg.value == FUND_FEE, "We need 10 ether here");

        //airlines[msg.sender].haveFund = true;
        //airlines[msg.sender].value = msg.value;

        //emit FundsReceived(msg.sender, msg.value);
    }

    function getFlightKey
                        (
                            address airline,
                            string memory flight,
                            uint256 timestamp
                        )
                        pure
                        internal
                        returns(bytes32) 
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    /**
    * @dev Fallback function for funding smart contract.
    *
    */
    function() 
                            external 
                            payable 
    {
        fund();
    }


}

