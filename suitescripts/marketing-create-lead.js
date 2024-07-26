/**
 *@NApiVersion 2.x
 *@NScriptType Suitelet
 */
 define([ 'N/file', 'SuiteScripts/GCS/config' ], function(file, config) {
    
    return {
        
        onRequest: function(context) {

            // debug dump to show request parameters
            context.response.write(JSON.stringify(context.request.parameters, null, 2));

            if(context.request.parameters.submit) {

                // form has been submitted, create lead record


            }
            else {

                // show the form
                var output = '<!doctype html>\n'

                    + '<html lang="en">\n'
                    + '<head>\n'
                    + '<meta charset="UTF-8">\n'
                    + '<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">\n'
                    + '<title>Test Marketing Form</title>\n'                   
                    + '</head>\n'
                    + '<body class="sb-nav-fixed">\n'                 

                    + '<form method="POST">'
                    + 'First Name <input type="text" name="first_name" /><br/>'
                    + 'Last Name <input type="text" name="last_name" /><br/>'
                    + 'Company Name <input type="text" name="company_name" /><br/>'
                    + '<button type="submit" name="submit" value="submit">Submit</button>'                
                    + '</form>'     
                    + '</body>\n'                
                    + '</html>\n';

                context.response.write(output);
            }
        }
    }

});