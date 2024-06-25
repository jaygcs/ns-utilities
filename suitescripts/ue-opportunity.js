/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 */
define([ 'SuiteScripts/GCS/composer', 'N/record', 'N/runtime', 'N/query' ], function(html, record, runtime, query) {            
    
    return {

        beforeSubmit: function(context) {

            if(context.type === context.UserEventType.CREATE || context.type === context.UserEventType.EDIT) {

                if(context.newRecord.getValue('custbody_gcs_no_posts')) {

                    // this project has no posts, use the racking date as the mirror
                    context.newRecord.setValue({ fieldId: 'custbody_gcs_billing_terms', value: 'no posts change racking' });

                    // start date changed, set the racking date to start date
                    context.newRecord.setValue({ fieldId: 'custbody_gcs_racking_date_req', value: context.newRecord.getValue('custbody_gcs_estimated_start_date') });
                }
                else {

                    // this project has posts, use the post date as the mirror                    
                    context.newRecord.setValue({ fieldId: 'custbody_gcs_billing_terms', value: 'has posts change posts' });

                    // start date changed, set the post date to start date
                    context.newRecord.setValue({ fieldId: 'custbody_gcs_post_date_req', value: context.newRecord.getValue('custbody_gcs_estimated_start_date') });
                }                   
                
            }
        
        },

        afterSubmit: function(context) {     

            if(context.newRecord.id) {

                // do the same thing for when an opportunity goes to 75% except don't close out the other opps
                
                if(
                    (context.newRecord.getValue('entitystatus') == 38 || context.newRecord.getValue('entitystatus') == 36) &&
                    context.oldRecord.getValue('entitystatus') != 38 && context.oldRecord.getValue('entitystatus') != 36
                    ) {

                    // if something is marked won or LOI, clear out any primary opportunity
                    if(context.newRecord.getValue('custbody_gcs_primary_opportunity')) {

                        // this is now the primary, clear out reference to other opp
                        record.submitFields({
                            type: record.Type.OPPORTUNITY,
                            id: context.newRecord.id,
                            values: {
                                custbody_gcs_primary_opportunity: ''
                            }
                        });

                        // get all other opportunities pointing to the same as it's primary (reverse the primary and close it out) 
                        var sql = 'SELECT id FROM transaction where custbody_gcs_primary_opportunity = ? OR id = ?';
                        var results = query.runSuiteQL({ query: sql, params: [ context.newRecord.getValue('custbody_gcs_primary_opportunity'), context.newRecord.getValue('custbody_gcs_primary_opportunity') ]}).asMappedResults();
                        results.forEach(function(r) {
                            record.submitFields({
                                type: record.Type.OPPORTUNITY,
                                id: r.id,
                                values: {
                                    custbody_gcs_primary_opportunity: context.newRecord.id,
                                    probability: 0,
                                    winlossreason: 1,
                                    entitystatus: 14
                                }
                            });
                        });

                    }
                    else {

                        // see if any other opportunities were pointing to this as a primary, if so close them out
                        var sql = 'SELECT id FROM transaction where custbody_gcs_primary_opportunity = ?';
                        var results = query.runSuiteQL({ query: sql, params: [ context.newRecord.id ]}).asMappedResults();
                        results.forEach(function(r) {
                            record.submitFields({
                                type: record.Type.OPPORTUNITY,
                                id: r.id,
                                values: {
                                    winlossreason: 1,
                                    probability: 0,
                                    entitystatus: 14
                                }
                            });
                        });
                    }

                }
                else if(context.oldRecord && context.oldRecord.getValue('probability') < 75 && context.newRecord.getValue('probability') >= 75) {

                    if(context.newRecord.getValue('custbody_gcs_primary_opportunity')) {

                        // this is now the primary, clear out reference to other opp
                        record.submitFields({
                            type: record.Type.OPPORTUNITY,
                            id: context.newRecord.id,
                            values: {
                                custbody_gcs_primary_opportunity: ''
                            }
                        });

                        // get all other opportunities pointing to the same as it's primary (reverse the primary) 
                        var sql = 'SELECT id FROM transaction where custbody_gcs_primary_opportunity = ? OR id = ?';
                        var results = query.runSuiteQL({ query: sql, params: [ context.newRecord.getValue('custbody_gcs_primary_opportunity'), context.newRecord.getValue('custbody_gcs_primary_opportunity') ]}).asMappedResults();
                        results.forEach(function(r) {
                            record.submitFields({
                                type: record.Type.OPPORTUNITY,
                                id: r.id,
                                values: {
                                    custbody_gcs_primary_opportunity: context.newRecord.id
                                }
                            });
                        });
                    }

                }                
                   
                if(
                    context.newRecord.getValue('custbody_gcs_quote_due_date') && 
                    context.oldRecord &&
                    context.oldRecord.getValue('custbody_gcs_pipeline_status') != context.newRecord.getValue('custbody_gcs_pipeline_status')) {                                              

                    // record kpi status change
                    var cycle = record.create({
                        type: 'customrecord_gcs_opp_quote_cycle'
                    });

                    cycle.setValue({ fieldId: 'custrecord_gcs_oqc_due', value: new Date(context.newRecord.getValue('custbody_gcs_quote_due_date')) });
                    
                    cycle.setValue({ fieldId: 'custrecord_gcs_oqc_status_change_date', value: new Date() });
                    cycle.setValue({ fieldId: 'custrecord_gcs_oqc_user', value: runtime.getCurrentUser().id });

                    cycle.setValue({ fieldId: 'custrecord_gcs_oqc_status_from', value: context.oldRecord.getValue('custbody_gcs_pipeline_status') });
                    cycle.setValue({ fieldId: 'custrecord_gcs_oqc_status_to', value: context.newRecord.getValue('custbody_gcs_pipeline_status') });

                    cycle.setValue({ fieldId: 'custrecord_gcs_oqc_opportunity', value: context.newRecord.id });

                    if(context.newRecord.getValue('custbody_gcs_pipeline_status') == 4) {

                        // quoted, record and start new cycle

                        cycle.setValue({ fieldId: 'custrecord_gcs_oqc_completed', value: new Date() });

                        var opp = record.load({
                            type: record.Type.OPPORTUNITY,
                            id: context.newRecord.id
                        });

                        opp.setValue({ fieldId: 'custbody_gcs_cpq_calcs', value: false });
                        opp.setValue({ fieldId: 'custbody_gcs_se_review', value: false });
                        opp.setValue({ fieldId: 'custbody_gcs_se_review_complete', value: false });
                        opp.setValue({ fieldId: 'custbody_gcs_quote_completed', value: false });

                        opp.setText({ fieldId: 'custbody_gcs_quote_due_date', text: '' });
                        opp.setText({ fieldId: 'custbody_gcs_quote_type', text: '' });
                        opp.setText({ fieldId: 'custbody_gcs_geotech_review', text: '' });

                        opp.save();                            
                    }

                    cycle.save();   
                } 
                
            }
        },

        beforeLoad: function(context) {   

            if(context.type === context.UserEventType.VIEW || context.type === context.UserEventType.EDIT) {    

                if(!context.newRecord.getValue('job')) {

                    html.init(context, 'gcs_pds_convert_opp');                  

                    context.form.addButton({
                        id: 'custpage_button_pds_convert_opp',
                        label: 'Save As New Project',
                        functionName: 'convertOpp(' + context.newRecord.id + ')'
                    });
                }
            }
         
        }
    }
});