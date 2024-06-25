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
                var container = 'custpage_gcs_projects';
                context.form.addFieldGroup({
                    id: container,
                    label: 'GameChange Projects'
                }); 
    
                html.init(context, container);           

                var user = runtime.getCurrentUser();       
                
                var table = {};
                table.bordered = true;
                table.headers = [ 'Name', 'Created', 'Status', 'Size' ];
                table.rows = [];
                
                var csearch = search.create({
                    type: search.Type.JOB,
                    columns: [ { name: 'internalid', sort: search.Sort.DESC }, 'datecreated', 'entityid', 'entitystatus', 'companyname', 'custentity4', 'custentity_gcs_fulfillment_so' ],
                    filters: [
                        [ 'parent', 'is', context.newRecord.id ]
                    ]            
                }); 

                csearch.run().each(function(result) {  

                    if(result.getValue('custentity_gcs_fulfillment_so')) {

                        table.rows.push([
                            '<a href="/app/accounting/project/project.nl?id=' + result.getValue('internalid') + '" target="_BLANK">' + result.getValue('entityid') + ' ' + result.getValue('companyname') + '</a>',
                            result.getValue('datecreated').split(/ /).shift(),
                            result.getText('entitystatus'),
                            result.getValue('custentity4')
                        ]);
                    }

                    return true;
                }); 

                html.render({
                    content: '<div style="margin-top: 10px; margin-bottom: 10px;">' + html.button({
                        id: 'create-project',
                        click: 'completeOperation()',
                        title: '+ Create a new Project'
                    }) + '</div>'
                });

                html.render({
                    break: true,
                    content: html.table(table) 
                });   
                
                html.render({
                    break: true,
                    content: '<br /><br /><hr />'
                });
                
            }
        }
    }
});