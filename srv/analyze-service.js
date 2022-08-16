const cds = require('@sap/cds')
const { retrieveJwt } = require("@sap-cloud-sdk/core");
const path = require('path')
const fs = require('fs/promises');
const { constants } = require('fs');
const { execSync, exec } = require("child_process");

class AnalyzeService extends cds.ApplicationService {
    async init() {

        const { Applications, CustomPackages, Systems } = this.entities;

        this.on('READ', Applications, async request => {
            return this._forwardRequestToBackendSystem(request, Systems);
        });

        this.on('READ', CustomPackages, async request => {
            return this._forwardRequestToBackendSystem(request, Systems);
        });

        this.on('runPackageAnalyse', async oReq => {
            let { Package, System } = oReq.params[0];
            let analyzerService = await this._getBackendForSystem(System, Systems);
            let aPackageApps = await analyzerService.tx(oReq).run(SELECT.from('Applications').where({Package: Package}));
            this._removeReportFile();
            let aAppsPromises = aPackageApps.map(function(oPackageApp) {
                return this._singleAppAnalyse(oReq, oPackageApp.AppName, System, Systems, false);
            }.bind(this));
            return await Promise.all(aAppsPromises).then(function (aPromiseResponses) {
                let sAnalysisResult = `${Package} Package analysis:`;
                for (let iResponse in aPromiseResponses) {
                    sAnalysisResult = `${sAnalysisResult} ${aPromiseResponses[iResponse]},\n`;
                }
                return sAnalysisResult;
            }.bind(this)); 
        });

        this.on('runApplicationAnalyse', async oReq => {
            let { AppName, System } = oReq.params[0];
            return await this._singleAppAnalyse(oReq, AppName, System, Systems, true);
            
        });

        return super.init();
    }

    async _singleAppAnalyse(oReq, sAppName, sSystem, Systems, bRemoveReport) {
        if (bRemoveReport) {
            await this._removeReportFile();
        }
        let analyzerService = await this._getBackendForSystem(sSystem, Systems);
        let aAppPages = await analyzerService.tx(oReq).run(SELECT.from('ApplicationPages').where({ AppName: sAppName }));
        let sBasePath = path.join(__dirname, 'analyze-container/' + sAppName); 
        await fs.mkdir(sBasePath);
        let aFileUploadPromises = aAppPages.map(function (oAppPage) {
            return this._createFile(sBasePath, oAppPage.PageName, oAppPage.PageContent);
        }.bind(this));
        return await Promise.all(aFileUploadPromises).then(function () {
            return this._runAnalysys();
        }.bind(this)).then(async function (sResponse) {
            // let aFileDeletePromises = aAppPages.map(function (oAppPage) {
            //     return this._removeFile(oAppPage.PageName);
            // }.bind(this));
            // return await Promise.all(aFileDeletePromises).then(() => { return `${sAppName}: ${sResponse}`; });
            await fs.rm(sBasePath, { recursive: true });
            return Promise.resolve(`${sAppName}: ${sResponse}`);
        }.bind(this));
    }

    async _connectToBackend(sDestination) {
        // First of all set the destination - dynamically
        cds.env.requires.zbtp_fiori_analyzer_srv.credentials = Object.assign(cds.env.requires.zbtp_fiori_analyzer_srv.credentials,
            { destination: sDestination });
        // Connect to on premiseservice.
        return await cds.connect.to('zbtp_fiori_analyzer_srv');
    }

    async _forwardRequestToBackendSystem(oRequest, Systems) {
        if (oRequest.params && oRequest.params.length !== 0) {
            let { System } = oRequest.params[0];
            let analyzerService = await this._getBackendForSystem(System, Systems);
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
        const stat = await fs.stat(sBasePath);
        if (stat.isFile()) {
            await fs.unlink(sBasePath);
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
