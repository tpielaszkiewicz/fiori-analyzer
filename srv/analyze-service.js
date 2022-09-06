const cds = require('@sap/cds')
const path = require('path')
const fs = require('fs/promises');
const { execSync, exec } = require("child_process");

class AnalyzeService extends cds.ApplicationService {
    async init() {

        const { Applications, CustomPackages, Systems, ApplicationPages, AnalyseAppResults, Severity, AnalyseJobApps, AnalysedAppsSummary, AnalyseJobs, AnalyseJobPages, AnalyseJobObjects, AnalyseResults } = this.entities;

        this.on('READ', Applications, async request => {
            return this._forwardRequestToBackendSystem(request, Systems);
        });

        this.on('READ', CustomPackages, async request => {
            return this._forwardRequestToBackendSystem(request, Systems);
        });

        this.on('READ', ApplicationPages, async request => {
            return this._forwardRequestToBackendSystem(request, Systems);
        });

        this.on('READ', AnalyseAppResults, async oRequest => {
            // Check single message read 
            if ((typeof oRequest.params[0]) === 'object' && (oRequest.params[0].messageId)) {
                    let { messageId } = oRequest.params[0]; 
                    if (messageId) {
                        let oMessage = await SELECT.one.from(AnalyseResults).where({ ID: messageId });
                    // Get pagename 
                    let oPageName = await SELECT.one.from(AnalyseJobPages).where({ ID: oMessage.page_ID });
                    // Fill out for every message 
                    let oResponse = {
                        messageId: oMessage.ID,
                        message: oMessage.message,
                        severity_code: oMessage.severity_code,
                        row: oMessage.row,
                        column: oMessage.column,
                        rule: oMessage.rule,
                        pageName: oPageName.pageName,
                        job_job_ID: oPageName.job_ID,
                        job_AppName: oPageName.AppName
                    }

                    if (oRequest.query.SELECT && oRequest.query.SELECT.columns && oRequest.query.SELECT && oRequest.query.SELECT.columns.length > 1 &&
                        oRequest.query.SELECT.columns[1].ref[0] === 'severity' && oRequest.query.SELECT.columns[1].expand) {
                        let oSeverity = await SELECT.one.from(Severity).where({ code: oResponse.severity_code });
                        oResponse.severity = {
                            descr: oSeverity.descr
                        }
                    } 
                    return Promise.resolve(oResponse);
                } 
            } else {
                let sAppName = "";
                let sJobId = "";
                if ((typeof oRequest.params[0]) === 'object') {
                    // Navigate from analysejobapps 
                    let { AppName, job_ID } = oRequest.params[0]; 
                    sAppName = AppName;
                    sJobId = job_ID;
                } else {
                    // Must provide filters for app name and job id 
                    if (!(oRequest.query && oRequest.query.SELECT && oRequest.query.SELECT.where && oRequest.query.SELECT.where.length > 4)) {
                        return Promise.reject({
                            message: `You need to provide job_AppName and job_job_ID filters`,
                            code: 500
                        })
                    }
                    if (!(oRequest.query.SELECT.where[0].ref[0] === 'job_AppName')) {
                        return Promise.reject({
                            message: `You need to provide appName filter on first position`,
                            code: 500
                        })
                    }
                    if (!(oRequest.query.SELECT.where[4].ref[0] === 'job_job_ID')) {
                        return Promise.reject({
                            message: `You need to provide job_ID filter on second position`,
                            code: 500
                        })
                    }
                    // Read the data 
                    sAppName = oRequest.query.SELECT.where[2].val;
                    sJobId = oRequest.query.SELECT.where[6].val;
                }
                
                

                // Get all messages for this particular combination now 
                let aPages = await SELECT.from(AnalyseJobPages).where({
                    job_ID: sJobId,
                    appName: sAppName
                });
                // Get all messages for all the pages 
                let aMessages = await SELECT.from(AnalyseResults).where({ page_ID: { in: aPages.map((oPage) => { return oPage.ID }) } });
                // Fill out for every message 
                let aReturnMessages = [];
                for (let i = 0; i < aMessages.length; i++) {
                    let oMessage = aMessages[i];
                    let aPageNames = aPages.filter(function (oPage) {
                        return oPage.ID === oMessage.page_ID;
                    }.bind(this));
                    let oSeverity = await SELECT.one.from(Severity).where({ code: oMessage.severity_code });
                    aReturnMessages.push({
                        messageId: oMessage.ID,
                        message: oMessage.message,
                        severity_code: oMessage.severity_code,
                        severity: {
                            descr: oSeverity.descr
                        },
                        row: oMessage.row,
                        column: oMessage.column,
                        rule: oMessage.rule,
                        pageName: aPageNames[0].pageName,
                        job_job_ID: sJobId,
                        job_AppName: sAppName
                    });
                }

                return Promise.resolve(aReturnMessages);
                
            }
        });


        this.on('READ', AnalyseJobApps, async oRequest => {
            let sJobId = '';
            let sAppName = '';
            let sSystem = '';
            let bGetLastRun = false; 
            if ((typeof oRequest.params[0]) === 'object') {
                let { job_ID, AppName } = oRequest.params[0];
                sJobId = job_ID;
                sAppName = AppName;
            } else if (oRequest.params[0]) {
                // Navigating from other entity (analyse jobs)
                sJobId = oRequest.params[0];
            } else if (this._checkSystemFilter(oRequest) && oRequest.query.SELECT && oRequest.query.SELECT.where && oRequest.query.SELECT.where.length === 7 && oRequest.query.SELECT.where[6].val) {
                sSystem = this._getSystem(oRequest);
                bGetLastRun = true;

            } else {
                return Promise.reject({
                    message: `You should read this entity only by using association from analyse jobs, reading single entity or filtering by system & islastrun attribute`,
                    code: 500
                })
            }

            // Firstly get app names based on the job  
            let aJobApps = [];
            let aPages = [];
            let aAllSystemJobs = [];
            if (sJobId) {
                aJobApps = (sAppName) ? await SELECT.distinct.from(AnalyseJobPages).columns('appName', 'package').where({
                    job_ID: sJobId,
                    appName: sAppName
                }) : await SELECT.distinct.from(AnalyseJobPages).columns('appName', 'package').where({ job_ID: sJobId });
                // Get analyse results and parse 
                // aPages = await SELECT.from(AnalyseJobPages).where({ job_ID: sJobId });

            } else if (bGetLastRun) {
                // Get all apps for the system and their pages for last runs 
                aAllSystemJobs = await SELECT.from(AnalyseJobs).columns('ID').where({systemID: sSystem});
                // For all system jobs, get distinct apps 
                aJobApps = await SELECT.distinct.from(AnalyseJobPages).columns('appName', 'package').where({ job_ID: {in: aAllSystemJobs.map((oJob) => { return oJob.ID; }) } });

            }     
           
            let aAnalyseJobApps = [];
            for (let i = 0; i < aJobApps.length; i++) { 
                let oSummaryApp = aJobApps[i];
                // Get messages based on job id 
                if (bGetLastRun) {
                    sJobId = await this._getLastJobID(oSummaryApp.appName, aAllSystemJobs, AnalyseJobPages); 
                }

                // Get job id modified at and sysid
                let oJobData = await SELECT.one.from(AnalyseJobs).columns('modifiedAt','systemId').where({ID: sJobId});

                let aJobErrorMessages =  await this._checkJobMessages(sJobId, oSummaryApp.appName, 'E', AnalyseJobPages, AnalyseResults);
                let aJobWarningMessages =  await this._checkJobMessages(sJobId, oSummaryApp.appName, 'W', AnalyseJobPages, AnalyseResults);

                // Get previous job id and messages for it 
                let sPrevJobId = await this._getPreviousJobID(oSummaryApp.appName, sJobId, AnalyseJobPages);
                let aPrevJobErrorMessages = [];
                let aPrevJobWarningMessages = [];
                let oPrevJob = {};
                if (sPrevJobId === sJobId) {
                    aPrevJobErrorMessages = aJobErrorMessages;
                    aPrevJobWarningMessages = aJobWarningMessages;
                } else {
                    aPrevJobErrorMessages = await this._checkJobMessages(sPrevJobId, oSummaryApp.appName, 'E', AnalyseJobPages, AnalyseResults);
                    aPrevJobWarningMessages = await this._checkJobMessages(sPrevJobId, oSummaryApp.appName, 'W', AnalyseJobPages, AnalyseResults);
                    oPrevJob = await SELECT.one.from(AnalyseJobs).columns('modifiedAt').where({ID: sPrevJobId});
                } 

                aAnalyseJobApps.push({
                    AppName: oSummaryApp.appName,
                    job_ID: sJobId,
                    JobAnalyseDate: oJobData.modifiedAt,
                    System: oJobData.systemID,
                    Package: oSummaryApp.package,
                    NoOfErrors: aJobErrorMessages.length,
                    NoOfWarnings: aJobWarningMessages.length,
                    NoOfPrevErrors: aPrevJobErrorMessages.length,
                    NoOfPrevWarnings: aPrevJobWarningMessages.length,
                    PreviousJobID: sPrevJobId,
                    PreviousRunDate: (sPrevJobId === sJobId) ? oJobData.modifiedAt : oPrevJob.modifiedAt,
                    IsLastAppRun: bGetLastRun
                })  
            }
            return Promise.resolve((sAppName) ? aAnalyseJobApps[0] : aAnalyseJobApps);
        });

        this.on('getLastJobId', async oRequest => {
            let { System } = oRequest.data;
            let oJob = await SELECT.one.from(AnalyseJobs).columns('ID').orderBy('modifiedAt desc');
            return oJob.ID;
        });

        this.on('READ', AnalysedAppsSummary, async oRequest => {
            let aJobs = [];
            let aResults = [];
            let sSystem = "";
            if (oRequest.params[0]) {
                let { System, job_ID } = oRequest.params[0];
                // Get specific job 
                let oJob = await SELECT.one.from(AnalyseJobs).columns('ID', 'modifiedAt').where({
                    ID: job_ID,
                    systemID: System,
                    jobObjectsType_code: 'S'
                });
                if (!oJob) {
                    return Promise.reject({
                        message: `Job not found `,
                        code: 404
                    });
                }
                sSystem = System;
                aJobs.push(oJob);
            } else if (this._checkSystemFilter(oRequest)) {
                sSystem = this._getSystem(oRequest);
                // Check for analyse date filter - accept only beetween filter for now for easier implementation
                // Having system filter it means that it must be longer than 3 lines 
                if (oRequest.query && oRequest.query.SELECT && oRequest.query.SELECT.where && oRequest.query.SELECT.where.length === 11) { 
                    let dStartDate = oRequest.query.SELECT.where[6].val;
                    let dEndDate = oRequest.query.SELECT.where[10].val;
                    aJobs = await SELECT.from(AnalyseJobs).columns('ID', 'modifiedAt').where({ systemID: sSystem,
                                                                                                jobObjectsType_code: 'S',
                                                                                               modifiedAt: { between: dStartDate.split('.')[0],
                                                                                                             and: dEndDate.split('.')[0]}
                                                                                            });
                } else {
                    aJobs = await SELECT.from(AnalyseJobs).columns('ID', 'modifiedAt').where({  systemID: sSystem,
                                                                                                jobObjectsType_code: 'S' });
                }
                if (!(aJobs && aJobs.length > 0)) {
                    return Promise.reject({
                        message: `Job not found `,
                        code: 404
                    });
                }
            } else {
                return Promise.reject({
                    message: `Provide system filter value to read entityset or read single entity`,
                    code: 500
                })
            }

            let analyzerService = await this._getBackendForSystem(sSystem, Systems);
            for (let i = 0; i < aJobs.length; i++) {
                let oJob = aJobs[i];
                let aTotalApps = await analyzerService.tx(oRequest).run(SELECT.from('Applications').columns('AppName').where({ CreatedOn: { le: oJob.modifiedAt.split('.')[0] } }));
                let iTotalApps = aTotalApps.length;
                if (iTotalApps > 0) {
                    let aSystemSummary = await this._getJobSummary(oJob.ID, AnalyseJobPages, AnalyseResults);
                    let iFailedApps = 0;
                    let iWarningApps = 0;
                    for (let i = 0; i < aSystemSummary.length; i++) {
                        let oAppSummary = aSystemSummary[i];
                        if (oAppSummary.errorMessages.length !== 0) {
                            iFailedApps++;
                        } else if (oAppSummary.warningMessages.length !== 0) {
                            iWarningApps++
                        }
                    }
                    aResults.push({
                        System: sSystem,
                        job_ID: oJob.ID,
                        AnalyseDate: oJob.modifiedAt,
                        TotalApps: iTotalApps,
                        FailedApps: iFailedApps,
                        WarningApps: iWarningApps,
                        CorrectApps: (iTotalApps > 0) ? aSystemSummary.length - (iWarningApps + iFailedApps) : 0
                    });
                }

                
            }

            return Promise.resolve((oRequest.params[0]) ? aResults[0] : aResults);
        });

        this.on('runAnalyseJob', async oReq => {
            let ID = oReq.params[0];
            let oJob = await SELECT.one.from(AnalyseJobs).columns('*', 'jobObjects').where({ ID: ID });
            if (!oJob) {
                return Promise.reject({
                    message: `Job is not existing`,
                    code: 500
                })
            } else if (oJob.status_code === '1') {
                return Promise.reject({
                    message: `Job is already running`,
                    code: 500
                });
            } else {
                cds.spawn({}, async function (tx) {
                    // Run as job for big amount of data 
                    this._runAnalyseJob(oReq, AnalyseJobs, AnalyseJobObjects, AnalyseJobPages, AnalyseResults, Systems);
                }.bind(this));


                return Promise.resolve({
                    message: 'Run scheduled successfully',
                    code: 201
                });
            }

        });

        return super.init();
    }

