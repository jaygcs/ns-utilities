/**
 *@NApiVersion 2.x
 *@NScriptType Suitelet
 */
 define([ 'N/record' ], function(record) {

    return {

        onRequest: function(context) {   

            if(context.request.parameters.opp_id) {

                try {                    

                    // load the opportunity
                    var opp = record.load({
                        type: record.Type.OPPORTUNITY,
                        id: context.request.parameters.opp_id
                    });

                    var proj = record.create({
                        type: record.Type.JOB
                    });

                    // set customer from opp customer
                    proj.setValue({ fieldId: 'parent', value: opp.getValue('entity') });

                    // set name from opp title
                    proj.setValue({ fieldId: 'altname', value: opp.getValue('title') });

                    // set project name from opp title
                    proj.setValue({ fieldId: 'companyname', value: opp.getValue('title') });

                    // set country from opp country
                    proj.setValue({ fieldId: 'custentity_gcs_install_country_list', value: opp.getValue('custbody_gcs_country') });

                    // copy over remainder of info

                    // set BP REP from opp Sales Rep                    
                    proj.setValue({ fieldId: 'custentity_gcs_project_bd_rep', value: opp.getValue('salesrep') });
                    
                    // set Installation Address from opp Street Address
                    proj.setValue({ fieldId: 'custentity_gcs_install_address1_text', value: opp.getValue('custbody_gcs_street_address') });
                    
                    // set Installation City from opp City
                    proj.setValue({ fieldId: 'custentity_gcs_install_addresscity_text', value: opp.getValue('custbody_gcs_city') });
                    
                    // set Installation State/Province from opp State/Province
                    proj.setValue({ fieldId: 'custentity_gcs_install_addressstate_list', value: opp.getValue('custbody_gcs_state') });
                    
                    // set Installation Zipcode from opp Zipcode
                    proj.setValue({ fieldId: 'custentity_gcs_install_address_zip_text', value: opp.getValue('custbody_gcs_zipcode') });

                    proj.setValue({ fieldId: 'subsidiary', value: opp.getValue('subsidiary') });
                    
                    // set Project Size (MW) from opp Quantity (in Watts)
                    var quantityInWatt = opp.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'quantity',
                        line: 0
                    });
                    
                    var quantityInMW = quantityInWatt / 1000000;
                    
                    proj.setValue({ fieldId: 'custentity_gcs_project_size', value: quantityInMW });

                    var system = opp.getSublistValue({ 
                        sublistId: 'item',
                        fieldId: 'item',
                        line: 0
                    });

                    proj.setValue({ fieldId: 'custentity_gcs_project_system', value: system });

                    // save project, get id
                    var proj_id = proj.save();

                    // save new proj with opportunity
                    opp.setValue({ fieldId: 'custbody_gcs_linked_project', value: proj_id });
                    opp.save();

                    // save the project address to the customer address book
                    // name the address with the project number and name
                    proj = record.load({
                        type: record.Type.JOB,
                        id: proj_id
                    });

                    // get customer ID
                    var customer = proj.getValue( 'parent' );

                    // get customer record
                    var cust = record.load ({
                        type: record.Type.CUSTOMER,
                        id: customer,
                        isDynamic: true
                    });

                    // add the addressboook to the customer record's address
                    cust.selectNewLine({ sublistId: 'addressbook' });

                    var newAddressbook = cust.getCurrentSublistSubrecord({
                        sublistId: 'addressbook',
                        fieldId: 'addressbookaddress'
                    });

                    var stateName;
                    var results;

                    var cust_state = proj.getText( 'custentity_gcs_install_addressstate_list' );
                    // log.debug('debug','value of state'  + cust_state);                    
            
                    var country = proj.getText( 'custentity_gcs_install_country_list' );
                    // log.debug('debug','value of country: '  + country);

                    // Set values for customer record
                    if (proj.getValue('companyname')) {

                        var project_label = proj.getValue('entityid') + ' - ' + proj.getValue( 'companyname' );

                        cust.setCurrentSublistValue({
                            sublistId: 'addressbook',
                            fieldId: 'label',
                            value: project_label
                        });

                        newAddressbook.setText({ fieldId: 'country', text: proj.getText( 'custentity_gcs_install_country_list' ) });

                        newAddressbook.setValue({ fieldId: 'addressee', value: proj.getValue('companyname') });

                        newAddressbook.setValue({ fieldId: 'addrphone', value: proj.getValue('custentity_gcs_project_phone') });

                        newAddressbook.setValue({ fieldId: 'addr1', value: proj.getValue('custentity_gcs_install_address1_text') });

                        newAddressbook.setValue({ fieldId: 'addr2', value: proj.getValue('custentity_gcs_install_address2_text') });

                        newAddressbook.setValue({ fieldId: 'city', value: proj.getValue('custentity_gcs_install_addresscity_text') });

                        newAddressbook.setText({ fieldId: 'dropdownstate', value: proj.getText( 'custentity_gcs_install_addressstate_list' ) });

                        newAddressbook.setValue({ fieldId: 'zip', value: proj.getValue('custentity_gcs_install_address_zip_text') });

                    }

                    cust.commitLine({ sublistId: 'addressbook' });
                
                    cust.save();

                    // redirect to project in edit mode
                    context.response.write('<script language="javascript">document.location.href = "/app/accounting/project/project.nl?id=' + proj_id + '&e=T&whence=";</script>');

                }
                catch(e) {
                    context.response.write(JSON.stringify(e));
                }
            }        
        }
    }

});