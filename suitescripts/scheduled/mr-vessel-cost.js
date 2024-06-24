/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 */

define(['N/query', 'N/search', 'N/record'], function(query, search, record) {

    function getInputData() {

        var csearch = search.load({
            id: 'customsearch_vessel_cost_sync'
        });
        
        return csearch;
    }

    function map(context) {        

        var result = JSON.parse(context.value);

        var cost_per_lb = 0;
        var total_cost = 0;
        var total_weight = 0;
        var cost_breakdown = {
            cost_lines: [],
            weight_lines_by_project: [],
            weight_lines_raw: []
        };                

        try {

            // get all POs for vessel                     
            var sql = 'SELECT transaction.id, transactionLine.rate, transactionLine.item, transaction.tranid AS po_number, BUILTIN.DF(transactionline.item) AS item_name, transactionLine.quantity ' + 
            'FROM transactionLine LEFT OUTER JOIN transaction ON transactionLine.transaction = transaction.id ' +
            'WHERE transaction.custbody_gcs_vessel = ? AND transaction.type = ? ';

            var data = query.runSuiteQL({ query: sql, params: [ result.id, 'PurchOrd' ] }).asMappedResults();
         
            data.forEach(function(d) {

                if(d.rate) {

                    total_cost += Number(d.rate * d.quantity);
                    cost_breakdown.cost_lines.push({
                        po_number: d.po_number,
                        po_id: d.id,
                        item: String(d.item_name).replace('*No longer in use*', ''),
                        rate: d.rate,
                        quantity: d.quantity
                    });
                }
            });

            // get all weight assigned to vessel
            sql = 'SELECT customrecord_gcs_ds_item.id AS ds_id, customrecord_gcs_ds_item.custrecord_gcs_ds_item_project AS project_id, BUILTIN.DF(customrecord_gcs_ds_item.custrecord_gcs_ds_item_project) AS project_name, ' +                       
                'customrecord_gcs_ds_item.custrecord_gcs_ds_item_part AS part_id, item.itemid AS part, item.weight AS item_weight, BUILTIN.DF(item.custitem_gcs_commodity_category) AS commodity_category, ' +
                'customrecord_gcs_ds_item.custrecord_gcs_ds_item_part_weight AS ds_weight, customrecord_gcs_ds_item.custrecord_gcs_ds_item_quantity AS quantity ' +
                'FROM customrecord_gcs_ds_item LEFT OUTER JOIN customrecord_gcs_vessel ON customrecord_gcs_ds_item.custrecord_gcs_ds_item_vessel = customrecord_gcs_vessel.id ' +
                'LEFT OUTER JOIN item ON customrecord_gcs_ds_item.custrecord_gcs_ds_item_part = item.id ' + 
                'WHERE customrecord_gcs_ds_item.custrecord_gcs_ds_item_vessel  = ?';

            data = query.runSuiteQL({ query: sql, params: [ result.id ] }).asMappedResults();

            var project_map = {};

            data.forEach(function(d) {

                var recorded_weight = (d.ds_weight) ? d.ds_weight : d.item_weight;

                total_weight += Number(recorded_weight * d.quantity);

                if(!recorded_weight) { recorded_weight = 0; }

                cost_breakdown.weight_lines_raw.push({
                    project_name: d.project_name,
                    project_id: d.project_id,
                    item: d.part,
                    quantity: d.quantity,
                    item_weight: d.item_weight,
                    ds_weight: d.ds_weight,
                    recorded_weight: recorded_weight
                });

                if(!project_map[d.project_name]) {
                    project_map[d.project_name] = {
                        project_id: d.project_id,
                        total: 0
                    };
                }

                project_map[d.project_name].total += Number(recorded_weight * d.quantity);
            });

            var keys = Object.keys(project_map).sort();

            keys.forEach(function(k) {
                cost_breakdown.weight_lines_by_project.push({
                    project_name: k,
                    project_id: project_map[k].project_id,
                    total_weight: project_map[k].total,
                })
            });

            cost_per_lb = Number(total_cost / total_weight);

        }
        catch(e) {
            log.error('Error', e);
        }    
        
        // Save 
        var v = record.load({
            type: 'customrecord_gcs_vessel',
            id: result.id
        });                          

        v.setValue({
            fieldId: 'custrecord_gcs_vessel_cost_per_lb',
            value: cost_per_lb
        });

        v.setValue({
            fieldId: 'custrecord_gcs_vessel_total_cost',
            value: total_cost
        });      
        
        v.setValue({
            fieldId: 'custrecord_gcs_vessel_total_weight_lbs',
            value: total_weight
        });         

        v.setValue({
            fieldId: 'custrecord_gcs_vessel_cost_breakdown',
            value: JSON.stringify(cost_breakdown)
        });    

        try {
            v.save();        
        }
        catch(e) {
            log.error('Save Error', e);
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