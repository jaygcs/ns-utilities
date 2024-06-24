const env = require('./env');

const child = require('child_process');
const fs = require('fs');
const https = require('https');

// find modified files
let files = [];
let lines = child.execSync('git diff --name-only').toString().split(/\n/);

lines.forEach((line) => {
    if(line.match(/suitescript/)) {
        files.push(line.trim());
    }
});

files.forEach((file) => {

    let folder = env.FOLDER_BASE;
    let folder_label = 'SuiteScripts/GCS';
    if(file.match(/portlets/)) {
        folder = env.FOLDER_PORTLETS;
        folder_label += '/portlets';
    }
    else if(file.match(/scheduled/)) {
        folder = env.FOLDER_SCHEDULED;
        folder_label += '/scheduled';
    }    
    else if(file.match(/workflow/)) {
        folder = env.FOLDER_WORKFLOW,
        folder_label += '/workflow';
    }

    let type = 'js';
    if(file.match(/\.html/)) {
        type = 'html';
    }
    else if(file.match(/\.css/)) {
        type = 'css';
    }

    let tokens = file.split(/\//);
    let file_name = tokens.pop();

    console.log('Uploading ' + file_name + ' to ' + folder_label);

    let data = { type: type, folder: folder, name: file_name, bytes: fs.readFileSync(file).toString() };

    const req = https.request({
        host: env.FILE_UPLOAD_PRODUCTION.host,            
        port: 443,            
        path: env.FILE_UPLOAD_PRODUCTION.path,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }            
    }, (res) => {  
        let rawData = '';
        res.on('data', (chunk) => { rawData += chunk; });
        res.on('end', () => {
            console.log('Response: ' + rawData);        
        });                  
    });
    
    req.write(JSON.stringify(data));
    req.end();     

});