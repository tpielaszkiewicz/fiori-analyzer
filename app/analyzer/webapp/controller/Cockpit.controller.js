sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/table/Row",
    "sap/ui/table/Column",
    "sap/ui/model/Filter",
    'sap/ui/model/FilterOperator',
    "sap/m/Text",
    "sap/m/MessageBox",
    "sap/m/Label",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/Fragment",
    'sap/viz/ui5/data/FlattenedDataset',
    'sap/viz/ui5/controls/common/feeds/FeedItem',
    'sap/viz/ui5/format/ChartFormatter',
    "sap/suite/ui/commons/ChartContainerContent",
    "sap/viz/ui5/controls/VizFrame"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, Row, Column, Filter, FilterOperator, Text, MessageBox, Label, JSONModel, Fragment, FlattenedDataset, FeedItem, ChartFormatter, ChartContainerContent, VizFrame) {
        "use strict";

        return Controller.extend("com.pg.xa.fiori.analyzer.app.analyzer.controller.Cockpit", {
            _vizChartDataset: {
                dimensions: [{
                    name: 'AnalyseDate',
                    value: "{analyseChartModel>AnalyseDate}"
                }],
                measures: [{
                    group: 1,
                    name: 'FailedApps',
                    value: '{analyseChartModel>FailedApps}'
                },  {
                    group: 1,
                    name: "WarningApps",
                    value: "{analyseChartModel>WarningApps}"
                }, {
                    group: 1,
                    name: "CorrectApps",
                    value: "{analyseChartModel>CorrectApps}"
                }],
                data: {
                    path: "analyseChartModel>/AnalyseRuns"
                }
            },
            _vizChartFeedItems: [{
                'uid': "valueAxis",
                'type': "Measure",
                'values': ["FailedApps", "WarningApps", "CorrectApps"]
            }, {
                'uid': "categoryAxis",
                'type': "Dimension",
                'values': ["AnalyseDate"]
            }],
            onInit: function () {
                let oModel = new JSONModel({
                    jobStartEnabled: false,
                    objectsTabVisible: false,
                    selectedSystem: "",
                    selectedJobType: "",
                    packageFilter: "",
                    appNameFilter: "",
                    appNameFilterVisible: false,
                    jobName: "",
                    deleteRunEnabled: false,
                    startRunEnabled: false,
                    confirmJobEnabled: false

                });
                this.getView().setModel(oModel, "cockpitModel");

            },

            handleTrendsDateChange: function(oEvent) {
                this._requestChartData();
            }, 

            onJobNameChange: function (oEvent) {
                let sValue = oEvent.getSource().getValue();
                let oModel = this.getView().getModel("cockpitModel");
                oModel.setProperty("/confirmJobEnabled", (sValue) ? true : false);
            },

            onObjectsReset: function (oEvent) {
                let oCockpitModel = this.getView().getModel("cockpitModel");
                oCockpitModel.setProperty("/packageFilter", "");
                oCockpitModel.setProperty("/appNameFilter", "");
                this.onObjectsSearch();
            },

            onObjectsSearch: function (oEvent) {
                let oCockpitModel = this.getView().getModel("cockpitModel");
                let sPackage = oCockpitModel.getProperty("/packageFilter");
                let sAppName = oCockpitModel.getProperty("/appNameFilter");
                let aFilters = [];

                let oSystemFilter = this._getSystemFilter("systemsPickBox");
                if (!oSystemFilter) {
                    return;
                }

                aFilters.push(oSystemFilter);

                if (sPackage) {
                    let oPackageFilter = new Filter({
                        path: "Package",
                        operator: FilterOperator.Contains,
                        value1: sPackage
                    });
                    aFilters.push(oPackageFilter);
                }

                if (sAppName) {
                    let oAppNameFilter = new Filter({
                        path: "AppName",
                        operator: FilterOperator.Contains,
                        value1: sAppName
                    });
                    aFilters.push(oAppNameFilter);
                }

                let oObjsTable = this.getView().byId("scheduleRunObjects");
                oObjsTable.getBinding("rows").filter([new Filter({
                    filters: aFilters,
                    bAnd: true
                })]);
            },

            _getSystemFilter: function (sId) {
                let oSystemsComboBox = this.getView().byId(sId);
                let sSystem = oSystemsComboBox.getSelectedKey();

                if (!sSystem) {
                    return;
                }

                return new Filter({
                    path: "System",
                    operator: FilterOperator.EQ,
                    value1: sSystem
                });
            },

            onSelectionChange: function (oEvent) {
                let aSelectedIndicies = oEvent.getSource().getSelectedIndices();
                let bStartButtonEnabled = (aSelectedIndicies && aSelectedIndicies.length !== 0) ? true : false;
                let oCockpitModel = this.getView().getModel("cockpitModel");
                oCockpitModel.setProperty("/jobStartEnabled", bStartButtonEnabled);
            },

            onJobAbort: function (oEvent) {
                this._confirmJobDialog.then((oDialog) => oDialog.close());
            },

            onJobConfirm: function (oEvent) {
                let oJobsTable = this.getView().byId("analyseJobsTab");
                let oBindingContext = oJobsTable.getBinding("rows");
                let oModel = this.getView().getModel("cockpitModel");
                let oObjectsTable = this.getView().byId("scheduleRunObjects");
                let aSelectedIndices = oObjectsTable.getSelectedIndices();
                // let aRows = oObjectsTable.getRows();
                let oNewContext = oBindingContext.create({
                    "systemID": oModel.getProperty("/selectedSystem"),
                    "jobName": oModel.getProperty("/jobName"),
                    "jobObjectsType_code": oModel.getProperty("/selectedJobType"),
                    "status_code": "0",
                    "jobObjects": aSelectedIndices.map(function (iSelectedInd) {
                        // let oRow = aRows[iSelectedInd];
                        return {
                            objectName: (oModel.getProperty("/selectedJobType") === "A") ? oObjectsTable.getContextByIndex(iSelectedInd).getObject().AppName : oObjectsTable.getContextByIndex(iSelectedInd).getObject().Package
                        }
                    }.bind(this))
                });

                // Note: This promise fails only if the transient entity is deleted
                oNewContext.created().then(function () {
                    // sales order successfully created
                    oJobsTable.getBinding("rows").refresh();
                    MessageBox.information("Job has been created");
                }.bind(this), function (oError) {
                    MessageBox.error("Job creation failed");
                }.bind(this));

                this._confirmJobDialog.then((oDialog) => oDialog.close());
            },

            onRefreshJobs: function (oEvent) {
                let oJobsTable = this.getView().byId("analyseJobsTab");
                oJobsTable.getBinding("rows").refresh();
            },

            onDeleteJobs: function (oEvent) {
                let oJobsTable = this.getView().byId("analyseJobsTab");
                let aSelectedIndices = oJobsTable.getSelectedIndices();
                // let aRows = oJobsTable.getRows();
                for (let i = 0; i < aSelectedIndices.length; i++) {
                    // let oRow = aRows[aSelectedIndices[i]];
                    let oRowBindingContext = oJobsTable.getContextByIndex(aSelectedIndices[i]);
                    oRowBindingContext.delete().then(function () {
                        // sales order successfully created
                        oJobsTable.getBinding("rows").refresh();
                        MessageBox.information("Job has been deleted");
                    }.bind(this), function (oError) {
                        MessageBox.error("Job deletion failed");
                    }.bind(this));
                }
            },

            onAnalyseRunStart: function (oEvent) {
                let oModel = this.getView().getModel();
                let oJobsTable = this.getView().byId("analyseJobsTab");
                let aSelectedIndices = oJobsTable.getSelectedIndices();
                // let aRows = oJobsTable.getRows();
                for (let i = 0; i < aSelectedIndices.length; i++) {
                    // let oRow = aRows[aSelectedIndices[i]];
                    let oRowBindingContext = oJobsTable.getContextByIndex(aSelectedIndices[i]);
                    if (oRowBindingContext.getObject().status.code !== "1") {
                        let oAction = oModel.bindContext("AnalyzeService.runAnalyseJob(...)", oRowBindingContext);
                        oAction.execute().then(function (oResp) {
                            MessageBox.information("Job has been started");
                        }.bind(this), function (oError) {
                            MessageBox.error("Job start failed");
                        }.bind(this));
                    }
                }
            },

            onJobRowSelectionChange: function (oEvent) {
                let oJobsTable = this.getView().byId("analyseJobsTab");
                let aSelectedIndices = oJobsTable.getSelectedIndices();
                // let aRows = oJobsTable.getRows();
                let bJobStartEnabled = false;
                let bJobDeleteEnabled = false;
                for (let i = 0; i < aSelectedIndices.length; i++) {
                    // let oRow = aRows[aSelectedIndices[i]];
                    let oRowBindingContext = oJobsTable.getContextByIndex(aSelectedIndices[i]);
                    if (oRowBindingContext.getObject().status.code === "0" || oRowBindingContext.getObject().status.code === "3") {
                        bJobDeleteEnabled = true;
                    }
                    if (oRowBindingContext.getObject().status.code !== "1") {
                        bJobStartEnabled = true;
                    }
                }

                let oCockpitModel = this.getView().getModel("cockpitModel");
                oCockpitModel.setProperty("/deleteRunEnabled", true);
                oCockpitModel.setProperty("/startRunEnabled", bJobStartEnabled);
            },

            onJobNavigate: function (oEvent) {
                let oSourceJob = oEvent.getSource();
                let oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("RouteJobDetails", {
                    jobId: oSourceJob.getBindingContext().getObject().ID
                });
            },

            onAppNavigate: function (oEvent) {
                let oSourceJob = oEvent.getSource();
                let oRouter = this.getOwnerComponent().getRouter();
                let oCockpitModel = this.getView().getModel("cockpitModel");
                oRouter.navTo("RouteAppAnalyze", {
                    jobId: oSourceJob.getBindingContext().getObject().job_ID,
                    appName: oSourceJob.getBindingContext().getObject().AppName 
                });
            },

            onSystemResultsSelectionChange: function (oEvent) {
                let oCockpitModel = this.getView().getModel("cockpitModel");
                let sSystem = oCockpitModel.getProperty("/selectedSystemResults");
                let oMicroChart = this.getView().byId("analysedAppsSummaryChart");
                let oModel = this.getView().getModel();
                let oOperation = oModel.bindContext(`/getLastJobId(...)`);

                // Execute function
                oOperation.setParameter("System", sSystem);
                oOperation.execute().then(function () {
                    let sLastJobId = oOperation.getBoundContext().getObject()["value"];
                    let oContext = oModel.createBindingContext(`/AnalysedAppsSummary(System='${sSystem}',job_ID=${sLastJobId})`);
                    oMicroChart.setBindingContext(oContext);
                }.bind(this), function (oError) {
                    oMicroChart.unbindContext();
                }.bind(this));

                let olastRunFilter = new Filter({
                    path: "IsLastAppRun",
                    operator: FilterOperator.EQ,
                    value1: true
                });

                // Rebind table with apps 
                let oAnalysedAppsTable = this.getView().byId("analysedAppsTab");
                oAnalysedAppsTable.bindRows({
                    path: "/AnalyseJobApps",
                    filters: [new Filter({
                        filters: [this._getSystemFilter("systemsPickBoxResults"),
                                  olastRunFilter],
                        bAnd: true })]
                });

                // Rebind charts
                this._requestChartData();
            },

        

            _requestChartData: function(){
                let oCockpitModel = this.getView().getModel("cockpitModel");
                let sSystem = oCockpitModel.getProperty("/selectedSystemResults");

                if (!(sSystem)) {
                    this._renderChart([]);
                    return; 
                }

                let oModel = this.getView().getModel();
                let aSystemFilters = [new Filter({
                    path: "System",
                    operator: FilterOperator.EQ,
                    value1: sSystem
                })];

                // Check if dates are provided 
                let oDatePicker = this.getView().byId("trendsDateRange");
                if (oDatePicker.getValue()){
                    let oFromDate = oDatePicker.getDateValue();
                    oFromDate.setHours(12);
                    let oToDate = oDatePicker.getSecondDateValue();
                    oToDate.setHours(12);
                    let oSystemFilter = new Filter({
                        path: "AnalyseDate",
                        operator: FilterOperator.BT,
                        value1: oFromDate.toISOString(),
                        value2: oToDate.toISOString()
                    });

                    aSystemFilters.push(oSystemFilter);
                }

                let oList = oModel.bindList("/AnalysedAppsSummary", null, null, new Filter({
                    filters: aSystemFilters,
                    bAnd: true
                }));
                oList.requestContexts().then(function (aContexts) { 
                    this._renderChart(aContexts);
                }.bind(this));
            }, 

            _renderChart(aContexts) {
                let oOldChart = this.getView().byId("analyseRunChartContainer");
                if (oOldChart) {
                    oOldChart.destroy();
                }

                // Set up new one - refreshing issue 
                let oChartModel = new JSONModel({
                    AnalyseRuns: aContexts.map((oContext) => {
                        let oObject = oContext.getObject();
                        return {
                            job_ID: oObject.job_ID,
                            AnalyseDate: oObject.AnalyseDate.split('.')[0].replaceAll("T", " "),
                            TotalApps: oObject.TotalApps,
                            FailedApps: oObject.FailedApps,
                            WarningApps: oObject.WarningApps,
                            CorrectApps: oObject.CorrectApps
                        }
                    })
                });

                let oDataset = new FlattenedDataset(this._vizChartDataset);
                let oVizFrame = new VizFrame({
                    width: "100%",
                    height: "40rem"
                });
                let oChartContainer = new ChartContainerContent(
                   this.getView().getId() + "--analyseRunChartContainer", {
                        content : [oVizFrame]                     
                   }
                );

                let oContainer = this.getView().byId("chartContainerBox");
                oContainer.addItem(oChartContainer);
                oVizFrame.setVizProperties({
                    title: {
                        text: "System trends"
                    },
                    plotArea: {
                        colorPalette: ['#b00','#df6e0c','#107e3e'],
                        series: [
                            {
                                dataContext: { "measureNames": "FailedApps" }, "stack": "b",
                                "properties": {
                                    "color": "sapUiChartPaletteQualitativeHue1"
                                }
                            },
                            {
                                dataContext: { "measureNames": "WarningApps" }, "stack": "b", "properties": {
                                    "color": "sapUiChartPaletteQualitativeHue1"
                                }
                            },
                            {
                                dataContext: { "measureNames": "CorrectApps" }, "stack": "b", "properties": {
                                    "color": "sapUiChartPaletteQualitativeHue1"
                                }
                            }
                        ],
                        dataLabel: {
                            visible: true,
                            showTotal: true
                        } 
                    }
                });
                oVizFrame.setDataset(oDataset);
                oVizFrame.setModel(oChartModel, "analyseChartModel");
                this._addFeedItems(oVizFrame, this._vizChartFeedItems);
                oVizFrame.setVizType('stacked_column'); 
            },

            _addFeedItems: function (vizFrame, feedItems) {
                vizFrame.destroyFeeds();
                for (var i = 0; i < feedItems.length; i++) {
                    vizFrame.addFeed(new FeedItem(feedItems[i]));
                }
            },

            onCreateJob: function (oEvent) {
                if (!this._confirmJobDialog) {
                    this._confirmJobDialog = Fragment.load({
                        name: "com.pg.xa.fiori.analyzer.app.analyzer.fragments.JobDetailsInput",
                        controller: this
                    });
                }

                this._confirmJobDialog.then(function (oDialog) {
                    let oCockpitModel = this.getView().getModel("cockpitModel");
                    oCockpitModel.setProperty("/jobName", "");
                    oCockpitModel.setProperty("/confirmJobEnabled", false);
                    oDialog.setModel(oCockpitModel, "cockpitModel");
                    oDialog.setModel(this.getView().getModel("i18n"), "i18n");
                    oDialog.open();
                }.bind(this));

            },

            onSystemObjectSelectionChange: function (oEvent) {
                let oSystemsComboBox = this.getView().byId("systemsPickBox");
                let sSystem = oSystemsComboBox.getSelectedKey();
                let oCockpitModel = this.getView().getModel("cockpitModel");
                let oObjTypeComboBox = this.getView().byId("objectsTypePickBox");
                let sObjType = oObjTypeComboBox.getSelectedKey();
                let oObjsTable = this.getView().byId("scheduleRunObjects");

                if (sSystem && sObjType && sObjType !== 'S') {
                    oCockpitModel.setProperty("/objectsTabVisible", true);
                } else {
                    if (sObjType === 'S') {
                        oCockpitModel.setProperty("/jobStartEnabled", true);
                    }
                    oCockpitModel.setProperty("/objectsTabVisible", false);
                    return;
                }

                let oFilter = this._getSystemFilter("systemsPickBox");

                let sPath = (sObjType === "P") ? "/CustomPackages" : "/Applications";

                oObjsTable.removeAllColumns();
                if (sObjType === "A") {
                    oObjsTable.addColumn(new Column({
                        label: new Label({ text: "{i18n>AppName}" }),
                        template: new Text({ text: "{AppName}" })
                    }));
                }
                oObjsTable.addColumn(new Column({
                    label: new Label({ text: "{i18n>Package}" }),
                    template: new Text({ text: "{Package}" })
                }));
                oObjsTable.addColumn(new Column({
                    label: new Label({ text: "{i18n>Description}" }),
                    template: new Text({ text: "{Description}" })
                }));
                oObjsTable.bindRows({
                    path: sPath,
                    filters: [oFilter]
                }
                );

                let bAppNameFilterVisible = (sObjType === "P") ? false : true;
                oCockpitModel.setProperty("/appNameFilterVisible", bAppNameFilterVisible);
            }
        });
    });