    async _checkJobMessages(sJobId, sAppName, sType, AnalyseJobPages, AnalyseResults) {
        // Get all pages for this run 
        let aAnalysePages = await SELECT.from(AnalyseJobPages).columns('ID').where({
            job_ID: sJobId,
            appName: sAppName
        });
        // Check if we have pages with specific message type 
        let aMessagePages = await SELECT.from(AnalyseResults).columns('ID').where({
            severity_code: sType,
            page_ID: { in: aAnalysePages.map((oAnalysePage) => { return oAnalysePage.ID }) }
        });
        return aMessagePages;
    }

    async _getLastJobID(sAppName, aJobs, AnalyseJobPages) {
        let oJobData = await SELECT.one.from(AnalyseJobPages).columns('job_ID').where({
            appName: sAppName,
            job_ID: { in: aJobs.map((oJob) => { return oJob.ID }) }
        }).orderBy({ ref: ['modifiedAt'], sort: 'desc' });
        return oJobData.job_ID;
    }

    async _getPreviousJobID(sAppName, sJobId, AnalyseJobPages) {
        let aJobData = await SELECT.distinct.from(AnalyseJobPages).columns('job_ID', 'modifiedAt').where({
            appName: sAppName 
        }).orderBy({ ref: ['modifiedAt'], sort: 'desc' });
        
        let sPrevJobId = '';
        for (let i = 0; i < aJobData.length; i++) {
            let oJobData = aJobData[i];
            if (oJobData.job_ID === sJobId) {
                if (i !== aJobData.length - 1) {
                    sPrevJobId = aJobData[i+1].job_ID;
                }
            }
        }

        return (sPrevJobId) ? sPrevJobId : sJobId;
    }

