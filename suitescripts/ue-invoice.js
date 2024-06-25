/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 */
 define([ 'N/query', 'N/record', 'SuiteScripts/GCS/error' ], function(query, record, error) {            
    
    return {

        afterSubmit: function(context) {    

            if(context.newRecord.id) {

                /* legacy
      
                try {

                    var sale = record.load({
                        type: record.Type.INVOICE,
                        id: context.newRecord.id
                    });

                    if(sale.getValue('job')) {

                         // update shipto from project
                        var sql = 'SELECT job.custentity_gcs_install_addressee_text AS addressee, ' +
                            'job.custentity_gcs_installation_attenttext AS attention, ' +
                            'job.custentity_gcs_install_address1_text AS address_1, ' +
                            'job.custentity_gcs_install_address2_text AS address_2, ' +
                            'job.custentity_gcs_install_addresscity_text AS city, ' +
                            'BUILTIN.DF(job.custentity_gcs_install_addressstate_list) AS state, ' +
                            'job.custentity_gcs_install_address_zip_text AS zip, ' +
                            'BUILTIN.DF(job.custentity_gcs_install_country_list) AS country ' +
                            'FROM job JOB where job.id = ?';

                        var result = query.runSuiteQL({ query: sql, params: [ sale.getValue('job') ] }).asMappedResults().pop();
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

                        if(result.state) {
                            sa.setText({ fieldId: 'state', text: result.state });
                        }

                        sa.setValue({ fieldId: 'zip', value: result.zip });                                                                

                        sale.save({ ingoreRequiredFields: true });    

                    }
                }

                catch(e) {                       
                    error.run('PDS Error', context, e);
                }   
                
                */
            }
        }
    }
});