/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 */

define(['N/query', 'N/record', 'N/file'],

function(query, record, file) {

    function getInputData() {

        // get all projects that have a delivery schedule record       
        var sql = 'SELECT id, companyname, BUILTIN.DF(parent) AS customer_name FROM job WHERE id IN(SELECT customrecord_gcs_ds_item.custrecord_gcs_ds_item_project FROM customrecord_gcs_ds_item)';
        
        return query.runSuiteQL({ query: sql }).asMappedResults();
    }

    function map(context) {        
        
        var result = JSON.parse(context.value);
        log.audit('Map', result);


        if(result.customer_name.match(/GameChange/)) {

            log.audit('Skipping', result);
        }

        try {

            var p = record.load({
                type: record.Types.JOB,
                id: result.id
            });

            // get the production schedule
          
            // get average cost map
            var avg_cost_map = file.load({ name: 'SuiteScripts/GCS/cache/avg-cost-location.json' }).getContents();

            // get the contract sales order
            var contract_sales_order = {

            }
            var sql = 'SELECT transaction.id, transaction.tranid AS number, ' +
                'BUILTIN.DF(transactionline.item) AS item_name, transactionline.quantity AS quantity, transactionLine.rate ' +
                'FROM transaction LEFT OUTER JOIN transactionline ON transaction.id = transactionline.transaction ' +
                'WHERE transaction.type = ? AND transactionline.entity = ? AND transaction.custbody_gcs_sotype = ?';

             var results = query.runSuiteQL({ query: sql, params: [ 'SalesOrd', context.params.project_id, 12 ] }).asMappedResults();
             if(results.length) {

                var contract_sales_order = {
                    id: results[0].id,
                    number: results[0].number,
                    system: '',
                    system_amount: 0,
                    shipping_amount: 0,
                    discount_amount: 0
                }

                var shipping = [];
                var discount = [];

                results.forEach(function(r) {
                    if(r.item_name.match(/(GENIUS_TRACKER|MAXSPAN|PIP)/)) {
                        contract_sales_order.system = r.item_name
                        contract_sales_order.system_amount += Number(Math.abs(r.quantity) * r.rate);                        
                    }             
                    else if(r.item_name.match(/Shipping/)) {
                        shipping.push(Math.abs(r.quantity) * r.rate);
                    }
                    else if(r.item_name.match(/Discount/)) {
                        discount.push(r.quantity * r.rate);
                    }
                });

                shipping.forEach(function(s) {
                    contract_sales_order.shipping_amount += Number(s);
                });
             
                discount.forEach(function(d) {
                    contract_sales_order.discount_amount += Number(d);
                });

                p.setText({ fieldId: 'custentity_gcs_project_system', text: contract_sales_order.system });


            }

            p.save();

        }
        catch(e) {
            log.audit('Error', e);
        }    
        
       
    }

    function reduce(context) {            
    }

    function summarize(context) {

        // Log summary details
        log.audit('Summary', context);        
    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };

});