    async _getJobSummary(sJobId, AnalyseJobPages, AnalyseResults) {
        let aProcessedApps = await SELECT.distinct.from(AnalyseJobPages).columns('appName', 'package').where({ job_ID: sJobId });
        let aReturnSummary = [];
        for (let i = 0; i < aProcessedApps.length; i++) {
            let oProcessedApp = aProcessedApps[i];
            let aErrorMessages = await this._checkJobMessages(sJobId, oProcessedApp.appName, 'E', AnalyseJobPages, AnalyseResults);
            let aWarningMessages = await this._checkJobMessages(sJobId, oProcessedApp.appName, 'W', AnalyseJobPages, AnalyseResults);
            let oReturnSummary = {
                appName: oProcessedApp.appName,
                package: oProcessedApp.package,
                warningMessages: aWarningMessages,
                errorMessages: aErrorMessages
            }
            aReturnSummary.push(oReturnSummary);
        }

        return aReturnSummary;
    }

   
    async _runAnalyseJob(oReq, AnalyseJobs, AnalyseJobObjects, AnalyseJobPages, AnalyseResults, Systems) {
        let ID = oReq.params[0];
        let oJob = await SELECT.one.from(AnalyseJobs).columns('*', 'jobObjects').where({ ID: ID });

        let aApps;
        let bRetCommit = false;
        let aObjectsList = await SELECT.from(AnalyseJobObjects).where({ job_ID: ID });
        let analyzerService = await this._getBackendForSystem(oJob.systemID, Systems);
        await this._removeReportFile();
        await UPDATE(AnalyseJobs).set({ status_code: '1' }).where({ ID: ID });

        bRetCommit = await cds.tx(async function () {
            try {
                // Remove exisitng analyse results 
                // Test if by composition we are deleting also nested ones 
                await DELETE.from(AnalyseJobPages).where({ job_ID: ID });
                // Start processing 

                // Run through apps 
                aApps = [];
                switch (oJob.jobObjectsType_code) {
                    case 'A':
                        aApps = await analyzerService.tx(oReq).run(SELECT.from('Applications').where({ AppName: { in: aObjectsList.map((oObject) => { return oObject.objectName }) } }));
                        break;
                    case 'P':
                        aApps = await analyzerService.tx(oReq).run(SELECT.from('Applications').where({ Package: { in: aObjectsList.map((oObject) => { return oObject.objectName }) } }));
                        break;
                    default:
                        // Full system scan 
                        aApps = await analyzerService.tx(oReq).run(SELECT.from('Applications'));
                }

                if (aApps && aApps.length !== 0) {
                    let aAppsPromises = aApps.map(async function (oApp) {
                        return this._singleAppAnalysePrepare(oReq, oApp.AppName, oJob.systemID, Systems);
                    }.bind(this));

                    let aResults = await Promise.all(aAppsPromises).then(async function (aResults) {
                        await this._runAnalysys();
                        aApps.forEach(async function (oApp) {
                            let sBasePath = path.join(__dirname, 'analyze-container/' + oApp.AppName);
                            await fs.rm(sBasePath, { recursive: true });
                        }.bind(this));
                        return this._parseAnalysisResults();
                    }.bind(this));
                    // Do one by one to avoid overriding report.json file 

                    let aNewPageResults = aResults.map(function (oResult) {
                        // Get package 
                        let sPackage = aApps.filter((oApp) => { return oApp.AppName === oResult.appName; })[0].Package;
                        return Object.assign(oResult, { package: sPackage, job_ID: ID });
                    }.bind(this));

                    await INSERT.into(AnalyseJobPages).entries(aNewPageResults);
                }
                await UPDATE(AnalyseJobs).set({ status_code: '2' }).where({ ID: ID });
                // return true to handle return commit and update status if failed 
                return true;
            } catch (err) {
                return false;
            }
        }.bind(this));

        if (!bRetCommit) {
            await UPDATE(AnalyseJobs).set({ status_code: '3' }).where({ ID: ID });
            // Clean up folders if existing 
            if (aApps && aApps.length !== 0) {
                aApps.forEach(async function (oApp) {
                    let sBasePath = path.join(__dirname, 'analyze-container/' + oApp.AppName);
                    try {
                        const stat = await fs.stat(sBasePath);
                        if (stat.isDirectory()) {
                            await fs.rm(sBasePath, { recursive: true });
                        }
                    } catch (err) {
                        // Nothing to cleanup in here
                    }
                }.bind(this));
            }
        }
    }

