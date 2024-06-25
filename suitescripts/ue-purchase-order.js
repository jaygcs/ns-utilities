/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 */
 define([ 'N/record', 'N/search' ], function(record, search) {            
    
    return {

        afterSubmit: function(context) {        
            
            if (
                context.type === context.UserEventType.CREATE || 
                context.type === context.UserEventType.EDIT || 
                context.type === context.UserEventType.COPY
            ) {
         
                if(context.newRecord.id && context.newRecord.getValue('createdfrom') && context.newRecord.getValue('custbody_geniusbos_type_of_transformer')) {

                    // genius bos PO with config custom fields, copy each field to the sales order
                    var sale = record.load({
                        type: record.Type.SALES_ORDER,
                        id: context.newRecord.getValue('createdfrom')
                    });                

                    var fields = [
                        'custbody_genius_type_of_transformer',
                        'custbody_genius_base_kva',
                        'custbody_genius_max_kva',
                        'custbody_genius_cooling_class',
                        'custbody_genius_temprature_rise',
                        'custbody_genius_ambient_temp',
                        'custbody_genius_noise_level',
                        'custbody_genius_seismic_zone',
                        'custbody_genius_altitude',
                        'custbody_genius_frequency',
                        'custbody_genius_hv_rated_voltage',
                        'custbody_genius_lv_rated_voltage',
                        'custbody_genius_hv_winding_bil',
                        'custbody_genius_lv_winding_bil',
                        'custbody_genius_neutral_bil',
                        'custbody_genius_hv_connection',
                        'custbody_genius_lv_connection',
                        'custbody_genius_vector_group',
                        'custbody_genius_winding_material',
                        'custbody_genius_dielectric_flui',
                        'custbody_genius_tap_switch_requirement',
                        'custbody_genius_tapping_range_on_hv',
                        'custbody_genius_gtd_nll',
                        'custbody_genius_nll_capitalization_rat',
                        'custbody_genius_gtd_ll',
                        'custbody_genius_ll_capitalization_rate',
                        'custbody_genius_gtd_positive_sequence',
                        'custbody_genius_hv_bushing_bil_type',
                        'custbody_genius_lv_bushing_bil_type',
                        'custbody_genius_neutral_bushing',
                        'custbody_genius_hv_bush_mount_orienta',
                        'custbody_genius_gbush_mount_orientati',
                        'custbody_genius_paint_color_type',
                        'custbody_genius_tank_cover_bolt_weld',
                        'custbody_genius_preservation_system',
                        'custbody_genius_k_factor',
                        'custbody_genius_total_harmonic_distor',
                        'custbody_genius_liq_lev_guage_one_con',
                        'custbody_genius_liq_temp_guuge_one_co',
                        'custbody_genius_press_rel_dev_one_con',
                        'custbody_genius_press_vac_gauge_bleed',
                        'custbody_genius_gauge_location',
                        'custbody_genius_drain_valve',
                        'custbody_genius_filter_valve',
                        'custbody_genius_ground_pafs',
                        'custbody_genius_shrader_valve',
                        'custbody_genius_elec_shield_lv_hv_win',
                        'custbody_genius_cabinet',
                        'custbody_genius_nameplate_options',
                        'custbody_genius_weak_link_cur_lim_fus',
                        'custbody_genius_parking_stnds_hv_bush',
                        'custbody_genius_anchoring',
                        'custbody_genius_loop_feed_requirement',
                        'custbody_genius_radial_feed_requireme',
                        'custbody_genius_hv_surge_arrest_mcovk',
                        'custbody_genius_lv_surge_arrester_mco',
                        'custbody_genius_hv_ct_qty_phase',
                        'custbody_genius_hv_ct_ratios',
                        'custbody_genius_lv_ct_qty_phase',
                        'custbody_genius_lv_ct_ratios',
                        'custbody_genius_neutral_ct_ratio_qty',
                        'custbody_genius_any_over_dim_restrict',
                        'custbody_genius_any_over_weight_restr',                                                                                                                                                                                                        
                        'custbody_genius_lim_current_density',                                            
                        'custbody_genius_limit_flux_density',                                            
                        'custbody_genius_any_vend_pref_spec_ma',                                            
                        'custbody_genius_efficiency_requiremen',                                            
                        'custbody_genius_applicable_std_design',                                            
                        'custbody_genius_applicable_std_test',                                            
                        'custbody_genius_control_box_type',                                            
                        'custbody_genius_ul_label_requirement',                                                                                                        
                        'custbody_genius_load_break_switch_req',                                                                                                 
                        'custbody_genius_test_requirement',                                                                                                 
                        'custbody_genius_specify_addtl_require'
                    ];

                    for(var i = 0; i < fields.length; i++) {
                        sale.setValue({ fieldId: fields[i], value: context.newRecord.getValue(fields[i]) });
                    }

                    sale.save();                                               
                }
                else if(context.newRecord.id) {

                    // see if we need to match up landed costs
                    var po = record.load({
                        type: record.Type.PURCHASE_ORDER,
                        id: context.newRecord.id
                    });

                    // get all landed cost categories
                    var categories = [];
            
                    var s = search.create({
                        type: 'costcategory',            
                        columns: [ 'internalid', 'name' ]                    
                    });
            
                    s.run().each(function(result) {            

                        categories.push({
                            id: result.getValue('internalid'),
                            name: result.getValue('name')
                        });

                        return true; 
                    });

                    var needs_save = false;
                    for(var i = 0; i < po.getLineCount({ sublistId: 'item' }); i++) {  

                        for(var j = 0; j < categories.length; j++) {                        

                            if(po.getSublistText({ sublistId: 'item', fieldId: 'item', line: i }) == categories[j].name) {                                

                                // we have a match, set the LC category
                                needs_save = true;
                                po.setSublistValue({ sublistId: 'item', fieldId: 'landedcostcategory', value: categories[j].id, line: i });
                                break;
                            }
                        }
                    }
                    
                    if(needs_save) {

                        po.save();
                    }
                
                }
            }
        }
    }
});
