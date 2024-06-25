/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 */
 define([ 'N/record', 'N/query' ], function(record, query) {            
    
    return {        

        beforeLoad: function(context) {    

            /*

            if (context.type === context.UserEventType.CREATE || context.type === context.UserEventType.EDIT && context.newRecord.getValue('createdfrom')) {

                // get lines from parent
                var sql = 'SELECT transactionLine.custcol_gcs_packing_list_num AS packing_list_number, transactionLine.item ' +
                    'FROM transactionLine WHERE transaction = ?';

                var results = query.runSuiteQL({ query: sql, params: [ context.newRecord.getValue('createdfrom') ] }).asMappedResults();                         

                // Get line count
                var line_count = context.newRecord.getLineCount({
                    sublistId: 'item'
                });

                // Loop through line items and set quantity to 0
                for (var i = 0; i < line_count; i++) {

                    var found_pl = '';

                    results.forEach(function(r) {
                        if(r.item == context.newRecord.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i }) && context.newRecord.getSublistValue({ sublistId: 'item', fieldId: 'custcol_gcs_packing_list_num', line: i })) {
                            found_pl = context.newRecord.getSublistValue({ sublistId: 'item', fieldId: 'custcol_gcs_packing_list_num', line: i });
                        }
                    });

                    if(found_pl) {

                        log.audit('PL Matched', context.newRecord.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i }) + ' ' + found_pl);

                        context.newRecord.setSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_gcs_packing_list_num',
                            line: i,
                            value: found_pl
                        });
                    }
                }
            }

            */
        }
    }
});