    async _parseAnalysisResults() {
        let sBasePath = path.join(__dirname, 'analyze-container/report.json');
        try {
            let sResults = await fs.readFile(sBasePath, 'utf8');
            let aResults = JSON.parse(`{"results":${sResults}}`).results;
            return aResults.map((oResult) => {
                let aAppAndPageName = oResult.filePath.replace(path.join(__dirname, 'analyze-container/'), "").split("/");
                return {
                    appName: aAppAndPageName[0],
                    pageName: aAppAndPageName[1].replaceAll("_", "/"),
                    analyseResults: oResult.messages.map((oMessage) => {
                        return {
                            message: oMessage.message,
                            rule: oMessage.ruleId,
                            row: oMessage.line,
                            column: oMessage.column,
                            severity_code: (oMessage.severity === 1) ? "W" : "E"
                        }
                    })
                }
            });
        } catch (err) {
            console.error(err);
        }
    }

    async _singleAppAnalysePrepare(oReq, sAppName, sSystem, Systems) {
        let analyzerService = await this._getBackendForSystem(sSystem, Systems);
        let aAppPages = await analyzerService.tx(oReq).run(SELECT.from('ApplicationPages').where({ AppName: sAppName }));
        let sBasePath = path.join(__dirname, 'analyze-container/' + sAppName);
        await fs.mkdir(sBasePath);
        let aFileUploadPromises = aAppPages.map(function (oAppPage) {
            return this._createFile(sBasePath, oAppPage.PageName, oAppPage.PageContent);
        }.bind(this));
        return Promise.all(aFileUploadPromises);
    }

