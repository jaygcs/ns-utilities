/**
 * @NModuleScope public
 * @NApiVersion 2.1
 */
 define([ 
     'N/query',
     'N/record', 
     'SuiteScripts/GCS/fulfillment-sales-order', 
     'SuiteScripts/GCS/product-classes', 
     'SuiteScripts/GCS/engineering-bom' 
    ], function(query, record, f_sales_order, product_classes, engineering_bom) {

    return {

        addLine: function(sale, line) {

            sale.selectNewLine({ sublistId: 'item' });
            
            sale.setCurrentSublistText({
                sublistId: 'item',
                fieldId: 'item',
                text: line.part
            });    
            
            if(line.location) {   
                try {             
                    sale.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'location',
                        value: line.location
                    });                  
                }
                catch(e) {

                }
            }           

            sale.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'quantity',
                value: line.quantity
            });                                

            sale.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'rate',
                value: 0
            });  
            
            sale.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_gcs_so_line_bom_item',
                value: line.bom_id
            });                 

            sale.commitLine({
                sublistId: 'item'
            }); 
        },

        run: function(context) {  
            
            var project = record.load({
                type: record.Type.JOB,
                id: context.params.project_id
            });

            var sale = {};

            if(project.getValue('custentity_gcs_fulfillment_so')) {

                sale = record.load({
                    type: record.Type.SALES_ORDER,
                    id: project.getValue('custentity_gcs_fulfillment_so'),
                    isDynamic: true
                });

                if(project.getValue('subsidiary') == 3) {

                    // India sub, change form
                    sale.setValue({ fieldId: 'customform', value: 217 });
                    sale.setValue({ fieldId: 'subsidiary', value: Number(project.getValue('subsidiary')) });  
                }        
                
                sale.setValue({ fieldId: 'job', value: context.params.project_id });   

                sale.setValue({ fieldId: 'entity', value: project.getValue('parent') });
                sale.setValue({ fieldId: 'job', value: context.params.project_id });
                sale.setText({ fieldId: 'custbody_gcs_sotype', text: 'Project BOM' });            
                sale.setValue({ fieldId: 'custbody_gcs_operations_manager', value: context.user.id });        
                sale.setText({ fieldId: 'orderstatus', text: 'Pending Fulfillment' });                  
            }
            else {

                // create new
                sale = record.create({
                    type: record.Type.SALES_ORDER,
                    isDynamic: true
                });                

                sale.setValue({ fieldId: 'entity', value: project.getValue('parent') });        

                if(project.getValue('subsidiary') == 3) {

                    // India sub, change form
                    sale.setValue({ fieldId: 'customform', value: 217 });
                    sale.setValue({ fieldId: 'subsidiary', value: Number(project.getValue('subsidiary')) });                     
                }

                
                sale.setValue({ fieldId: 'job', value: context.params.project_id });        
                                
                sale.setText({ fieldId: 'custbody_gcs_sotype', text: 'Project BOM' });            
                sale.setValue({ fieldId: 'custbody_gcs_operations_manager', value: context.user.id });        
                sale.setText({ fieldId: 'orderstatus', text: 'Pending Fulfillment' });                                   

                // get project address
                var sql = 'SELECT job.custentity_gcs_install_addressee_text AS addressee, ' +
                    'job.custentity_gcs_installation_attenttext AS attention, ' +
                    'job.custentity_gcs_install_address1_text AS address_1, ' +
                    'job.custentity_gcs_install_address2_text AS address_2, ' +
                    'job.custentity_gcs_install_addresscity_text AS city, ' +
                    'job.custentity_gcs_install_addressstate_list AS state, ' +
                    'job.custentity_gcs_install_address_zip_text AS zip, ' +
                    'BUILTIN.DF(job.custentity_gcs_install_country_list) AS country ' +
                    'FROM job JOB where job.id = ?';
                
                var result = query.runSuiteQL({ query: sql, params: [ context.params.project_id ] }).asMappedResults().pop();
                sale.setValue({ fieldId: 'shipaddresslist', value: -2 });                

                var sa = sale.getSubrecord({ fieldId: 'shippingaddress' });
                if(result.country) {
                    sa.setText({ fieldId: 'country', text: result.country });    
                }
                else {
                    sa.setText({ fieldId: 'country', text: 'US' });
                }
                
                sa.setValue({ fieldId: 'addressee', value: result.addressee });
                sa.setValue({ fieldId: 'attention', value: result.attention });
                
                sa.setValue({ fieldId: 'addr1', value: result.address_1 });
                sa.setValue({ fieldId: 'addr2', value: result.address_2 });
                sa.setValue({ fieldId: 'city', value: result.city });
                sa.setValue({ fieldId: 'state', value: result.state });
                sa.setValue({ fieldId: 'zip', value: result.zip });                             
            }                  
            
            var items = f_sales_order.getItemsFromMps(context.params.project_id);

            // calculate the earliest ship date for hardware and set the order date to that            
            var dates = [];
            items.forEach(function(item) {
                dates.push({
                    date: item.ship_date,
                    timestamp: item.ship_timestamp
                });
            });

            dates.sort(function(a, b) {
                return a.timestamp - b.timestamp;
            });

            var earliest_ship = dates[0].date;
            sale.setValue({ fieldId: 'trandate', value: new Date(earliest_ship) });   

            var count = sale.getLineCount({ sublistId: 'item' });

            if(count > 0) {

                // we have lines to check for update
                for(j = 0; j < items.length; j++) {

                    var item = items[j];
                
                    var key_item = item.part + '_' + item.location;
                    var found = false;

                    for(var i = 0; i < count; i++) {  

                        var key_so = sale.getSublistText({ sublistId: 'item', fieldId: 'item', line: i }) + '_' + sale.getSublistValue({ sublistId: 'item', fieldId: 'location', line: i });
                
                        if(key_so == key_item) {

                            found = true;

                            if(item.quantity != sale.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i })) {

                                sale.selectLine({ sublistId: 'item', line: i });

                                sale.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'quantity',
                                    value: item.quantity
                                });                  

                                sale.commitLine({
                                    sublistId: 'item'
                                }); 
                            }

                            break;
                        }
                    }

                    if(!found) {

                        // new item/location, add to sales order
                        this.addLine(sale, item);
                    }
                }

                // see if we need to remove items
                for(var i = 0; i < count; i++) {  

                    var key_so = sale.getSublistText({ sublistId: 'item', fieldId: 'item', line: i }) + '_' + sale.getSublistValue({ sublistId: 'item', fieldId: 'location', line: i });
                    var found = false;

                    for(var j = 0; j < items.length; j++) {

                        var key_item = items[j].part + '_' + items[j].location;
                        if(key_so == key_item) {
                            found = true;
                            break;
                        }
                    }

                    if(!found) {

                        // remove item from that line                            
                        sale.removeLine({ sublistId: 'item', line: i });     
                        
                        // reduce the count
                        count--;
                    }
                }

            }
            else {

                // new sales order, just add lines
                for(var i = 0; i < items.length; i++) {

                    this.addLine(sale, items[i]);
                }
            }

            var id = sale.save({ ingoreRequiredFields: true });                                  

            if(!project.getValue('custentity_gcs_fulfillment_so')) {

                // save this sales order with the project
                project.setValue({ fieldId: 'custentity_gcs_fulfillment_so', value: id });
                project.save();      
                
                // reload to get sales order number easily
                project = record.load({
                    type: record.Type.JOB,
                    id: context.params.project_id
                });
            }

            var response = {
                earliest_ship: earliest_ship,
                raw_mps_items: items,
                sales_order: { 
                    id: project.getValue('custentity_gcs_fulfillment_so'),
                    number: project.getText('custentity_gcs_fulfillment_so')
                },
                bom: []
            }

             // load product classes
             product_classes.load();
             response.classes = product_classes.get();  
 
             // load engineering bom 
             response.bom = engineering_bom.get(product_classes, context.params.project_id);     
 
             if(response.sales_order.id) {
              
                 // load the items, merge with bom
                 var data = f_sales_order.getSalesOrderBom(response.sales_order.id, response.bom); 
                 response.sales_order.items = data.items;
                 response.bom = data.bom;
             }                
                           
            context.response.write(JSON.stringify(response));
        }
    }

});