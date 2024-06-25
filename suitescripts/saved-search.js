/**
 * @NModuleScope public
 * @NApiVersion 2.x
 */
define([ 'N/search' ], function(search) {

    return {

        get: function(id) {

            var data = [];

            var csearch = search.load({
                id: id
            });

            var size = 1000;
            var paged = csearch.runPaged({
                pageSize: size
            });      

            for(var i = 0; i < (paged.count / size); i++) {

                var page = paged.fetch({ index: i });

                page.data.forEach(function(result) {  

                    var record = {
                        id: result.id
                    }

                    result.columns.forEach(function(col) {

                        var args = { name: col.name }
                        
                        if(col.join) {
                            args.join = col.join;
                        }

                        var name = args.name;
                        if(args.join) { name = args.join + '__' + name }

                        record[name] = result.getValue(args);
                        if(result.getText(args)) {
                            record[name + '_text'] = result.getText(args);
                        }
                    });

                    data.push(record);                    
                });
            }

            return data;
        }
        
    } 

});                      