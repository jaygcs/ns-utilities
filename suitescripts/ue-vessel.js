/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 */
define([ 'SuiteScripts/GCS/composer', 'SuiteScripts/GCS/format', 'N/ui/serverWidget' ], function(html, format, widget) {            
    
    return {   

        beforeLoad: function(context) {   

            if(context.type === context.UserEventType.VIEW) {    

                var container = 'gcs_custom_costs';
                context.form.addFieldGroup({
                    id: container,
                    label: '<hr/>'
                });       
                
                var breakdown = JSON.parse(context.newRecord.getValue('custrecord_gcs_vessel_cost_breakdown'));

                html.init(context, container, true);  

                var grand_total_weight = 0;
                breakdown.weight_lines_by_project.forEach(function(l) {

                    grand_total_weight += Number(l.total_weight);
                });

                var cost_lines = breakdown.cost_lines.sort(function(a, b) {
                    return (b.rate * b.quantity) - (a.rate * a.quantity);
                });
                
                var table = { bordered: true };
                table.rows = [];

                var total_cost = 0;
                cost_lines.forEach(function(l) {

                    total_cost += Number(l.quantity * l.rate)

                    table.rows.push(
                        [ '<a target=\'_BLANK\' href=\'/app/accounting/transactions/purchord.nl?id=' + l.po_id + '\'>' + l.po_number + '</a>', l.item, l.quantity, format.money(l.rate), format.money(l.quantity * l.rate) ]
                    );
                });

                if(table.rows.length) {

                    table.rows.push(
                        [ '', '', '', html.strong('Total Cost'), html.strong(format.money(total_cost)) ]
                    );

                    table.rows.push(
                        [ '', '', '', html.strong('Total Weight (lbs)'), html.strong(format.number(grand_total_weight)) ]
                    );                                   

                    table.rows.push(
                        [ '', '', '', html.strong('Total Weight (mt)'), html.strong(format.number(format.lb2mt(grand_total_weight))) ]
                    );                   

                    table.rows.push(
                        [ '', '', '', html.strong('Cost per mt'), html.strong(format.money(total_cost / format.lb2mt(grand_total_weight))) ]
                    );     
                }

                else {
                    table.rows.push([ 'No POs have been captured for this vessel' ]);
                }

                html.render({
                    content: html.card({
                        title: 'PO Breakdown',
                        details: html.table(table)
                    })
                });   

                var table = { bordered: true };
                table.rows = [];

                var weight_lines = breakdown.weight_lines_by_project.sort(function(a, b) {
                    return b.total_weight - a.total_weight;
                });               

                weight_lines.forEach(function(l) {

                    table.rows.push(
                        [ l.project_name, format.number(l.total_weight) + ' lbs', format.number(l.total_weight / 2204.6) + ' mt', format.money(l.total_weight * context.newRecord.getValue('custrecord_gcs_vessel_cost_per_lb')), format.number((l.total_weight * 100) / grand_total_weight) + '%' ]
                    );
                });

                if(!table.rows.length) {
                    table.rows.push([ 'No items have been assigned to this vessel' ]);
                }
                
                html.render({
                    content: html.card({
                        title: 'Project Weight and Cost Breakdown',
                        details: html.table(table)
                    })
                });                  

                container = 'gcs_break';
                context.form.addFieldGroup({
                    id: container,
                    label: '<hr/>'
                }); 
                
                html.init(context, container);

                html.render({
                    content: ''
                });   

            }
        }
    }
});