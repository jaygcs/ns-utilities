/**
 * @NModuleScope public
 * @NApiVersion 2.1
 */
 define([ 'N/ui/serverWidget', 'SuiteScripts/GCS/config' ], function(widget, config) {

    return {

        context: {},
        container: '',
        bootstrapped: false,

        init: function(context, container, style) {

            this.context = context;
            this.container = container;

            if(!this.bootstrapped) {

                var browser = context.form.addField({
                    id: 'custpage_gcs_browser',
                    label: 'Browser Code',
                    type: widget.FieldType.INLINEHTML
                });

                browser.defaultValue = '';
                
                if(style) { 
                    
                    browser.defaultValue += '<link rel="stylesheet" type="text/css" href="' + config.CLIENT_CSS + '" />\n';
                }

                browser.defaultValue += '<script language="javascript" src="' + config.CLIENT_JS + '"></script>\n';  
                browser.defaultValue += '<script language="javascript">var GCS_CLIENT_SL = "' + config.CLIENT_SL + '";</script>\n';
                browser.defaultValue += '<script language="javascript">var GCS_OPEN_PROJECTS_SL = "' + config.OPEN_PROJECTS_SL + '";</script>\n';

                this.bootstrapped = true;
            }

        },

        strong: function(s) {
            return '<strong>' + s + '</strong>';
        },

        pad: function() {
          
            this.render({
                content: '<br><br>',
                break: true
            });

        },
        
        render: function(data) {

            var field_id = 'custpage_html_c_' + Math.random().toString(36).substring(2, 9);

            var field = this.context.form.addField({
                id: field_id,
                type: widget.FieldType.INLINEHTML,
                container: this.container,                    
                label: 'BLANK'
            }); 

            if(data.break) {
                field.updateBreakType({
                    breakType: widget.FieldBreakType.STARTROW
                });  
            }
            else {
                field.updateBreakType({
                    breakType: widget.FieldBreakType.STARTCOL
                });  
            }
            
            field.padding = 0; 

            field.defaultValue = data.content;
        },

        paragraph: function(text) {
            return '<div class="sub-block-text">' + text.replace(/\n/g, '<div style="height: 4px;"></div>') + '</div>';
        },

        giantAlert: function(text) {
            return '<div class="giant-alert">' + text + '</div>';
        },

        card: function(data) {

            var c = '<div class="card">';
            if(data.title) {
                c += '<div class="card-title">' + data.title + '</div>';
            }
            if(data.details) {
                c += '<div class="card-text">' + data.details + '</div>';
            }
            if(data.image) {

                var width = 500;
                if(data.width) {
                    width = data.width;
                }

                var href = data.image;
                if(data.href) {
                    href = data.href;
                }

                c += '<div class="card-text"><a href="' + href + '" target="_BLANK"><img width="' + width + '" src="' + data.image + '"></a>';
            }

            c += '</div>';

            return c;
        },    
        
        button: function(data) {

            var c = '';

            var style = 'btn-standard';
            if(data.style) {
                style = data.style;
            }

            if(data.href) {
                c += '<a href="' + data.href + '"';
                if(data.tab) {
                    c += ' target="_BLANK"';
                }
                c += '>';
            }
            else if(data.click) {
                c += '<a href="javascript:' + data.click + '">';
            }

            var id = (data.id) ? 'id="' + data.id + '" ' : '';

            c += '<button ' + id + ' type="button" class="' + style + '">' + data.title + '</button></a>';

            return c;
        },

        table: function(data) {

            var cellpadding = data.cellpadding || 4;
            var cellspacing = data.cellspacing || 0;            

            var c = '<table cellpadding="' + cellpadding + '" cellspacing="' + cellspacing + '" ';
            
            if(data.bordered) {
                c += ' class="table-bordered"';                
            }   

            c += ' width="100%">';        

            if(data.headers) {
                c += '<tr>';
                data.headers.forEach(function(header) {
                    c += '<td class="table-header">' + header + '</td>';
                });
                c += '</tr>';
            }
            data.rows.forEach(function(row) {
                c += '<tr>';
                row.forEach(function(td) {
                    c += '<td class="table-text ';
                    if(data.bordered) {
                        c += ' table-bordered';                
                    }    
                    c += '">' + td + '</td>';
                })
                c += '</tr>';
            });
            
            c += '</table>';
            return c;
        }

    }

});