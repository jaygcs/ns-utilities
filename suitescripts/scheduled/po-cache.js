/**
 *@NApiVersion 2.x
 *@NScriptType ScheduledScript
 */
 define([ 'SuiteScripts/GCS/master-project-schedule', 'N/runtime', 'N/email', 'SuiteScripts/GCS/config', 'SuiteScripts/GCS/error' ], function(mps, runtime, email, config, error) {

    return {

        execute: function(context) {  

            try {

                var user = runtime.getCurrentUser();
                context.user = {
                    id: user.id,
                    email: user.email,
                    name: user.name
                };

                // for error log
                context.params = { scheduled_cache: true };                
                                            
                mps.write_cache_po();
                                
                var message = '<h3 style="color: #842029">Cache file run on ' + new Date().toLocaleDateString() + '</h3>';                

                var title = 'PDF PS Cache';

                email.send({                    
                    author: config.DEBUG_EMAIL_AUTHOR,
                    recipients: config.DEBUG_EMAIL_RECIPIENT,
                    subject: title,
                    body: message
                });   
                
            }
            catch(e) {                       
                error.run(title, context, e);
            }        
        }
    }

});