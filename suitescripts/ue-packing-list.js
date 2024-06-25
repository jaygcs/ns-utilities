/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define([ 'N/search', 'N/runtime', 'SuiteScripts/GCS/composer', 'SuiteScripts/GCS/config' ], function(search, runtime, html, config) {            
    
    return {

        beforeLoad: function(context) {   

            // only execute for view/edit
            if(context.type === context.UserEventType.VIEW) {                

                // show project integration
                var container = 'custpage_gcs_packing_list';
                context.form.addFieldGroup({
                    id: container,
                    label: 'GameChange Primary'
                }); 
    
                html.init(context, container);                 
                             
                if(context.newRecord.getValue('custrecord_gcs_packing_list_if')) {

                    html.render({
                        content:  '<div style="margin-top: 10px; margin-bottom: 10px;">' + html.button({
                            id: 'create-if',
                            href: '/app/accounting/transactions/itemship.nl?id=' + context.newRecord.getValue('custrecord_gcs_packing_list_if') + '&e=T',
                            tab: true,
                            title: 'Update ' + context.newRecord.getText('custrecord_gcs_packing_list_if')
                        }) + '</div>'
                    });
                }
                else {

                    html.render({
                        content:  '<div style="margin-top: 10px; margin-bottom: 10px;">' + html.button({
                            id: 'update-if',
                            href: config.CLIENT_SL + '&view=ds-fulfillment&packing_list_id=' + context.newRecord.id + '&project_id=' + context.newRecord.getValue('custrecord_gcs_packinglist_project'),
                            tab: true,
                            title: '+ Create Fulfillment'
                        }) + '</div>'
                    });
                }
                                     
            }
        }
    }
});