    async _connectToBackend(sDestination) {
        // First of all set the destination - dynamically
        cds.env.requires.zbtp_fiori_analyzer_srv.credentials = Object.assign(cds.env.requires.zbtp_fiori_analyzer_srv.credentials,
            { destination: sDestination });
        // Connect to on premiseservice.
        return await cds.connect.to('zbtp_fiori_analyzer_srv');
    }

    async _forwardRequestToBackendSystem(oRequest, Systems) {
        let analyzerService;
        if (oRequest.params && oRequest.params.length !== 0) {
            let { System } = oRequest.params[0];
            analyzerService = await this._getBackendForSystem(System, Systems);
            return analyzerService.tx(oRequest).run(oRequest.query).then((oEntry) => {
                oEntry.System = System;
                return oEntry;
            });
        } else if (this._checkSystemFilter(oRequest)) {
            let sSystem = this._getSystem(oRequest);
            let oUpdatedRequest = this._getAdjustedSystemFilter(oRequest);
            // Get system destination from table (select/await)
            analyzerService = await this._getBackendForSystem(sSystem, Systems);
            return analyzerService.tx(oUpdatedRequest).run(oUpdatedRequest.query).then((aEntries) => {
                return aEntries.map((oEntry) => {
                    oEntry.System = sSystem;
                    return oEntry;
                })
            });
        } else {
            return Promise.reject({
                message: `You have to provide single system filter value on a first position`,
                code: 500
            })
        }
    }

