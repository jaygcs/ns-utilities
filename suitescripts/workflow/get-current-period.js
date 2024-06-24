/**
 * @NApiVersion 2.x
 * @NScriptType WorkflowActionScript
 */
define([ 'N/search' ], function(search) {

    return {
        
        // gets the ID of the current accounting period (from Chat GPT :))
        onAction: function(context) {

            var currentPeriodId = 0;

           // Get the current date
           var currentDate = new Date();

           // Search for the accounting period that includes the current date
           var periodSearch = search.create({
               type: search.Type.ACCOUNTING_PERIOD,
               filters: [
                   search.createFilter({
                       name: 'isadjust',
                       operator: search.Operator.IS,
                       values: ['F']
                   }),
                   search.createFilter({
                       name: 'startdate',
                       operator: search.Operator.ONORBEFORE,
                       values: [currentDate]
                   }),
                   search.createFilter({
                       name: 'enddate',
                       operator: search.Operator.ONORAFTER,
                       values: [currentDate]
                   })
               ],
               columns: ['internalid', 'periodname'],
               title: 'Current Accounting Period Search'
           });

           var periodSearchResults = periodSearch.run().getRange({ start: 0, end: 1 });

           if (periodSearchResults && periodSearchResults.length > 0) {

               // Get the internal ID and name of the current accounting period
               currentPeriodId = periodSearchResults[0].getValue({ name: 'internalid' });      
           } 
           else {
               log.error({
                   title: 'Error Finding Current Accounting Period',
                   details: 'No accounting period found for the current date.'
               });
            }

            
            return currentPeriodId;

        }

    }
    
}); 