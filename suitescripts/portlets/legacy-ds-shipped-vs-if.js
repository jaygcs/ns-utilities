/**
 *@NApiVersion 2.x
 *@NScriptType Portlet
 */
 define([ 'N/search' ], function(search) {
    
    return { 
        
        render: function(params) {

            var portlet = params.portlet;
            
            portlet.addColumn({
                id: 'project',
                type: 'text',
                label: 'Project',
                align: 'LEFT'
            });

            portlet.addColumn({
                id: 'sales_order',
                type: 'text',
                label: 'Sales Order',
                align: 'LEFT'
            });            

            portlet.addColumn({
                id: 'shipped_planned',
                type: 'integer',
                label: 'Shipped Planned',
                align: 'LEFT'
            });

            portlet.addColumn({
                id: 'shipped_actual',
                type: 'integer',
                label: 'Shipped Actual',
                align: 'LEFT'
            });

            portlet.addColumn({
                id: 'fulfilled',
                type: 'integer',
                label: 'Fulfilled',
                align: 'LEFT'
            });

            //"id":"406","values":{"custrecord_gcs_delivery_sched_project":[{"value":"4973","text":"1108 BV : Blue Springs, FL"}],"custrecord_gcs_quantity_shipped_planned":"","custrecord_gcs_total_qty_shipped_on_ds":"","custrecord_gsc_sales_order_list":[{"value":"19685","text":"Sales Order #8737"}]}}
            
            var csearch = search.load({
                id: 'customsearch_gcs_legacy_ds_vs_if'
            }); 

            // split size so we don't reach NS resource limits
            var size = 1000;
            var paged = csearch.runPaged({
                pageSize: size
            });            

            var data = [];

            for(var i = 0; i < (paged.count / size); i++) {

                var page = paged.fetch({ index: i });

                page.data.forEach(function(result) {                   
                    data.push(result);              
                });                                  
            }

            csearch = search.load({
                id: 'customsearch_gcs_legacy_ds_vs_if_so'
            }); 

            // split size so we don't reach NS resource limits
            size = 1000;
            paged = csearch.runPaged({
                pageSize: size
            });            

            var so_data = [];

            for(var i = 0; i < (paged.count / size); i++) {

                var page = paged.fetch({ index: i });

                page.data.forEach(function(result) {                   
                    so_data.push(result);              
                });                                  
            }

            var sales_orders = {};
            for(i = 0; i < so_data.length; i++) {

                if(!sales_orders[so_data[i].id]) {
                    sales_orders[so_data[i].id] = {
                        fulfilled: 0
                    }
                }

                sales_orders[so_data[i].id].fulfilled += Number(so_data[i].getValue('quantityshiprecv'));
            }

            var projects = {};            
            for(var i = 0; i < data.length; i++) {

                if(!projects[data[i].getText('custrecord_gcs_delivery_sched_project')]) {
                    projects[data[i].getText('custrecord_gcs_delivery_sched_project')] = {
                        shipped_planned: 0,
                        shipped_actual: 0,
                        sales_order_id: data[i].getValue('custrecord_gsc_sales_order_list'),
                        sales_order_name: data[i].getText('custrecord_gsc_sales_order_list')
                    };
                }

                projects[data[i].getText('custrecord_gcs_delivery_sched_project')].shipped_planned += Number(data[i].getValue('custrecord_gcs_quantity_shipped_planned'));
                projects[data[i].getText('custrecord_gcs_delivery_sched_project')].shipped_actual += Number(data[i].getValue('custrecord_gcs_total_qty_shipped_on_ds'));                
            }

            Object.keys(projects).forEach(function(key) {

                // find fulfillment qty for this sales order
                var fulfilled = 0;
                if(sales_orders[projects[key].sales_order_id]) {
                    fulfilled = sales_orders[projects[key].sales_order_id].fulfilled;
                }

                portlet.addRow({
                    project: key,                    
                    sales_order: '<a href="/app/accounting/transactions/salesord.nl?id=' + projects[key].sales_order_id + '&whence=" target="_BLANK">' + projects[key].sales_order_name + '</a>',                    
                    shipped_planned: Math.round(Number(projects[key].shipped_planned)).toLocaleString(),
                    shipped_actual: Math.round(Number(projects[key].shipped_actual)).toLocaleString(),
                    fulfilled: Math.round(Number(fulfilled)).toLocaleString()
                });

            });

            portlet.title = 'Projects Legacy DS vs IF';
        }
    }
});