/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 */
define(['N/runtime', 'N/search', 'N/email', 'N/task',
    'SuiteScripts/GCS FTP/sftp_common.js'],
    function (runtime, search, email, task,
        sftpUtil) {
        function getInputData() {
            try {
                var arrFiles = [];
                var downloadFolderId = runtime.getCurrentScript().getParameter({ name: 'custscript_gcs_ftp_dl_folder' });
                var remoteDir = [];
                var remoteDirFolder = runtime.getCurrentScript().getParameter({ name: 'custscript_gcs_remote_dir_folder' });
                remoteDir.push(remoteDirFolder);
                let fileCriteria = sftpUtil.getFormattedDate(new Date());

                let creds = sftpUtil.getSFTPCredentials(runtime);
                arrFiles = sftpUtil.downloadFiles(creds, downloadFolderId, remoteDir, fileCriteria);

                log.debug('arrFiles', arrFiles);
                if (arrFiles) {
                    log.debug("Num results to process", arrFiles.length);
                } else {
                    log.debug("Num results to process", 0);
                    arrFiles = [];
                }

                return arrFiles;
            } catch (error) {
                log.error("Error in get input stage", error);
            }
        }

        function map(context) {
            let val = JSON.parse(context.value);
            log.debug('map', val);
            //create custom record per file pulled in, expected to pull in 4
            try {
                context.write(val.fileId, val);

            } catch (error) {
                log.error("MAP", error);
            }
        }

        function reduce(context) {
            try {
                log.debug('Reduce', context);
                //let values = JSON.parse(context.values[0]);
                var savedFolderId = runtime.getCurrentScript().getParameter({ name: 'custscript_gcs_formatted_csv_folder' });
                var csvFileId = sftpUtil.createCSVFile(context.key, savedFolderId);
                log.debug('csvFileId', csvFileId);
                var savedCSVTemplate = runtime.getCurrentScript().getParameter({ name: 'custscript_gcs_saved_csv_import' });
                log.debug('savedCSVTemplate', savedCSVTemplate);
                var myTask = task.create({
                    taskType: task.TaskType.SCHEDULED_SCRIPT,
                    params: {
                        'custscript_gcs_file_to_process': csvFileId,
                        'custscript_gcs_csv_template': savedCSVTemplate
                    }
                });
                myTask.scriptId = 'customscript_gcs_ss_csv_import_trigger';

                var scriptTaskId = myTask.submit();
                var taskStatus = task.checkStatus(scriptTaskId);
                log.debug('scriptTaskId: ' + scriptTaskId, taskStatus);

                context.write(csvFileId);

            } catch (error) {
                log.error("REDUCE", error);
            }

        }

        //submit file into the csv importer
        function summarize(summary) {
            log.audit("Usage", summary.usage);
            let haserrors = errorWrapper(summary);
            try {
                /*
                //Remove all files that have been processed
                var arrFilesToRemove = [];
                summary.output.iterator().each(function (key, value) {
                    var valueObj = JSON.parse(value);
                    var originalFile = valueObj.originalFile;
                    if (!isEmpty(originalFile)) {
                        //arrFilesToRemove.push(originalFile); //does not delete error files
                        arrFilesToRemove.push({
                            'fileId': valueObj.fileId,
                            'path': valueObj.remotePath
                        });
                    }

                    return true;
                });

                for (let i = 0; i < arrFilesToRemove.length; i++) {
                    //arrFilesToRemove[i].fileObj.folder = processedFolder;
                    log.debug('fileID', arrFilesToRemove[i].fileId);
                    var fileObj = file.load({ id: arrFilesToRemove[i].fileId });
                    arrFilesToRemove[i].fileName = fileObj.name;
                    fileObj.folder = processedFolder;
                    var fileId = fileObj.save();
                    log.debug('File Moved', fileId);
                }
                log.debug('arrFilesToRemove', arrFilesToRemove);

                sftpUtil.deleteFiles(arrFilesToRemove, null);
                log.debug('remove dir cleanup', 'completed');

                let emailMessageBody = 'FTP / CSV Completed.  # of files Processed: ' + arrFilesToRemove.length;

                let emailSubject = 'FTP / CSV Process Completed!'

                let emailSender = ''
                let emailReceiver = ''

                email.send({
                    author: emailSender,
                    recipients: emailReceiver,
                    subject: emailSubject,
                    body: emailMessageBody
                });
                */
            } catch (error) {
                log.error('Error in Summarize', error.toString());

            }

            log.audit('Status', 'End Process ');
        }

        function errorWrapper(summary) {
            log.debug('errorWrapper', '');
            let inputSummary = summary.inputSummary;
            let mapSummary = summary.mapSummary;
            let reduceSummary = summary.reduceSummary;

            if (inputSummary.error) {
                var e = error.create({
                    name: 'INPUT_STAGE_FAILED',
                    message: inputSummary.error
                });

            }

            let maperrors = handleErrorInStage('map', mapSummary);
            let reducerrors = handleErrorInStage('reduce', reduceSummary);

            log.debug('maperrors', maperrors);
            log.debug('reducerrors', reducerrors);
        }

        function handleErrorInStage(stage, summary) {
            var errorMsg = [];
            summary.errors.iterator().each(function (key, value) {
                var msg = JSON.parse(value).message + '\n';
                errorMsg.push(msg);
                return true;
            });
            if (errorMsg.length > 0) {
                var e = error.create({
                    name: '',
                    message: JSON.stringify(errorMsg)
                });
            }
            return errorMsg;
        }

        return {
            getInputData: getInputData,
            map: map,
            reduce: reduce,
            summarize: summarize
        }
    });