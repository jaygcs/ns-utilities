/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 */
 define([ 'SuiteScripts/GCS/composer' ], function(html) {            
    
    return {

        beforeLoad: function(context) {   

            if(context.type === context.UserEventType.VIEW || context.type === context.UserEventType.EDIT) {    

                html.init(context, 'gcs_pds', false);  

                context.form.addButton({
                    id: 'custpage_button_pds',
                    label: 'Production & Delivery System',
                    functionName: 'openPDS(' + context.newRecord.id + ')'
                });
            }         
        }
    }
});