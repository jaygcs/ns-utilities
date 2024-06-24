/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 */

define([ 'N/query', 'N/search', 'N/record', 'N/file' ],

function(query, search, record, file) {

    function getInputData() {

        return search.load({
            id: 'customsearch_ps_cost_sync'
        });             
    }

    function map(context) {        

        var result = JSON.parse(context.value);        

        try {  

            var ps_item = record.load({
                type: 'customrecord_gcs_ps_item',
                id: result.id
            });                       
            
            var po_rate = 0;
            var rm_cost = 0;
            var rm_cost_breakdown = [];        

            // get the rate from that PO
            var sql = 'SELECT transactionLine.rate, transactionLine.item, transactionLine.assembly ' + 
            'FROM transactionLine ' +
            'WHERE transactionLine.transaction = ? ' + 
            'AND (transactionLine.item = ? OR transactionLine.assembly = ?) ';

            var po = query.runSuiteQL({ query: sql, params: [ result.values['custrecord_gcs_ps_item_po'].value, result.values['custrecord_gcs_ps_item_part'].value, result.values['custrecord_gcs_ps_item_part'].value ] }).asMappedResults().pop();                 
                
            po_rate = po.rate;

            // load avg cost by location map            
            var cost_map = {}
            try {
                cost_map = JSON.parse(file.load({ id: 'SuiteScripts/GCS/cache/avg-cost-location.json' }).getContents());
            }
            catch(e) {
                log.audit('Fail', e);
            }
            
            if(po.assembly) {

                // get the work order
                sql = 'SELECT transactionLine.transaction FROM transactionLine LEFT OUTER JOIN transaction ON transaction.id = transactionline.transaction WHERE transaction.type = ? AND transaction.linkedpo = ? AND transactionLine.item = ?';
                var wo_results = query.runSuiteQL({ query: sql, params: [ 'WorkOrd', result.values['custrecord_gcs_ps_item_po'].value, po.assembly ] }).asMappedResults();  
                var wo_id = wo_results[0].transaction;

                // we need to get raw material costs from work order
                sql = 'SELECT transactionline.itemsource, BUILTIN.DF(transactionline.item) AS item_name, transactionline.item AS item_id, transactionline.quantity, transactionLine.mainline, ' +
                'item.averagecost AS item_avg_cost, item.lastpurchaseprice AS item_last_purchase_price ' +
                'FROM transactionline LEFT OUTER JOIN item ON item.id = transactionline.item ' +                     
                'WHERE transactionline.transaction = ?';

                var wo_lines = query.runSuiteQL({ query: sql, params: [ wo_id ] }).asMappedResults();  
                var assembly_quantity = 0;
                var rm_total_cost = 0;
                wo_lines.forEach(function(line) {  

                    if(line.mainline == 'T') {                        
                        assembly_quantity = Math.abs(line.quantity);                            
                    }
                    else if(line.itemsource == 'STOCK' && line.item_name != 'Processing Charges') { 

                        var rate = (line.item_avg_cost) ? line.item_avg_cost : line.item_last_purchase_price;

                        // override with cost map if this item/location exists in the map
                        var key = line.item_id + '_' + result.values['custrecord_gcs_ps_item_location'].value;
                        if(cost_map[key]) {
                            rate = cost_map[key];
                        }
                        else {
                            //log.audit('Not found in Cost Map', key + ' (' + line.item_name + ' ' + result.values['custrecord_gcs_ps_item_location'].text + ')');
                        }

                        var cost = Number(rate * Math.abs(line.quantity));                            
                        
                        rm_total_cost += Number(cost);

                        rm_cost_breakdown.push({
                            item: line.item_name,
                            quantity: Math.abs(line.quantity),
                            rate: rate
                        });
                    }                                                            
                });  

                rm_cost = (rm_total_cost / assembly_quantity);                                    
            }                                                            

            ps_item.setValue({
                fieldId: 'custrecord_gcs_ps_rate',
                value: (po_rate) ? po_rate : result.values['custrecord_gcs_ps_item_part.averagecost']
            });

            ps_item.setValue({
                fieldId: 'custrecord_gcs_ps_rm_cost',
                value: rm_cost
            });                

            ps_item.setValue({
                fieldId: 'custrecord_gcs_ps_item_wo',
                value: wo_id
            });   

            ps_item.setValue({
                fieldId: 'custrecord_gcs_ps_item_cost_breakdown',
                value: JSON.stringify(rm_cost_breakdown)
            });   
            
            ps_item.save();          
        }
        catch(e) {

            // BOM part doesnt match PO part
            var l = result.values['custrecord_gcs_ps_item_part.custitem13'].text + ' - ' + result.values['custrecord_gcs_ps_item_part'].value + ' not found on ' + result.values['custrecord_gcs_ps_item_po'].text           

            log.audit('fail', l);
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