    async _createFile(sBasePath, sFileName, sFileContent) {

        let sDirectory = sBasePath + "/" + sFileName.replaceAll("/", "_");
        try {
            await fs.writeFile(sDirectory, Buffer.from(sFileContent, "utf-8"));
        } catch (oError) {
            return Promise.reject(oError);
        }
    }

    async _getBackendForSystem(sSystem, Systems) {
        let oSystemMasterEntry = await SELECT.one.from(Systems).columns("destination").where({ systemID: sSystem });
        return await this._connectToBackend(oSystemMasterEntry.destination);
    }

    async _removeReportFile() {
        let sBasePath = path.join(__dirname, 'analyze-container/report.json');
        try {
            const stat = await fs.stat(sBasePath);
            if (stat.isFile()) {
                await fs.unlink(sBasePath);
            }
        } catch (err) {
            // Nothing to be deleted
        }
    }

    _runAnalysys() {
        return new Promise((resolve, reject) => {
            exec('npm run lint-analyze', (err, stout, sterr) => {
                if (err) {
                    resolve('ESLint analysis run done, errors occurred');
                } else {
                    resolve('ESLint analysis run done, no errors occurred');
                }
            });
        });
    }

    _checkSystemFilter(oRequest) {
        return (oRequest.query && oRequest.query.SELECT && oRequest.query.SELECT.where && oRequest.query.SELECT.where.length !== 0 &&
            oRequest.query.SELECT.where[0].ref[0] === 'System') ? true : false;
    }

    _getSystem(oRequest) {
        if (this._checkSystemFilter(oRequest)) {
            return oRequest.query.SELECT.where[2].val;
        }
    }

    _getAdjustedSystemFilter(oRequest) {
        if (this._checkSystemFilter(oRequest)) {
            if (oRequest.query.SELECT.where.length === 3) { // Single filter 
                delete oRequest.query.SELECT.where;
            } else if (oRequest.query.SELECT.where.length > 4) {
                oRequest.query.SELECT.where.splice(0, 4);
            }
            return oRequest;
        }
    }
}

module.exports = { AnalyzeService }
