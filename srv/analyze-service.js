const cds = require('@sap/cds')
const path = require('path')
const fs = require('fs/promises');
const { execSync, exec } = require("child_process");

class AnalyzeService extends cds.ApplicationService {
    async init() {

        const { Applications, CustomPackages, Systems, AnalyseJobs, AnalyseJobPages, AnalyseJobObjects, AnalyseResults } = this.entities;

        this.on('READ', Applications, async request => {
            return this._forwardRequestToBackendSystem(request, Systems);
        });

        this.on('READ', CustomPackages, async request => {
            return this._forwardRequestToBackendSystem(request, Systems);
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
                aApps = (oJob.jobObjectsType_code == 'A') ? await analyzerService.tx(oReq).run(SELECT.from('Applications').where({ AppName: { in: aObjectsList.map((oObject) => { return oObject.objectName }) } })) :
                    await analyzerService.tx(oReq).run(SELECT.from('Applications').where({ Package: { in: aObjectsList.map((oObject) => { return oObject.objectName }) } }));
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
                        let sPackage = aApps.filter((oApp) => { return oApp.AppName = oResult.appName; })[0].Package;
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
