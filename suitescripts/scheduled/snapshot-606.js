/**
 *@NApiVersion 2.x
 *@NScriptType ScheduledScript
 */
 define([ 'N/search', 'N/file', 'N/query' ], function(search, file, query) {

    return {

        execute: function(context) {  
           
            var csearch = search.load({
                id: 'customsearch_gcs_cache_606_if_ir'
            });

            var size = 1000;
            var paged = csearch.runPaged({
                pageSize: size
            });      
            
            var data = [];

            for(var i = 0; i < (paged.count / size); i++) {

                var page = paged.fetch({ index: i });

                page.data.forEach(function(result) {      
                    
                    if(result.getValue('amount') == 0) { return; }
                    
                    var amount = result.getValue('amount');

                    if(amount < 0 && result.getText('type') == 'Item Fulfillment') {
                        amount = Math.abs(amount);
                    }

                    data.push({
                        document_number: result.getValue('tranid'),
                        date: result.getValue('trandate'),
                        item: result.getText('item'),
                        description: result.getValue({ join: 'item', name: 'description' }),
                        quantity: Math.abs(result.getValue('quantity')),   
                        location: result.getText('location'),
                        amount: amount
                    });                                                
                });                                  
            }  
            
            var map = {};
            data.forEach(function(d) {

                if(d.item && d.location && d.quantity && d.amount) {

                    var key = d.item + ' - ' + d.location;

                    if(!map[key]) {
                        map[key] = {
                            weighted_average: 0,
                            data: []
                        };
                    }    

                    map[key].data.push({
                        document_number: d.document_number,
                        date: d.date,   
                        quantity: d.quantity,
                        amount: d.amount,
                        rate: d.rate,
                        type: d.type
                    });
                }              
            });

            Object.keys(map).forEach(function(key) {

                // calculate weighted average
                var total_amount = 0;
                var total_quantity = 0;

                map[key].data.forEach(function(d) {
                    total_amount += Number(d.amount);
                    total_quantity += Number(d.quantity);
                });

                map[key].weighted_average = total_amount / total_quantity;              
            });

            var f = file.create({
                name: '606-cost-item-location.json',
                fileType: file.Type.JSON,
                contents: JSON.stringify(map),
                folder: 50712
            });

            f.save();               

            var csearch = search.load({
                id: 'customsearch_gcs_cache_606_so'
            });

            var size = 1000;
            var paged = csearch.runPaged({
                pageSize: size
            });      
            
            var sales_order_data = [];

            for(var i = 0; i < (paged.count / size); i++) {

                var page = paged.fetch({ index: i });

                page.data.forEach(function(result) {                                                            

                    sales_order_data.push({
                        sales_order_number: result.getValue('tranid'),
                        date: result.getValue('trandate'),
                        project: result.getText('entity'),
                        project_id: result.getValue('entity'),
                        item: result.getText('item'),
                        quantity: result.getValue('quantity'),   
                        location: result.getText('location'),
                        committed: result.getValue('quantitycommitted'),
                        fulfilled: result.getValue('quantityshiprecv'),
                        average_cost: result.getValue({ join: 'item', name: 'averagecost' }),
                        project_manager: result.getValue({ join: 'job', name: 'custentity_gcs_project_pm' }),
                        closed: result.getValue('closed'),
                        amount: result.getValue('amount'),                        
                        type: result.getText('custbody_gcs_sotype'),
                        produced_cost: 0
                    });                        
                        
                });                                  
            }           
            
            var f = file.create({
                name: '606-sales-order-lines.json',
                fileType: file.Type.JSON,
                contents: JSON.stringify(sales_order_data),
                folder: 50712
            });
            
            f.save(); 

            var csearch = search.load({
                id: 'customsearch_gcs_cache_606_cosa'
            });

            var size = 1000;
            var paged = csearch.runPaged({
                pageSize: size
            });      
            
            var cosa_data = [];

            for(var i = 0; i < (paged.count / size); i++) {

                var page = paged.fetch({ index: i });

                page.data.forEach(function(result) {                                                            

                    cosa_data.push({
                        type: result.getText('type'),
                        document_number: result.getValue('tranid'),
                        date: result.getValue('trandate'),
                        project: result.getText('entity'),
                        item: result.getText('item'),                        
                        location: result.getText('location'),
                        amount: result.getValue('amount')
                    });                        
                        
                });                                  
            }           
            
            var f = file.create({
                name: '606-cos-adjustments.json',
                fileType: file.Type.JSON,
                contents: JSON.stringify(cosa_data),
                folder: 50712
            });
            
            f.save();     
            
            // get pos with query
            var purchase_order_data = [];
            var stats = query.runSuiteQL({ query: 'SELECT COUNT(transactionLine.transaction) AS total FROM transactionLine LEFT OUTER JOIN transaction ON transaction.id = transactionline.transaction where transaction.type = ? AND transaction.trandate >= to_date(\'01/01/2022\', \'MM/DD/YYYY\')', params: [ 'PurchOrd' ] }).asMappedResults();
            var total = stats[0].total;

            var limit = 5000;
            var offset = 0;

            for (var i = offset; i < total; i += limit) {

                var sql = 'SELECT transaction.id, transaction.trandate AS date, transaction.tranid AS purchase_order_number, transactionline.itemsource AS itemsource, transaction.entity AS vendor_id, BUILTIN.DF(transaction.entity) AS vendor_name, ' +
                'BUILTIN.DF(transactionline.item) AS item, transactionline.quantity, transactionline.rate, ' +
                'BUILTIN.DF(transactionline.entity) AS project, transactionline.entity AS project_id, BUILTIN.DF(transactionLine.location) AS location_name ' +
                'FROM transaction LEFT OUTER JOIN transactionline ON transaction.id = transactionline.transaction ' + 
                'WHERE transaction.type = ? AND transaction.trandate >= to_date(\'06/01/2022\', \'MM/DD/YYYY\') ' +
                'ORDER BY transaction.id DESC';

                sql = 'SELECT * FROM(SELECT ROWNUM AS RN, * FROM(' + sql + ')) WHERE (RN BETWEEN ' + i + ' AND ' + (i + limit) + ')';

                var results = query.runSuiteQL({ query: sql, params: [ 'PurchOrd' ]}).asMappedResults();
                results.forEach(function (result) {
                    purchase_order_data.push(result);
                });
            }      
            
            var f = file.create({
                name: '606-purchase-order-lines.json',
                fileType: file.Type.JSON,
                contents: JSON.stringify(purchase_order_data),
                folder: 50712
            });
            
            f.save(); 
            
            var csearch = search.load({
                id: 'customsearch_gcs_cache_606'
            });

            var size = 1000;
            var paged = csearch.runPaged({
                pageSize: size
            });      
            
            var fulfillment_data = [];

            for(var i = 0; i < (paged.count / size); i++) {

                var page = paged.fetch({ index: i });

                page.data.forEach(function(result) {                   
                    fulfillment_data.push({
                        if_number: result.getValue('tranid'),
                        date: result.getValue('trandate'),
                        posting: result.getText('postingperiod'),
                        project: result.getText('entity'),
                        project_id: result.getValue('entity'),
                        item: result.getText('item'),
                        description: result.getValue({ join: 'item', name: 'description' }),
                        quantity: result.getValue('quantity'),                            
                        amount: result.getValue('amount'),
                        location: result.getText('location'),
                        sales_order_number: result.getValue({ join: 'createdfrom', name: 'tranid' })
                    });              
                });                                  
            }    
            
            var f = file.create({
                name: '606-fulfillment-lines.json',
                fileType: file.Type.JSON,
                contents: JSON.stringify(fulfillment_data),
                folder: 50712
            });
            
            f.save();    

            var csearch = search.load({
                id: 'customsearch_gcs_cache_606_pl_map'
            });

            var size = 1000;
            var paged = csearch.runPaged({
                pageSize: size
            });      
            
            var fulfillment_data = [];

            for(var i = 0; i < (paged.count / size); i++) {

                var page = paged.fetch({ index: i });

                page.data.forEach(function(result) {                   
                    fulfillment_data.push({
                        if_number: result.getValue('tranid'),
                        pl_number: result.getValue('custcol_gcs_packing_list_num')
                    });              
                });                                  
            }    
            
            var f = file.create({
                name: '606-pl-map.json',
                fileType: file.Type.JSON,
                contents: JSON.stringify(fulfillment_data),
                folder: 50712
            });
            
            f.save();        
                                           
        }
    }

});