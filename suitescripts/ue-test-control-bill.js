/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/query'], function(record, query) {          
    
    return {

        po_check: function(bill) {

            var error = '';

            var item_id = bill.getSublistValue({ sublistId: 'item', fieldId: 'item', line: 0 });                  
            var rate = bill.getSublistValue({ sublistId: 'item', fieldId: 'rate', line: 0 });                  
            var quantity = bill.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: 0 });                                                                     

            // match against po
            var po = record.load({
                type: record.Type.PURCHASE_ORDER,
                id: bill.getSublistValue({ sublistId: 'purchaseorders', fieldId: 'id', line: 0 })  
            });

            // do we have the same item id and rate with quantity unbilled
            var checked = false;
            for(var i = 0; i < po.getLineCount({ sublistId: 'item' }); i++) {
                if(po.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i }) == item_id) {

                    var remaining = po.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i }) - po.getSublistValue({ sublistId: 'item', fieldId: 'quantitybilled', line: i });
                    if(quantity > (remaining + 1)) {

                        error = 'Bill quantity exceeds PO unbilled quantity by ' + (quantity - remaining);
                        break;
                    }
                    else if(po.getSublistValue({ sublistId: 'item', fieldId: 'rate', line: i }) < rate) {

                        error = 'Bill rate greater than PO rate';
                        break;
                    }
                    else {

                        checked = true;
                    }

                    break;
                }
            }

            if(!checked && !error) {

                // must have never found the item on the PO
                error = 'Bill item not found on PO';
            }

            return {
                error: error,
                po: po
            };
        },

        afterSubmit: function(context) {    

            if(context.newRecord.id && context.newRecord.id == 755566) {
      
                var message = [ 'Control Test' ];
    
                var bill = context.newRecord;                          
    
                var global_approve = true;

                // get all the packing list lines
                var packing_lists = [];

                var items = bill.getLineCount({ sublistId: 'item' });
                for(var i = 0; i < items; i++) { 

                    var packing_list = bill.getSublistValue({ sublistId: 'item', fieldId: 'custcol_gcs_packing_list_num', line: i });                       
                    if(packing_list.match(/[A-Za-z0-9]/)) {   
                        packing_lists.push(packing_list);
                    }
                }

                if(packing_lists.length > 0) {

                    var matches = [];

                    for(var j = 0; j < packing_lists.length; j++) {

                        var packing_list = packing_lists[j];

                        var sql = 'SELECT name, BUILTIN.DF(custrecord_gcs_packing_list_project) AS project ' +
                            'FROM customrecord_gcs_packing_list ' + 
                            'WHERE upper(name) LIKE upper(?)';

                        var results = query.runSuiteQL({ query: sql, params: [ packing_list + '%' ] }).asMappedResults();  
                        var matches = [];
                        var matched = false;
                        results.forEach(function(r) {
                            for(var i = 0; i < results.length; i++) {
                                if(String(packing_list).toLocaleUpperCase() == String(results[i].name).toUpperCase()) {
                                    matched = true;
                                    break;
                                }
                                else {
                                    matches.push('Packing List: ' + results[i].name + '\nProject: ' + results[i].project);
                                }
                            }
                        });

                        if(!matched) {

                            global_approve = false;
                        
                            message.push('No valid packing list found. ');
                            if(matches.length) {
                                message.push('Possible matches below');
                                message.push(matches.join('\n\n'));
                            } 
                            else {
                                message.push('Check for mistype / Use PDS PL Search');
                            }                            
                        }
                        
                        else {

                            // make sure there is no other bill with this packing list from the same vendor
                            var sql = 'SELECT transaction.id, transaction.trandate AS transaction_date, transaction.tranid AS name, transactionline.custcol_gcs_packing_list_num AS packing_list ' +
                                'FROM transaction LEFT OUTER JOIN transactionline ON transaction.id = transactionline.transaction ' +
                                'WHERE transaction.id <> ? AND transaction.entity = ? AND transaction.type = ? AND transactionline.custcol_gcs_packing_list_num = ? '
                                'ORDER BY transaction.tranid';

                            var results = query.runSuiteQL({ query: sql, params: [ (bill.id) ? bill.id : 0, bill.getValue('entity'), 'VendBill', packing_list ] }).asMappedResults();  

                            if(results.length) {
                                global_approve = false;
                                message.push('Packing list found on existing bill from same vendor ' + results[0].name);
                            }
                            else {

                                // run the PO check
                                var po_result = this.po_check(bill);

                                if(po_result.error) {
                                    message.push(po_result.error);
                                    global_approve = false;
                                }
                                else {

                                    // check for the item fulfillment
                                    var sql = 'SELECT transaction.id, transaction.trandate AS transaction_date, transaction.tranid AS name, transactionline.custcol_gcs_packing_list_num AS packing_list ' +
                                    'FROM transaction LEFT OUTER JOIN transactionline ON transaction.id = transactionline.transaction ' +
                                    'WHERE transaction.type = ? AND transaction.status = ? AND transactionline.custcol_gcs_packing_list_num = ? '
                                    'ORDER BY transaction.tranid';
                    
                                    var results = query.runSuiteQL({ query: sql, params: ['ItemShip', 'ItemShip:C', packing_list ] }).asMappedResults();  

                                    if(results.length) {

                                        message.push('Approved: ' + results[0].name + ' / ' + po_result.po.getValue('tranid') + ' / ' + packing_list);
                                    }
                                    else {
                                        message.push('No item fulfillment found');
                                        global_approve = false;
                                    }
                                }
                            }
                        }
                    }
                }    
            
                else {
                    global_approve = false;
                    message.push('No packing list entered');
                }

                if(global_approve) {

                    // first check to see if we are in the same month now
                    
                    var today = new Date();
                    var bill_date = new Date(bill.getValue('trandate'));

                    if(today.getMonth() > bill_date.getMonth()) {

                        // this needs to be manually approved
                        message = [];
                        message.push('Ready for approval but bill date is in previous month. Please manually approve and ensure correct Posting Period.');                                              
                    }
                    else {

                        message.push('All Lines Approved');
                    }

                    var bill_date_text = bill_date.getMonth() + '/' + bill_date.getDate() + '/' + bill_date.getFullYear();
                    log.audit('sql', 'SELECT * from accountingperiod WHERE startdate <= \'' + bill_date_text + '\' and enddate >= \'' + bill_date_text + '\' and isposting = \'T\'')
                                        

                    // make sure we are not in a locked period
                    /*
                    var bill_date = new Date(bill.getValue('trandate'));
                    var bill_date_text = bill_date.getMonth() + '/' + bill_date.getDate() + '/' + bill_date.getFullYear();

                    var sql = 'SELECT * from accountingperiod WHERE startdate <= \'' + bill_date_text + '\' and enddate >= \'' + bill_date_text + '\' and isposting = ?';
                    var results = query.runSuiteQL({ query: sql, params: [ 'T' ] }).asMappedResults();  
                    if(results && results[0].aplocked == 'T' || results[0].closed == 'T') {


                        // this needs to be manually approved
                        message = [];
                        message.push('Ready for approval but bill date is in a closed period (' + results[0].periodname + '). Please manually approve and ensure correct Posting Period.');
                    }
                    else {

                        message.push('All Lines Approved');
                    }
                    */
    
                }            
                
               //return message; // + '\n\nCurrent Period: ' + period_name;
               //return message.join('\n\n');

               var r = record.load({
                    type: record.Type.VENDOR_BILL,
                    id: context.newRecord.id
               });

               r.setValue({ fieldId: 'custbody_gcs_auto_approval_status', value: message.join('\n\n') });
               r.save();
            }
        }
    }
});