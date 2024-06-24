/**
 *@NApiVersion 2.x
 *@NScriptType ScheduledScript
 */
 define([ 'N/file', 'SuiteScripts/GCS/saved-search', 'SuiteScripts/GCS/error' ], function(file, search, error) {

    return {

        execute: function(context) {  

            try {

                var data = search.get('customsearch_avg_cost_by_location');

                var records = {};

                data.forEach(function(d) {

                    var key = d.id + '_' + d.inventoryLocation__internalid;
                    records[key] = d.locationaveragecost;
                });

                var f = file.create({
                    name: 'avg-cost-location.json',
                    fileType: file.Type.JSON,
                    contents: JSON.stringify(records),
                    folder: 50712
                });
    
                f.save();

                log.audit('Complete', 'Saved ' + Object.keys(records).length + ' items');
                
            }
            catch(e) {                       
                error.run('PDS Error AVGC Cache', context, e);
            }        
        }
    }
   

});