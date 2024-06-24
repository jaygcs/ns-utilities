/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 * @module
 */
define(['N/runtime', 'N/record', 'N/sftp', 'N/file', 'N/keyControl'],
    function (runtime, record, sftp, file, keyControl) {

        /**
         * Returns Credentials needs to make SFTP Connection
         * @returns {}
         */
        function getSFTPCredentials(runtime) {
            log.debug('getSFTPCredentials', '');
            //Cp0930342596+$
            let objPreferences = {
                url: runtime.getCurrentScript().getParameter({ name: 'custscript_gcs_ftp_url' }),
                hostKey: runtime.getCurrentScript().getParameter({ name: 'custscript_gcs_ftp_hostkey' }),
                port: parseInt(runtime.getCurrentScript().getParameter({ name: 'custscript_gcs_ftp_port' })),
                keyType: runtime.getCurrentScript().getParameter({ name: 'custscript_gcs_ftp_key_type' }),
                username: runtime.getCurrentScript().getParameter({ name: 'custscript_gcs_ftp_user_name' }),
                passwordGuid: runtime.getCurrentScript().getParameter({ name: 'custscript_gcs_ftp_guid' })
            }
            return objPreferences;
        }

        /**
         * Pushes a file to an sftp folder
         * @param {*} fileId 
         * @param {*} fileName 
         * @param {*} remoteDirectory 
         * @param {*} replaceExistingFile 
         */
        function uploadFile(fileId, fileName, remoteDirectory, replaceExistingFile, creds) {
            log.debug('uploadFile', creds);

            var valuesObj = creds;
            if (!creds) {
                valuesObj = getSFTPCredentials();
            }

            /// Create sftp Connection
            var sftpConnection = sftp.createConnection(valuesObj);
            var fileLoad = file.load({
                id: fileId
            });
            /// Upload File to SFTP Directory
            sftpConnection.upload({
                directory: './',
                filename: fileName,
                file: fileLoad,
                replaceExisting: replaceExistingFile
            });
            log.debug('uploadFile', 'Uploaded file: ' + fileName);
        }

        //Creates SFTP Connection and downloads files into netsuite as well as removes
        function downloadFiles(creds, folderId, remoteDirectory, fileCriteria) {
            log.debug('downloadFiles', {
                folderId: folderId,
                remoteDirectory: remoteDirectory
            });
            try {
                log.debug('creds', creds);
                //create custom record
                var sftpConnection = sftp.createConnection(creds);
                log.debug('sftpConnection', sftpConnection);
                var arrFiles = [];

                for (let r = 0; remoteDirectory != null &&
                    r < remoteDirectory.length; r++) {
                    //also pull processed directory folder
                    log.debug("Remote directory", remoteDirectory[r]);

                    var arrFilesToDownload = listFilesToDownload(sftpConnection, remoteDirectory[r], folderId);
                    log.debug('arrFilesToDownload', arrFilesToDownload);

                    //D&B doesnt remove the files... soo I grab the files and then pull the one for the day 
                    if (fileCriteria) {
                        arrFilesToDownload = arrFilesToDownload.filter(x => x.filename.includes(fileCriteria));
                    }
                    log.debug('arrFilesToDownload', arrFilesToDownload);

                    for (var i = 0; arrFilesToDownload != null &&
                        i < arrFilesToDownload.length; i++) {
                        try {
                            var fileId = download(sftpConnection,
                                arrFilesToDownload[i].filename,
                                remoteDirectory[r],
                                folderId);
                            log.debug('fileId', fileId);
                            //Have to also add the path so at the end you can delete the correct files/paths.. 
                            //Cant assume the path like original code
                            arrFiles.push({
                                'fileId': fileId,
                                'path': remoteDirectory[r]
                            });
                        } catch (error) {
                            log.error("Error in download", error);
                        }
                    }

                }
                return arrFiles;
            } catch (error) {
                log.error("Error in sftp download", error);
            }
        }

        function deleteFiles(files, overRideCreds) {
            log.debug('deleteFiles', '--Start--');
            try {
                var valuesObj = getSFTPCredentials(overRideCreds);
                log.debug('valuesObj', valuesObj);
                //create custom record
                var sftpConnection = sftp.createConnection(valuesObj);
                log.debug('sftpConnection', sftpConnection);

                for (var i = 0; i < files.length; i++) {
                    log.debug('Remove', files[i]);
                    log.debug('path', files[i].path);
                    log.debug('file', files[i].fileName);
                    sftpConnection.removeFile({
                        path: files[i].path + "/" + files[i].fileName,
                    });
                }
            } catch (error) {
                log.error("Error in sftp delete", error);
            }
        }


        //Called in downloadFiles() to get the list of files in the repo
        function listFilesToDownload(connection, remoteDirectory, destinationFolderId) {
            let stLogTitle = '.listFilesToDownload';
            let arrFilesToDownload = [];
            if (connection && remoteDirectory) {
                let arrRemoteList = connection.list({
                    path: remoteDirectory,
                    sort: sftp.Sort.NAME
                });
                if (arrRemoteList && arrRemoteList.length) {
                    for (let i = 0, len = arrRemoteList.length; i < len; i += 1) {
                        let document = arrRemoteList[i];
                        if (!document.directory) {
                            arrFilesToDownload.push({
                                filename: document.name,
                                folder: destinationFolderId
                            });
                        }
                    }
                }
            }
            log.debug(stLogTitle, 'Files to download=' + JSON.stringify(arrFilesToDownload));
            return arrFilesToDownload;
        }

        //For each file in the directory, download into NS, returns file id
        function download(connection, filename, remoteDirectory, folderId) {
            var stLogTitle = '.download';
            var fileId = null;
            if (connection && filename) {
                var downloadedFile = null;
                try {
                    downloadedFile = connection.download({
                        filename: filename,
                        directory: remoteDirectory
                    });
                } catch (error) {
                    var errMessage = null;
                    if (error.message != undefined) {
                        errMessage = error.name + ': ' + error.message;
                    } else {
                        errMessage = error.toString();
                    }
                    log.error(stLogTitle, 'Inbound transmission failed for file: ' + filename + '| Error=' + errMessage);
                    throw error.create({
                        name: 'Inbound Transmission Failed for File: ' + filename,
                        message: errMessage
                    });
                }
                log.debug(stLogTitle, 'Inbound transmission successful for file: ' + filename);
                downloadedFile.folder = folderId;
                fileId = downloadedFile.save();
            }
            return fileId;
        }

        function getFormattedDate(date) {
            var dt = new Date(date);
            var year = dt.getFullYear();

            var month = (1 + dt.getMonth()).toString();
            month = month.length > 1 ? month : '0' + month;

            var day = dt.getDate().toString();
            day = day.length > 1 ? day : '0' + day;

            return day + '.' + month + '.' + year.toString().substr(-2);
        }

        function createCSVFile(fileID, folderId) {
            log.debug('createCSVFile', fileID)
            //Need columns
            var headerStr = "PAYDEX, Delinquency Score, D&B Rating, Failure Score, D-U-N-S Number, Account Number";
            /*
            Delinquency Score: Customer: Delinquency Score
            D&B Rating: Customer: D&B
            DUNS: Customer: Duns
            Failure Score: Customer: Failure Score
            Paydex: Customer: paydex
            Account Number: Customer: internalid
            */

            // var dummyItem = "dummyItem";
            var fileName = "D&B Import_" + fileID;
            var fileStr = "";
            fileStr += headerStr + '\n';


            var orginalCSVLines = file.load({
                id: fileID
            });
            /*
                        var iterator = orginalCSVLines.lines.iterator();
            //Skip header
            iterator.each(function () {return false;});

            iterator.each(function (line) {
                log.debug('line', line);
                //var lineValues = line.value.split(',');
                //var lineAmount = parseFloat(lineValues[1]);
       
            });*/

            //var arrLines = orginalCSVLines.getContents().split(/\n|\n\r/);
            var fileContents = orginalCSVLines.getContents().split(/\r?\n/);
            log.debug('fileContents', fileContents.length);

            util.each(fileContents, function (myresult) {
                //let row = myresult.split(/[,\t]/);
                let row = myresult.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
                log.debug('ROW', row);
                if (row[6] != 'PAYDEX' && parseInt(row[0]) > 0) {
                    let delScore = row[5];
                    let dnbrating = row[4];
                    let duns = row[2];
                    let failureScore = row[3];
                    let paydex = row[6];
                    let acctNumber = row[0];
                    fileStr += paydex + "," + delScore + "," + dnbrating + "," + failureScore + "," + duns + "," + acctNumber;
                    fileStr += "\n";
                }
            });

            /*
            for (let r = 0; r < arrLines.length; r++) {
                if (r !== 0) {
                    let row = arrLines[r];
                    //log.debug(r, row);
                    row = row.replace(/\"/g, "\"\"");
                    let fields = row.split(',');
                    if (fields.length > 1) {
                        log.debug('fields', fields);
                        let delScore = fields[5];
                        let dnbrating = fields[4];
                        let duns = fields[2];
                        let failureScore = fields[3];
                        let paydex = fields[6];
                        let acctNumber = fields[0];
                        fileStr += paydex + "," + delScore + "," + dnbrating + "," + failureScore + "," + duns + "," + acctNumber;
                        fileStr += "\n";
                    }
                }
            }*/

            var fileObj = file.create({
                name: fileName + ".csv",
                fileType: file.Type.PLAINTEXT,
                contents: fileStr
            });

            fileObj.folder = folderId;
            var fileId = fileObj.save();

            return fileId;
        }

        function isEmpty(value) {
            if (value == null) {
                return true;
            }
            if (value == undefined) {
                return true;
            }
            if (value == 'undefined') {
                return true;
            }
            if (value == '') {
                return true;
            }
            return false;
        }



        return {
            getSFTPCredentials: getSFTPCredentials,
            uploadFile: uploadFile,
            downloadFiles: downloadFiles,
            deleteFiles: deleteFiles,
            getFormattedDate: getFormattedDate,
            createCSVFile: createCSVFile
        }
    });
