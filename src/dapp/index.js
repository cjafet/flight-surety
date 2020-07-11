
import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';


(async() => {

    let result = null;

    let contract = new Contract('localhost', () => {

        // Read airlines
        // contract.getAirlines((error, result) => {
        //     console.log(error,result);
        //     display('Operational Status', 'Check if contract is operational', [ { label: 'Operational Status', error: error, value: result} ]);
        // });

        // Read transaction
        contract.isOperational((error, result) => {
            console.log(error,result);
            display('Operational Status', 'Check if contract is operational', [ { label: 'Operational Status', error: error, value: result} ]);
        });

        // Call buy insurance function in the App contract
        DOM.elid('buy-insurance').addEventListener('click', () => {
            let flight = DOM.elid('insurance-flight').value;
            let value = DOM.elid('insurance-value').value;
            console.log(flight,value);
            
            // Convert value to wei
            const amount = web3.toWei(parseFloat(value), "ether");
            console.log(amount);

            // Write transaction
            contract.buyInsurance(flight, amount, (error, result) => {
                console.log(error);
                display('Oracles', 'Trigger oracles', [ { label: 'Insurance Information', error: error, value: result.airline + ' ' + result.flight + ' ' + result.value } ]);
            });
        })


        // Get insurance function in the App contract
        DOM.elid('get-insurance').addEventListener('click', () => {

            // Write transaction
            contract.getInsurance((error, result) => {
                console.log(error);
                display('Oracles', 'Trigger oracles', [ { label: 'Passenger Insurance', error: error, value: result._air + ' ' + result._pas + ' ' + result._fli + ' ' + result._amo + ' ' + result._payout } ]);
            });
        })
    

        // User-submitted transaction
        DOM.elid('submit-oracle').addEventListener('click', () => {
            let flight = DOM.elid('flight-number').value;
            // Write transaction
            contract.fetchFlightStatus(flight, (error, result) => {
                display('Oracles', 'Trigger oracles', [ { label: 'Fetch Flight Status', error: error, value: result.flight + ' ' + result.timestamp} ]);
            });
        })

        // Call contract function to pay for the passenger insurance
        DOM.elid('pay-passenger').addEventListener('click', () => {
            // Write transaction
            contract.payPassenger((error, result) => {
                display('Oracles', 'Trigger oracles', [ { label: 'Pay Passenger', error: error, value: JSON.stringify(result)} ]);
            });
        })

        // Call contract function to add airline funds
        DOM.elid('add-funds').addEventListener('click', () => {
            // Write transaction
            contract.addFunds((error, result) => {
                display('Oracles', 'Trigger oracles', [ { label: 'Add Funds', error: error, value: JSON.stringify(result)} ]);
            });
        })
    
    });
    

})();


function display(title, description, results) {
    let displayDiv = DOM.elid("display-wrapper");
    let section = DOM.section();
    section.appendChild(DOM.h2(title));
    section.appendChild(DOM.h5(description));
    results.map((result) => {
        let row = section.appendChild(DOM.div({className:'row'}));
        row.appendChild(DOM.div({className: 'col-sm-4 field'}, result.label));
        row.appendChild(DOM.div({className: 'col-sm-8 field-value break-word'}, result.error ? String(result.error) : String(result.value)));
        section.appendChild(row);
    })
    displayDiv.prepend(section);

}







