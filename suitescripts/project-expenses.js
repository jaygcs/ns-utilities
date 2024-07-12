/**
 * @NModuleScope public
 * @NApiVersion 2.x
 */
define([ 'N/query', 'SuiteScripts/GCS/purchase-orders' ], function(query, purchase_orders) {

    return {

        get: function(project_id) {

            var unique_costs = {};
            var po_data = purchase_orders.get(project_id);            
            var purchase_order_lines = po_data.lines;
            purchase_order_lines.forEach(function(l) {

                try {
                
                    if(l.item_name.match(/^Note/)) { return; }
                    if(l.item_name.match(/Processing Charges/)) { return; }
                    if(l.item_name.match(/Pull Test/)) { return; }
                    if(l.rate == 0) { return; }

                    if(l.accountinglinetype != 'ASSET') {

                        if(!unique_costs[l.item_name]) {
                            unique_costs[l.item_name] = {
                                total: 0,
                                class_name: l.class_name,
                                lines: []
                            };
                        }

                        unique_costs[l.item_name].total += Number(l.quantity * l.rate);
                        unique_costs[l.item_name].lines.push({
                            po_number: l.name,
                            po_id: l.id,
                            date: l.transaction_date,
                            vendor: l.vendor_name,
                            item: l.item_name,
                            quantity: l.quantity,
                            rate: l.rate
                        });
                    }
                }
                catch(e) {}
            }); 
            
            sql = 'SELECT transaction.id, transaction.trandate AS transaction_date, transaction.tranid AS name, vendor.entityid AS vendor_name, ' +
            'BUILTIN.DF(transaction.custbody_nsps_commodity_manager) AS cm_user, ' +
            'BUILTIN.DF(transactionLine.item) AS item_name, BUILTIN.DF(item.class) AS class_name, transactionline.item AS part_id, ' + 
            'transactionline.quantityshiprecv AS received, transactionline.quantity AS quantity, transactionline.* ' +
            'FROM transaction LEFT OUTER JOIN vendor ON transaction.entity = vendor.id ' +
            'LEFT OUTER JOIN transactionline ON transaction.id = transactionline.transaction ' +
            'LEFT OUTER JOIN item ON transactionLine.item = item.id ' +
            'WHERE transaction.type = ? AND transactionline.entity = ? AND transactionline.createdfrom IS NULL ' + 
            'ORDER BY transaction.tranid';

            var data = query.runSuiteQL({ query: sql, params: [ 'VendBill', project_id ] }).asMappedResults();
        
            data.forEach(function(l) {
                                    
                    if(!l.item_name || l.rate == 0) { return; }

                    if(l.accountinglinetype != 'ASSET') {

                        if(!unique_costs[l.item_name]) {
                            unique_costs[l.item_name] = {
                                total: 0,
                                class_name: l.class_name,
                                lines: []
                            };
                        }

                        unique_costs[l.item_name].total += Number(l.quantity * l.rate);
                        unique_costs[l.item_name].lines.push({
                            po_number: l.name,
                            po_id: l.id,
                            date: l.transaction_date,
                            vendor: l.vendor_name,
                            item: l.item_name,
                            quantity: l.quantity,
                            rate: l.rate
                        });
                    }
            });

            // expenses
            sql = 'SELECT transaction.id, transaction.trandate AS transaction_date, transaction.tranid AS name, vendor.entityid AS vendor_name, account.acctnumber, transactionLine.id AS line_id, ' +
            'BUILTIN.DF(transaction.custbody_nsps_commodity_manager) AS cm_user, TransactionAccountingLine.amount AS amount, BUILTIN.DF(TransactionAccountingLine.account) AS account, ' +
            'FROM transaction LEFT OUTER JOIN vendor ON transaction.entity = vendor.id ' +
            'RIGHT JOIN transactionline ON transaction.id = transactionline.transaction ' +
            'RIGHT JOIN TransactionAccountingLine ON TransactionAccountingLine.transaction = transactionLine.transaction ' +
            'RIGHT JOIN account ON TransactionAccountingLine.account = account.id ' +
            'WHERE transaction.type = ? AND transactionline.entity = ? AND transactionline.createdfrom IS NULL AND amount > 0 AND account.acctnumber LIKE \'7%\' ' + 
            'ORDER BY transaction.tranid';

            var data = query.runSuiteQL({ query: sql, params: [ 'VendBill', project_id ] }).asMappedResults();

            var logged = [];
            data.forEach(function(l) {

                var key = l.id + '_' + l.line_id;
                if(logged.indexOf(key) == -1) {
                    logged.push(key);
                }
                else {
                    return;
                }
                                                    
                if(!unique_costs[l.account]) {
                    unique_costs[l.account] = {
                        total: 0,
                        class_name: 'Field Ops / Remediation',
                        lines: []
                    };
                }

                unique_costs[l.account].total += Number(l.amount);
                unique_costs[l.account].lines.push({
                    po_number: l.name,
                    po_id: l.id,
                    date: l.transaction_date,
                    vendor: l.vendor_name,
                    item: l.account,
                    quantity: 1,
                    rate: l.amount
                });        
            });                                  
            
            return unique_costs;

            /*
            budget_items = {
                ['Ocean Shipping']: { 
                    budget_field: 'budget_ocean_shipping',
                    total: 0,
                    lines: []
                },
                ['Duties']: {
                    budget_field: 'budget_duties',
                    total: 0,
                    lines: []
                },
                ['Last Mile']: {
                    budget_field: 'budget_last_mile',
                    total: 0,
                    lines: []
                },
                ['Field Ops / Remediation']: {
                    budget_field: '',
                    total: 0,
                    lines: []
                },
                ['Bond BG Fees']: {
                    budget_field: '',
                    total: 0,
                    lines: []
                },
                ['Other Costs']: {
                    budget_field: '',
                    total: 0,
                    lines: []
                }                   
            };

            bill_charges.forEach(oc => {

                let key = '';

                if(this.state.bill_items[oc].class_name.match(/Remediation/)) {
                    key = 'Field Ops / Remediation';
                }
                else if(this.state.bill_items[oc].class_name.match(/(Last Mile|Storage|Air)/)) {
                    key = 'Last Mile';
                }
                else if(this.state.bill_items[oc].class_name.match(/Ocean/)) {
                    key = 'Ocean Shipping';
                }
                else if(this.state.bill_items[oc].class_name.match(/Duties/)) {
                    key = 'Duties';
                }      
                else if(this.state.bill_items[oc].class_name.match(/Bond BG Fees/)) {
                    key = 'Bond BG Fees';
                } 
                if(!key) { key = 'Other Costs'; }               

                budget_items[key].total += this.state.bill_items[oc].total;
                budget_items[key].lines.push(...this.state.bill_items[oc].lines); 
            });

            */
        }
        
    } 

});                      