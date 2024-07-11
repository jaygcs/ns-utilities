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
            sql = 'SELECT transaction.id, transaction.trandate AS transaction_date, transaction.tranid AS name, vendor.entityid AS vendor_name, account.acctnumber, ' +
            'BUILTIN.DF(transaction.custbody_nsps_commodity_manager) AS cm_user, TransactionAccountingLine.amount AS amount, BUILTIN.DF(TransactionAccountingLine.account) AS account, ' +
            'FROM transaction LEFT OUTER JOIN vendor ON transaction.entity = vendor.id ' +
            'LEFT OUTER JOIN transactionline ON transaction.id = transactionline.transaction ' +
            'LEFT OUTER JOIN TransactionAccountingLine ON TransactionAccountingLine.transaction = transactionLine.transaction ' +
            'LEFT OUTER JOIN account ON TransactionAccountingLine.account = account.id ' +
            'WHERE transaction.type = ? AND transactionline.entity = ? AND transactionline.createdfrom IS NULL AND amount > 0 AND account.acctnumber LIKE \'7%\' ' + 
            'ORDER BY transaction.tranid';

            var data = query.runSuiteQL({ query: sql, params: [ 'VendBill', project_id ] }).asMappedResults();

            data.forEach(function(l) {
                                                    
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
        }
        
    } 

});                      