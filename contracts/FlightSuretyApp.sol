pragma solidity ^0.4.25;

// It's important to avoid vulnerabilities due to numeric overflow bugs
// OpenZeppelin's SafeMath library, when used correctly, protects agains such bugs
// More info: https://www.nccgroup.trust/us/about-us/newsroom-and-events/blog/2018/november/smart-contract-insecurity-bad-arithmetic/

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

/************************************************** */
/* FlightSurety Smart Contract                      */
/************************************************** */
contract FlightSuretyApp {
    using SafeMath for uint256; // Allow SafeMath functions to be called for all uint256 types (similar to "prototype" in Javascript)

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    // Flight status codees
    uint8 private constant STATUS_CODE_UNKNOWN = 0;
    uint8 private constant STATUS_CODE_ON_TIME = 10;
    uint8 private constant STATUS_CODE_LATE_AIRLINE = 20;
    uint8 private constant STATUS_CODE_LATE_WEATHER = 30;
    uint8 private constant STATUS_CODE_LATE_TECHNICAL = 40;
    uint8 private constant STATUS_CODE_LATE_OTHER = 50;

    address private contractOwner;           // Account used to deploy contract
    bool private operational = true;        // Blocks all state changes throughout the contract if false

    struct Flight {
        bool isRegistered;
        uint8 statusCode;
        uint256 updatedTimestamp;        
        address airline;
    }
    mapping(bytes32 => Flight) private flights;

    
    address[] multiCalls = new address[](0); // keep track of the number of addresses authorizing a new airline

    struct Airlines {
        address airline;
        bool haveFund;
        bool isActive;
        uint256 value;
    }
    mapping(address => Airlines) airlines;
    //Airlines[] airlines;

    // Track the number of registered airlines
    // We should start with one airline
    uint countAirlines = 1; 

    uint256 public constant FUND_FEE = 10 ether;                  // Fee to be paid when registering an airline
    uint256 public constant INSURANCE_FEE = 1 ether;             // Fee to be paid when registering oracle

    FlightSuretyData flightSuretyData;
    

 
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
         // Modify to call data contract's status
        require(isOperational(), "Contract is currently not operational");  
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

    event FundsReceived(address airline, uint256 amount);
    event BoughtInsurance(address airline, address passenger, string flight, uint256 insurance, uint256 payout);
    event PassengerPaid(address passenger, uint256 payout);

    /********************************************************************************************/
    /*                                       CONSTRUCTOR                                        */
    /********************************************************************************************/

    /**
    * @dev Contract constructor
    *
    */
    constructor
                (
                    address dataContract
                ) 
                public
                payable 
    {
        contractOwner = msg.sender;
        flightSuretyData = FlightSuretyData(dataContract);
        // register first airline
        airlines[msg.sender] = Airlines({
                airline: msg.sender,
                haveFund: false,
                isActive: true,
                value: 0
        }); 
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    function isOperational() 
                            public
                            view 
                            returns(bool) 
    {
        return operational;  // Modify to call data contract's status
    }

    function getOwner() 
                            public
                            view 
                            returns(address) 
    {
        return contractOwner;  // Modify to call data contract's status
    }


    function getNumberOfAirlines() 
                                    public
                                    view 
                                    returns(uint) 
    {
        return countAirlines;
    }

    function getAirlineInfo
                            (
                                address _airline
                            ) 
                                public
                                view 
                                returns
                                (        
                                    address airline,
                                    bool haveFund,
                                    bool isActive,
                                    uint256 value
                                ) 
    {
        airline = airlines[_airline].airline;
        haveFund = airlines[_airline].haveFund;
        isActive = airlines[_airline].isActive;
        value = airlines[_airline].value;
        return
        (
        airline,
        haveFund,
        isActive,
        value
        );

    }

    
    function getInsurance
                            (
                                address _passenger
                            ) 
                            public 
                            view 
                            returns
                            (
                                address _air,
                                address _pas,
                                string _fli,
                                uint256 _amo,
                                uint256 _payout,
                                bool _open 
                            ) 
    {

        return flightSuretyData.getInsurance(_passenger);

    }

        function getPayment
                            (
                                address p
                            ) 
                            public 
                            view 
                            returns
                            (
                                uint256 
                            ) 
    {

        return flightSuretyData.getPayout(p);

    }


    // function getAirlines() public view returns (airlines) {
    //     return airlines;
    // }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

  
   /**
    * @dev Add an airline to the registration queue
    *
    */   
    function registerAirline
                            (
                                address airline   
                            )
                            public
                            returns(bool success, uint256 votes)
    {
        require(airlines[msg.sender].isActive, "Caller is not active yet");

        flightSuretyData.registerAirline(airline);
        success = true;

        return (success, 0);
    }

    function setAirlineStatus 
                                (
                                    address airline
                                )
                                public
    {
        require(flightSuretyData.isQueued(airline) == true, "Airline not added to the queue yet");
        require(airlines[airline].airline == address(0), "Airline already exist");
        require(airlines[msg.sender].isActive, "Caller is not active yet");
        

        if(countAirlines < 4) {
            airlines[airline] = Airlines({
                airline: airline,
                haveFund: false,
                isActive: true,
                value: 0
            }); 
            countAirlines += 1;    
        } else {
            bool isDuplicate = false;
            for(uint c=0; c<multiCalls.length; c++) {
                if (multiCalls[c] == msg.sender) {
                    isDuplicate = true;
                    break;
                }
            }
            require(!isDuplicate, "Caller has already called this function.");
            
            multiCalls.push(msg.sender);
            flightSuretyData.addVotes(airline,1);

            uint M = (countAirlines*10)/2;
            uint vote = flightSuretyData.getVotes(airline)*10;
            //uint vote = multiCalls.length*10;

            if (vote >= M) {
                airlines[airline] = Airlines({
                    airline: airline,
                    haveFund: false,
                    isActive: true,
                    value: 0
                }); 
                countAirlines += 1;     
                multiCalls = new address[](0); // Reset multiCalls array 
                flightSuretyData.removeVotes(airline);     
            }
        }

    }

    function addFunds 
                        (
                        )
                        public
                        payable
    {
        require(msg.sender == airlines[msg.sender].airline, "You need to be a registered airline to add funds to this contract");
        require(msg.value == FUND_FEE, "We need 10 ether here");

        airlines[msg.sender].haveFund = true;
        airlines[msg.sender].value = msg.value;

        emit FundsReceived(msg.sender, msg.value);

    }

    function buyInsurance
                            (
                                address airline, 
                                string flight
                            )
                            public
                            payable
    {
        require(msg.value <= INSURANCE_FEE, "Maximum insurance allowed is 1 ether");
        require(airlines[airline].haveFund == true, "Airline not yet available to sell insurance");

        address passenger = msg.sender;
        uint256 amount = msg.value;
        uint256 payout = amount.mul(150).div(100);
        
        flightSuretyData.buy(airline, passenger, flight, amount, payout);

        emit BoughtInsurance(airline, passenger, flight, amount, payout);   
    }
    

   /**
    * @dev Register a future flight for insuring.
    *
    */  
    function registerFlight
                                (
                                )
                                external
                                pure
    {
    
    }


    function payPassenger(address acc) public payable
    {

        require(msg.sender == tx.origin, "Contracts not allowed");
        
        uint256 amount = flightSuretyData.pay(acc);

        require(amount > 0, "Insufficient funds");

        acc.transfer(amount); 

        emit PassengerPaid(acc, amount);

    }

    
   /**
    * @dev Called after oracle has updated flight status
    *
    */  
    function processFlightStatus
                                (
                                    address airline,
                                    string flight,
                                    uint256 timestamp,
                                    uint8 statusCode
                                )
                                public
    {
        if (statusCode==STATUS_CODE_LATE_AIRLINE) {
            address[] memory insurances = flightSuretyData.getInsurees(flight);
            for(uint c=0; c<insurances.length; c++) {
                (address _air, address pas, string memory _fli, uint256 _amo, uint256 payout, bool _open) = getInsurance(insurances[c]); 
                flightSuretyData.creditInsurees(pas,payout);
            }
        }
    }


    // Generate a request for oracles to fetch flight information
    function fetchFlightStatus
                        (
                            address airline,
                            string flight,
                            uint256 timestamp                            
                        )
                        external
    {
        uint8 index = getRandomIndex(msg.sender);

        // Generate a unique key for storing the request
        bytes32 key = keccak256(abi.encodePacked(index, airline, flight, timestamp));
        oracleResponses[key] = ResponseInfo({
                                                requester: msg.sender,
                                                isOpen: true
                                            });

        emit OracleRequest(index, airline, flight, timestamp);
    } 


// region ORACLE MANAGEMENT

    // Incremented to add pseudo-randomness at various points
    uint8 private nonce = 0;    

    // Fee to be paid when registering oracle
    uint256 public constant REGISTRATION_FEE = 1 ether;

    // Number of oracles that must respond for valid status
    uint256 private constant MIN_RESPONSES = 3;


    struct Oracle {
        bool isRegistered;
        uint8[3] indexes;        
    }

    // Track all registered oracles
    mapping(address => Oracle) private oracles;

    // Model for responses from oracles
    struct ResponseInfo {
        address requester;                              // Account that requested status
        bool isOpen;                                    // If open, oracle responses are accepted
        mapping(uint8 => address[]) responses;          // Mapping key is the status code reported
                                                        // This lets us group responses and identify
                                                        // the response that majority of the oracles
    }

    // Track all oracle responses
    // Key = hash(index, flight, timestamp)
    mapping(bytes32 => ResponseInfo) private oracleResponses;

    // Event fired each time an oracle submits a response
    event FlightStatusInfo(address airline, string flight, uint256 timestamp, uint8 status);

    event OracleReport(address airline, string flight, uint256 timestamp, uint8 status);

    // Event fired when flight status request is submitted
    // Oracles track this and if they have a matching index
    // they fetch data and submit a response
    event OracleRequest(uint8 index, address airline, string flight, uint256 timestamp);


    // Register an oracle with the contract
    function registerOracle
                            (
                            )
                            external
                            payable
    {
        // Require registration fee
        require(msg.value >= REGISTRATION_FEE, "Registration fee is required");

        uint8[3] memory indexes = generateIndexes(msg.sender);

        oracles[msg.sender] = Oracle({
                                        isRegistered: true,
                                        indexes: indexes
                                    });
    }

    function getMyIndexes
                            (
                            )
                            view
                            external
                            returns(uint8[3])
    {
        require(oracles[msg.sender].isRegistered, "Not registered as an oracle");

        return oracles[msg.sender].indexes;
    }




    // Called by oracle when a response is available to an outstanding request
    // For the response to be accepted, there must be a pending request that is open
    // and matches one of the three Indexes randomly assigned to the oracle at the
    // time of registration (i.e. uninvited oracles are not welcome)
    function submitOracleResponse
                        (
                            uint8 index,
                            address airline,
                            string flight,
                            uint256 timestamp,
                            uint8 statusCode
                        )
                        external
    {
        require((oracles[msg.sender].indexes[0] == index) || (oracles[msg.sender].indexes[1] == index) || (oracles[msg.sender].indexes[2] == index), "Index does not match oracle request");

        bytes32 key = keccak256(abi.encodePacked(index, airline, flight, timestamp)); 
        require(oracleResponses[key].isOpen, "Flight or timestamp do not match oracle request");

        oracleResponses[key].responses[statusCode].push(msg.sender);

        // Information isn't considered verified until at least MIN_RESPONSES
        // oracles respond with the *** same *** information
        emit OracleReport(airline, flight, timestamp, statusCode);
        if (oracleResponses[key].responses[statusCode].length >= MIN_RESPONSES) {

            emit FlightStatusInfo(airline, flight, timestamp, statusCode);

            // Handle flight status as appropriate
            processFlightStatus(airline, flight, timestamp, statusCode);
        }
    }


    function getFlightKey
                        (
                            address airline,
                            string flight,
                            uint256 timestamp
                        )
                        pure
                        internal
                        returns(bytes32) 
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    // Returns array of three non-duplicating integers from 0-9
    function generateIndexes
                            (                       
                                address account         
                            )
                            internal
                            returns(uint8[3])
    {
        uint8[3] memory indexes;
        indexes[0] = getRandomIndex(account);
        
        indexes[1] = indexes[0];
        while(indexes[1] == indexes[0]) {
            indexes[1] = getRandomIndex(account);
        }

        indexes[2] = indexes[1];
        while((indexes[2] == indexes[0]) || (indexes[2] == indexes[1])) {
            indexes[2] = getRandomIndex(account);
        }

        return indexes;
    }

    // Returns array of three non-duplicating integers from 0-9
    function getRandomIndex
                            (
                                address account
                            )
                            internal
                            returns (uint8)
    {
        uint8 maxValue = 10;

        // Pseudo random number...the incrementing nonce adds variation
        uint8 random = uint8(uint256(keccak256(abi.encodePacked(blockhash(block.number - nonce++), account))) % maxValue);

        if (nonce > 250) {
            nonce = 0;  // Can only fetch blockhashes for last 256 blocks so we adapt
        }

        return random;
    }

// endregion

}   


contract FlightSuretyData {
    function registerAirline(address airline) external;
    function getVotes(address airline) external returns(uint8);
    function addVotes(address airline, uint8 value) external;
    function removeVotes(address airline) external;
    function isQueued(address airline) external view returns(bool);
    function buy(address airline, address passenger, string flight, uint256 amount, uint256 payout) external;
    function getInsurance(address _passenger) external view returns(address airline, address passenger, string flight, uint256 amount, uint256 payout, bool open); 
    function getInsurees(string flight) public view returns(address[]);
    function creditInsurees(address p, uint256 a) external view;
    function getPayout(address a) external view returns(uint256);
    function pay(address acount) external returns(uint256);
}
