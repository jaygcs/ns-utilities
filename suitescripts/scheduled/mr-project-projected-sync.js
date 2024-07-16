/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 */

define([
    'N/query', 
    'N/search', 
    'N/record', 
    'N/file',
    'SuiteScripts/GCS/project-expenses',
    'SuiteScripts/GCS/vessels',
    'SuiteScripts/GCS/dayjs.min'
],

function(query, search, record, file, project_expenses, vessels, dayjs) {

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
            var sql = 'SELECT custrecord_gcs_ps_item_bom_item AS bom_id, BUILTIN.DF(custrecord_gcs_ps_item_part) AS part_name, custrecord_gcs_ps_item_part AS part_id, custrecord_gcs_ps_item_location AS location_id, ' +
                'custrecord_gcs_ps_item_quantity AS quantity, custrecord_gcs_ps_rate AS po_rate, custrecord_gcs_ps_rm_cost AS rm_cost, ' +                    
                'custrecord_gcs_ps_item_po AS po_id, BUILTIN.DF(custrecord_gcs_ps_item_po) as po_number, ' +
                'custrecord_gcs_ps_item_wo AS wo_id, BUILTIN.DF(custrecord_gcs_ps_item_wo) as wo_number ' +
                'FROM customrecord_gcs_ps_item ' +          
                'WHERE custrecord_gcs_ps_item_project = ?';

            var ps = query.runSuiteQL({ query: sql, params: [ result.id ]  }).asMappedResults();   
            
            // load avg cost by location map            
            var cost_map = {}
            try {
                cost_map = JSON.parse(file.load({ id: 'SuiteScripts/GCS/cache/avg-cost-location.json' }).getContents());
            }
            catch(e) {
                log.audit('Fail', e);
            }
            
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

                if(!r.po_id) {

                    // override with avg cost
                    var key = ps.part_id + '_' + ps.location_id;
                    if(cost_map[key]) {
                        rate = cost_map[key];
                    }                    
                }

                var total = r.quantity * rate

                bom_updates[r.bom_id] += total;

                total_material_projections += Number(total);               
            });   

            p.setValue({ fieldId: 'custentity_gcs_p_po_material', value: total_material_projections });     
            
            // logistics / expenses      
                           
            var budget_items = {
                'Ocean Shipping': { 
                    budget_field: 'custentity_gcs_p_projected_ocean',
                    total: 0,
                    lines: []
                },
                'Duties': {
                    budget_field: 'custentity_gcs_p_projected_duties',
                    total: 0,
                    lines: []
                },
                'Last Mile': {
                    budget_field: 'custentity_gcs_p_projected_last_mile',
                    total: 0,
                    lines: []
                },
                'Field Ops / Remediation': {
                    budget_field: '',
                    total: 0,
                    lines: []
                },
                'Bond BG Fees': {
                    budget_field: '',
                    total: 0,
                    lines: []
                },
                'Other Costs': {
                    budget_field: '',
                    total: 0,
                    lines: []
                }                   
            };

            var unique_costs = project_expenses.get(result.id);    
            var items = Object.keys(unique_costs)            

            items.forEach(function(item) {

                var key = '';

                if(unique_costs[item].class_name) {
                    if(unique_costs[item].class_name.match(/Remediation/)) {
                        key = 'Field Ops / Remediation';
                    }
                    else if(unique_costs[item].class_name.match(/(Last Mile|Storage|Air)/)) {
                        key = 'Last Mile';
                    }
                    else if(unique_costs[item].class_name.match(/Ocean/)) {
                        key = 'Ocean Shipping';
                    }
                    else if(unique_costs[item].class_name.match(/Duties/)) {
                        key = 'Duties';
                    }      
                    else if(unique_costs[item].class_name.match(/Bond BG Fees/)) {
                        key = 'Bond BG Fees';
                    } 
                }
                if(!key) { key = 'Other Costs'; }               

                budget_items[key].total += unique_costs[item].total;

                breakdown.push({
                    item: item,
                    total: unique_costs[item].total
                });
            });                                  

            // add vessel costs to open shipping
            var vessel_costs = vessels.getProjectCost(result.id);
            vessel_costs.forEach(function(v) {

                breakdown.push({
                    item: 'Vessel Cost - ' + v.name,
                    total: Number(v.cost_per_lb * v.total_weight)
                });                     

                budget_items['Ocean Shipping'].total += Number(v.cost_per_lb * v.total_weight);
            });               

            p.setValue({ fieldId: 'custentity_gcs_p_po_logistics', value: 0 });     
            p.setValue({ fieldId: 'custentity_gcs_p_po_material_breakdown', value: JSON.stringify(breakdown) });

            var cs = Object.keys(budget_items);
            cs.forEach(function(oc) {
               
                if(budget_items[oc].budget_field) {
                    p.setValue({ fieldId: budget_items[oc].budget_field, value: budget_items[oc].total });     
                }
            });

            // get percent complete
            sql = 'SELECT customrecord_gcs_mps_item.id AS mps_id, ' +
            'customrecord_gcs_mps_item.custrecord_gcs_mps_item_bom_item AS bom_id, ' +
            'BUILTIN.DF(customrecord_gcs_mps_item.custrecord_gcs_mps_item_part) AS part, ' +
            'customrecord_gcs_mps_item.custrecord_gcs_mps_item_quantity AS quantity, ' +
            'customrecord_gcs_mps_item.custrecord_gcs_mps_item_site_date AS date_site_arrival ' +
            'FROM customrecord_gcs_mps_item ' + 
            'WHERE custrecord_gcs_mps_item_project = ? ';            
            
            var mps = query.runSuiteQL({ query: sql, params: [ result.id ]}).asMappedResults();

            sql = 'SELECT BUILTIN.DF(customrecord_gcs_ds_item.custrecord_gcs_ds_item_part) AS part, ' +
            'customrecord_gcs_ds_item.custrecord_gcs_ds_item_quantity_actual AS quantity_actual, ' +
            'customrecord_gcs_ds_item.custrecord_gcs_ds_item_site_date AS date_site_arrival ' +
            'FROM customrecord_gcs_ds_item ' + 
            'WHERE custrecord_gcs_ds_item_project = ? ';     
            
            var ds = query.runSuiteQL({ query: sql, params: [ result.id ]}).asMappedResults();

            var delivery_dates = [];

            // get stats by bom item
            var bom_items = {};
            mps.forEach(function(d) {         
                if(!bom_items[d.part]) {
                    bom_items[d.part] = {
                        delivery_planned: 0,
                        delivery_actual: 0
                    };
                }

                bom_items[d.part].delivery_planned += d.quantity;

                delivery_dates.push(d.date_site_arrival);
            });

            ds.forEach(function(d) {    

                if(bom_items[d.part]) {

                    bom_items[d.part].delivery_actual += (d.quantity_actual) ? d.quantity_actual : 0;

                    if(d.date_site_arrival) {
                        delivery_dates.push(d.date_site_arrival);
                    }
                }
            });            

            delivery_dates = delivery_dates.sort(function(a, b) {
                return dayjs(a).valueOf() - dayjs(b).valueOf();
            });

            var avg_total = 0;
            Object.keys(bom_items).forEach(function(bom_item) {
                avg_total += (bom_items[bom_item].delivery_actual * 100) / bom_items[bom_item].delivery_planned
            });

            var percent_delivered = Math.round(avg_total / Object.keys(bom_items).length);
            p.setValue({ fieldId: 'custentity_gcs_p_percent_delivered', value: percent_delivered });
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