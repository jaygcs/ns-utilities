/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 */

define([
    'N/query', 
    'N/search', 
    'N/record', 
    'SuiteScripts/GCS/purchase-orders',
],

function(query, search, record, purchase_orders) {

    function getInputData() {

        return search.load({
            id: 'customsearch_project_projections_sync'
        });             
    }

    function map(context) {        

        var result = JSON.parse(context.value);        

        try {  

            var p = record.load({
                type: record.Type.JOB,
                id: result.id
            });

            // get bom and budget       
            sql = 'SELECT custrecord_gcs_bom_item_b_cpp AS budget_material, custrecord_gcs_bom_item_b_duties AS budget_duties, ' +
                'custrecord_gcs_bom_item_b_ocean AS budget_ocean, custrecord_gcs_bom_item_b_lm AS budget_last_mile, custrecord_gcs_bom_item_quantity AS quantity, ' +
                'id AS bom_id, custrecord_gcs_bom_item_part AS part_id, BUILTIN.DF(custrecord_gcs_bom_item_part) AS part_name, ' +
                'custrecord_gcs_bom_item_sov AS sov ' +
                'FROM customrecord_gcs_bom_item ' + 
                'WHERE custrecord_gcs_bom_item_project = ? AND customrecord_gcs_bom_item.custrecord_gcs_bom_item_co IS NULL';              
                
            var bom = query.runSuiteQL({ query: sql, params: [ result.id ] }).asMappedResults();    
         
            var total_budget_material = 0;
            var total_budget_duties = 0;            
            var total_budget_ocean = 0;  
            var total_budget_last_mile = 0;  
            bom.forEach(function(r) {            
                total_budget_material += Number(r.quantity * r.budget_material);
                total_budget_duties += Number(r.budget_duties);
                total_budget_ocean += Number(r.budget_ocean);
                total_budget_last_mile += Number(r.budget_last_mile);
            }); 

            p.setValue({ fieldId: 'custentity_gcs_p_budget_material', value: total_budget_material });
            p.setValue({ fieldId: 'custentity_gcs_p_budget_duties', value: total_budget_duties });
            p.setValue({ fieldId: 'custentity_gcs_p_budget_os', value: total_budget_ocean });
            p.setValue({ fieldId: 'custentity_gcs_p_budget_lm', value: total_budget_last_mile });

            // get ps and projections
            var sql = 'SELECT custrecord_gcs_ps_item_bom_item AS bom_id, ' +
                'custrecord_gcs_ps_item_quantity AS quantity, custrecord_gcs_ps_rate AS po_rate, custrecord_gcs_ps_rm_cost AS rm_cost, ' +                    
                'custrecord_gcs_ps_item_po AS po_id, BUILTIN.DF(custrecord_gcs_ps_item_po) as po_number, ' +
                'custrecord_gcs_ps_item_wo AS wo_id, BUILTIN.DF(custrecord_gcs_ps_item_wo) as wo_number ' +
                'FROM customrecord_gcs_ps_item ' +          
                'WHERE custrecord_gcs_ps_item_project = ?';

            var ps = query.runSuiteQL({ query: sql, params: [ result.id ]  }).asMappedResults();     
            
            var total_material_projections = 0;
            var breakdown = [];
            var bom_updates = {};
            ps.forEach(function(r) {              

                if(!bom_updates[r.bom_id]) {
                    bom_updates[r.bom_id] = 0;
                }

                var rate = r.po_rate;
                if(r.rm_cost) {
                    rate = r.po_rate + r.rm_cost;
                }

                var total = r.quantity * rate

                bom_updates[r.bom_id] += total;

                total_material_projections += Number(total);               
            });   

            p.setValue({ fieldId: 'custentity_gcs_p_po_material', value: total_material_projections });     
            
            // logistics
            var unique_costs = {};
            var po_data = purchase_orders.get(result.id);            
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
            
            var total_logistics_projections = 0;
            var logistics = Object.keys(unique_costs).sort();
            logistics.forEach(function(oc) {
                breakdown.push({
                    item: oc,
                    total: unique_costs[oc].total
                });        
                total_logistics_projections += Number(unique_costs[oc].total);
            });

            p.setValue({ fieldId: 'custentity_gcs_p_po_logistics', value: total_logistics_projections });     

            p.save();

            // update bom
            Object.keys(bom_updates).forEach(function(b) {

                record.submitFields({
                    type: 'customrecord_gcs_bom_item',
                    id: b,
                    values: { 
                        custrecord_gcs_bom_item_pmc: bom_updates[b]
                    }
                });
            });

           
        }
        catch(e) {                                
            log.audit('Map Error on', result);
            log.audit('Exception', e);
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