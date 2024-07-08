/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 */

define([
    'N/query', 
    'N/search', 
    'N/record', 
    'SuiteScripts/GCS/dayjs.min'
],

function(query, search, record, dayjs) {

    function getInputData() {

        return search.load({
            id: 'customsearch_project_ontime_sync'
        });             
    }

    function map(context) {        

        var result = JSON.parse(context.value);        

        try {  

            // get mps
            var mps = [];            
            sql = 'SELECT item.itemid AS part, item.description AS part_description, item.class, BUILTIN.DF(item.custitem_gcs_commodity_category) AS commodity_category, ' +
            'customrecord_gcs_mps_item.custrecord_gcs_mps_item_bom_item AS bom_id, customrecord_gcs_bom_item.custrecord_gcs_bom_item_co AS change_order_id, ' +            
            'customrecord_gcs_mps_item.custrecord_gcs_mps_item_quantity AS quantity, ' +
            'customrecord_gcs_mps_item.custrecord_gcs_mps_item_prod_date AS date_production, ' +
            'customrecord_gcs_mps_item.custrecord_gcs_mps_item_ship_date AS date_ship, ' +
            'customrecord_gcs_mps_item.custrecord_gcs_mps_item_site_date AS date_site_arrival, ' +
            'FROM customrecord_gcs_mps_item ' +                                  
            'LEFT OUTER JOIN customrecord_gcs_bom_item ON customrecord_gcs_mps_item.custrecord_gcs_mps_item_bom_item = customrecord_gcs_bom_item.id ' +
            'LEFT OUTER JOIN item ON customrecord_gcs_bom_item.custrecord_gcs_bom_item_part = item.id ' +   
            'WHERE custrecord_gcs_mps_item_project = ? AND customrecord_gcs_bom_item.custrecord_gcs_bom_item_co IS NULL';              
                
            var results = query.runSuiteQL({ query: sql, params: [ result.id ] }).asMappedResults();    
            
            if(results.length == 0) {

                // no mps no score
                //log.audit('No MPS Found', result.values['altname']);
                return; 
            }
            results.forEach(function(result) {            

                mps.push({
                    part: result.part,
                    bom_id: result.bom_id,
                    commodity_category: result.commodity_category,
                    quantity: result.quantity,
                    date_production: result.date_production,
                    date_ship: result.date_ship,
                    date_site_arrival: result.date_site_arrival
                });
            }); 

            // get ps
            var ps = [];
           
            var sql = 'SELECT customrecord_gcs_ps_item.custrecord_gcs_ps_item_bom_item AS bom_id, ' +
            'customrecord_gcs_ps_item.custrecord_gcs_ps_item_quantity AS quantity, ' +                    
            'customrecord_gcs_ps_item.custrecord_gcs_ps_item_po AS po_id, ' +
            'customrecord_gcs_ps_item.custrecord_gcs_ps_item_quantity_actual AS quantity_actual, ' +
            'customrecord_gcs_ps_item.custrecord_gcs_ps_item_prod_date AS date_production, ' + 
            'customrecord_gcs_ps_item.custrecord_gcs_ps_item_prod_date_adj AS date_production_adjusted, ' +
            'customrecord_gcs_ps_item.custrecord_gcs_ps_item_prod_date_actual AS date_production_actual, ' +
            'FROM customrecord_gcs_ps_item ' +          
            'WHERE custrecord_gcs_ps_item_project = ? AND customrecord_gcs_ps_item.custrecord_gcs_ps_item_quantity_actual > 0';

            var results = query.runSuiteQL({ query: sql, params: [ result.id ]  }).asMappedResults();            
            results.forEach(function(result) {              

                ps.push({
                    part: result.part,
                    part_id: result.part_id,
                    bom_id: result.bom_id,
                    po_id: result.po_id,
                    quantity: result.quantity,
                    quantity_actual: result.quantity_actual,
                    date_production: (result.date_production_adjusted) ? result.date_production_adjusted : result.date_production,
                    date_production_actual: result.date_production_actual
                });
            });   

            // get ds
            var ds = [];

            var sql = 'SELECT ' +
            'customrecord_gcs_ds_item.id AS ds_id, ' +
            'customrecord_gcs_ds_item.custrecord_gcs_ds_item_bom_item AS bom_id, ' +                            
            'customrecord_gcs_ds_item.custrecord_gcs_ds_item_quantity AS quantity, ' +
            'customrecord_gcs_ds_item.custrecord_gcs_ds_item_quantity_actual AS quantity_actual, ' +
            'customrecord_gcs_ds_item.custrecord_gcs_ds_item_part_weight AS weight, ' +
            'customrecord_gcs_ds_item.custrecord_gcs_ds_item_ship_date AS date_ship, ' +
            'customrecord_gcs_ds_item.custrecord_gcs_ds_item_site_date AS date_site_arrival, ' +
            'customrecord_gcs_ds_item.custrecord_gcs_ds_item_site_actual AS date_site_arrival_actual, ' +
            'customrecord_gcs_ds_item.custrecord_gcs_ds_item_ship_actual AS date_ship_actual, ' +
            'customrecord_gcs_ds_item.custrecord_gcs_ds_item_port_pick_date AS date_domestic_pickup, ' +
            'customrecord_gcs_ds_item.custrecord_gcs_ds_item_type AS type, ' +         
            'FROM customrecord_gcs_ds_item ' +                          
            'WHERE custrecord_gcs_ds_item_project = ? AND customrecord_gcs_ds_item.custrecord_gcs_ds_item_quantity_actual > 0';

            var results = query.runSuiteQL({ query: sql, params: [ result.id ] }).asMappedResults();            
            results.forEach(function(result) {              

                ds.push({
                    bom_id: result.bom_id,
                    quantity: result.quantity,
                    quantity_actual: result.quantity_actual,
                    date_ship: result.date_ship,
                    date_site_arrival: result.date_site_arrival,
                    date_site_arrival_actual: result.date_site_arrival_actual
                });
            });                              

            var bom_items = {};       
            var dates = [];                                    

            var filtered_classes = [];
                
            mps.forEach(function(item) {              
               
                if(item.date_site_arrival && dates.indexOf(item.date_site_arrival) == -1) {
                    dates.push(item.date_site_arrival);   
                }   
                
                if(item.date_production && dates.indexOf(item.date_production) == -1) {
                    dates.push(item.date_production);   
                }   

                if(!bom_items[item.bom_id]) {
                    bom_items[item.bom_id] = { bom_id: item.bom_id, part: item.part, part_description: item.part_description, commodity_category: item.commodity_category, change_order_number: item.change_order_number, project: item.project_name, project_status: item.project_status, mps: [], ps: [], ds: [] }
                }          

                bom_items[item.bom_id].mps.push(item);                     
                
                if(filtered_classes.indexOf(item.commodity_category) == -1) {
                    filtered_classes.push(item.commodity_category);
                }
            });  
            
            filtered_classes = filtered_classes.sort();

            dates = dates.sort(function(a, b) {
                return dayjs(a).valueOf() - dayjs(b).valueOf();
            }); 

            if(dayjs(dates[0]).valueOf() < dayjs('1/1/2023')) {

                // exclude old projects
                //log.audit('', 'excluding old project');
                return;
            }

            // get weeks
            var weeks = [];

            // move first day back to sunday            
            var start_week = dayjs(dates[0]);                     

            while (start_week.format('dddd') != 'Sunday') {
                start_week = start_week.subtract(1, 'day');
            }

            var view_start_week = start_week.subtract(1, 'day');

            var end_week = dayjs(dates[dates.length - 1]);

            // limit just to be safe 
            for (var i = 0; i < 200; i++) {

                weeks.push({
                    start: start_week,
                    end: start_week.add(6, 'day')
                });

                start_week = start_week.add(7, 'days');

                if (start_week.valueOf() > end_week.valueOf()) {

                    // push one more week and break
                    weeks.push({
                        start: start_week,
                        end: start_week.add(6, 'day')
                    });
                                    
                    break;
                }
            }

            var class_groups = {};
            filtered_classes.forEach(function(class_header) {                

                for(var i = 0; i < Object.keys(bom_items).length; i++) {            
                    if(bom_items[Object.keys(bom_items)[i]].commodity_category == class_header) {
                        
                        if(!class_groups[class_header]) {
                            class_groups[class_header] = [];
                        }

                        class_groups[class_header].push(bom_items[Object.keys(bom_items)[i]]);
                    }
                }
            });  
            
            // for each bom item cumulate qts under dates
            var total_scores_delivery = [];
            var total_scores_production = [];
            
            var score_breakdown = {};
           
            Object.keys(class_groups).forEach(function(class_header) {

                if(class_header == 'Electronics') { return; }

                var commodity_scores_delivery = [];   
                var commodity_scores_production = [];

                for(var i = 0; i < class_groups[class_header].length; i++) {                                               
                    
                    var bom_item = class_groups[class_header][i];   
                    var bom_id = bom_item.bom_id;                         

                    if(bom_item.change_order_number) { continue; }

                    ds.forEach(function(d) {

                        if(d.bom_id == bom_id) {                         
                            bom_item.ds.push(d);
                        }
                    });   
                    
                    ps.forEach(function(p) {
                        if(p.bom_id == bom_id) {
                            bom_item.ps.push(p);
                        }
                    })

                    // sort by data set
                    var mps_delivery = bom_item.mps.sort(function(a, b) {
                        return dayjs(a.date_site_arrival).valueOf() - dayjs(b.date_site_arrival).valueOf();
                    });   
                    
                    var comparison_delivery = bom_item.ds.sort(function(a, b) {
                        return dayjs(a.date_site_arrival).valueOf() - dayjs(b.date_site_arrival).valueOf();
                    });         

                    var mps_production = bom_item.mps.sort(function(a, b) {
                        return dayjs(a.date_production).valueOf() - dayjs(b.date_production).valueOf();
                    });   
                    
                    var comparison_production = bom_item.ps.sort(function(a, b) {
                        return dayjs(a.date_production).valueOf() - dayjs(b.date_production).valueOf();
                    });       
                  
                    var bom_total_delivery = 0;
                    for(var j = 0; j < mps_delivery.length; j++) {                                                     
                        bom_total_delivery += mps[j].quantity;                                                                
                    }

                    var bom_total_production = 0;
                    for(var j = 0; j < mps_production.length; j++) {                                                     
                        bom_total_production += mps_production[j].quantity;                                                                
                    }                    

                    var scores_delivery = [];  
                    var scores_production = [];                  
                    
                    var delivered = false;
                    var produced = false;
                    weeks.forEach(function(w) {
                        
                        if(w.end.valueOf() > view_start_week.valueOf()) {                            

                            var project_total_delivery = 0;
                            var week_total_delivery = 0;
                            comparison_delivery.forEach(function(c) {

                                if(dayjs(c.date_site_arrival).valueOf() <= w.end.valueOf()) {
                                    project_total_delivery += c.quantity_actual;
                                }

                                if(dayjs(c.date_site_arrival).valueOf() >= w.start.valueOf() && dayjs(c.date_site_arrival).valueOf() <= w.end.valueOf()) {
                                    week_total_delivery += c.quantity_actual;
                                }
                            });                            

                            // get % 
                            var mps_total_delivery = 0;                                                       
                            for(var i = 0; i < mps_delivery.length; i++) {
                                
                                if(dayjs(mps_delivery[i].date_site_arrival).valueOf() <= w.end.valueOf()) {
                                    mps_total_delivery += mps_delivery[i].quantity;
                                }                                                                  
                            }

                            if(mps_total_delivery > 0 && !delivered) {                               

                                var p_compare = (project_total_delivery * 100) / mps_total_delivery;        
                                
                                if(!p_compare) { p_compare = '' }
                                else if(p_compare > 100) {
                                    p_compare = 100;
                                }
                                p_compare = Math.round(p_compare);
                                                                
                                if(dayjs().valueOf() < w.end.valueOf()) { 
                                }
                                else {
                                    scores_delivery.push(p_compare);                                                        
                                }
                            }                                                         

                            if(mps_total_delivery >= bom_total_delivery) { delivered = true; }

                            // production
                            var project_total_production = 0;
                            var week_total_production = 0;
                            comparison_production.forEach(function(c) {

                                if(dayjs(c.date_production_actual).valueOf() <= w.end.valueOf()) {
                                    project_total_production += c.quantity_actual;
                                }

                                if(dayjs(c.date_production_actual).valueOf() >= w.start.valueOf() && dayjs(c.date_production_actual).valueOf() <= w.end.valueOf()) {
                                    week_total_production += c.quantity_actual;
                                }
                            });                            

                            // get % 
                            var mps_total_production = 0;                                                       
                            for(var i = 0; i < mps_production.length; i++) {
                                
                                if(dayjs(mps_production[i].date_production).valueOf() <= w.end.valueOf()) {
                                    mps_total_production += mps_production[i].quantity;
                                }                                                                  
                            }

                            if(mps_total_production > 0 && !produced) {    

                                var p_compare = (project_total_production * 100) / mps_total_production;        
                                
                                if(!p_compare) { p_compare = '' }
                                else if(p_compare > 100) {
                                    p_compare = 100;
                                }
                                p_compare = Math.round(p_compare);
                                 
                                if(dayjs().valueOf() < w.end.valueOf()) {
                                }
                                else {

                                    scores_production.push(p_compare);                                                        
                                }
                            }                            

                            if(mps_total_production >= bom_total_production) { 
                                produced = true; 
                            }                            
                        }
                    });   
                    
                    if(scores_delivery.length) {

                        var total_score = 0;
                        scores_delivery.forEach(function(s) {
                            total_score += s;
                        });

                        var item_score = Math.round(total_score / scores_delivery.length);

                        total_scores_delivery.push(item_score);
                        commodity_scores_delivery.push(item_score);                   
                    }                      

                    if(scores_production.length) {

                        var total_score = 0;
                        scores_production.forEach(function(s) {
                            total_score += s;
                        });

                        var item_score = Math.round(total_score / scores_production.length);

                        total_scores_production.push(item_score);
                        commodity_scores_production.push(item_score);                   
                    }                                                           
                }
                
                if(commodity_scores_delivery.length) {

                    var commodity_score_sum = 0;
                    commodity_scores_delivery.forEach(function(s) {
                        commodity_score_sum += s;
                    });

                    var commodity_score = Math.round(commodity_score_sum / commodity_scores_delivery.length); 

                    if(!score_breakdown[class_header]) {
                        score_breakdown[class_header] = {
                            production: 0,
                            delivery: 0
                        }
                    }
                    
                    score_breakdown[class_header].delivery = commodity_score;
                }            

                if(commodity_scores_production.length) {

                    log.audit('CSP', commodity_scores_production);

                    var commodity_score_sum = 0;
                    commodity_scores_production.forEach(function(s) {
                        commodity_score_sum += s;
                    });

                    var commodity_score = Math.round(commodity_score_sum / commodity_scores_production.length); 
                    
                    if(!score_breakdown[class_header]) {
                        score_breakdown[class_header] = {
                            production: 0,
                            delivery: 0
                        }
                    }

                    score_breakdown[class_header].production = commodity_score;
                }                
            });

            log.audit('total scores delivery', total_scores_delivery);
            log.audit('total scores production', total_scores_production);

            var total_score_sum = 0;
            total_scores_delivery.forEach(function(s) {
                total_score_sum += s;
            });

            var score_delivery = Math.round(total_score_sum / total_scores_delivery.length);        
            
            total_score_sum = 0;
            total_scores_production.forEach(function(s) {
                total_score_sum += s;
            });

            var score_production = Math.round(total_score_sum / total_scores_production.length);             

            var p = record.load({
                type: record.Type.JOB,
                id: result.id
            });

            p.setValue({ fieldId: 'custentity_gcs_otscore_delivery', value: score_delivery });
            p.setValue({ fieldId: 'custentity_gcs_otscore_production', value: score_production });
            p.setValue({ fieldId: 'custentity_gcs_ontime_score_cs', value: JSON.stringify(score_breakdown)});            
        
            p.save();
           
        }
        catch(e) {                                
            log.audit('Map Error on', result);
            log.audit('Error of previous', e);
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