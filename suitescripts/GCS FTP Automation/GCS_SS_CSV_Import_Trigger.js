/**
 *@NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/file', 'N/runtime', 'N/task'],
    function (file, runtime, task) {

        function execute(context) {
            try {
                log.debug('execute', '');
                var fileToImport = runtime.getCurrentScript().getParameter({
                    name: 'custscript_gcs_file_to_process'
                });
                log.debug('fileToImport', fileToImport);

                var csvTemplate = runtime.getCurrentScript().getParameter({
                    name: 'custscript_gcs_csv_template'
                });
                log.debug('csvTemplate', csvTemplate);

                if (fileToImport && csvTemplate) {
                    var scriptTask = task.create({
                        taskType: task.TaskType.CSV_IMPORT
                    });
                    scriptTask.mappingId = csvTemplate;
                    var fileObj = file.load(fileToImport);

                    log.debug('fileObj', fileObj);
                    scriptTask.importFile = fileObj;

                    var csvImportTaskId = scriptTask.submit();
                    log.debug('csvImportTaskId', csvImportTaskId);
                } else {
                    log.debug('Do Not Run', '');
                }
            } catch (error) {
                log.error("Error", error);
            }
        }

        return {
            execute: execute
        }
    });