sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/table/Row",
    "sap/ui/table/Column",
    "sap/ui/model/Filter",
    'sap/ui/model/FilterOperator',
    "sap/m/Text",
    "sap/m/Label",
    "sap/ui/model/json/JSONModel"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, Row, Column, Filter, FilterOperator, Text, Label, JSONModel) {
        "use strict";

        return Controller.extend("com.pg.xa.fiori.analyzer.app.analyzer.controller.View1", {
            onInit: function () {
                let oModel = new JSONModel({
                    jobStartEnabled: false,
                    objectsTabVisible: false,
                    packageFilter: "",
                    appNameFilter: "",
                    appNameFilterVisible: false
                });
                this.getView().setModel(oModel, "cockpitModel");
            },  

            onObjectsReset: function (oEvent) { 
                let oCockpitModel = this.getView().getModel("cockpitModel");
                oCockpitModel.setProperty("/packageFilter", "");
                oCockpitModel.setProperty("/appNameFilter", "");
                this.onObjectsSearch();
            },

            onObjectsSearch: function(oEvent) { 
                let oCockpitModel = this.getView().getModel("cockpitModel");
                let sPackage = oCockpitModel.getProperty("/packageFilter");
                let sAppName = oCockpitModel.getProperty("/appNameFilter");
                let aFilters = [];

                let oSystemFilter = this._getSystemFilter();
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

            _getSystemFilter: function (){
                let oSystemsComboBox = this.getView().byId("systemsPickBox");
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

            onSelectionChange: function(oEvent) {
                let aSelectedIndicies = oEvent.getSource().getSelectedIndices();
                let bStartButtonEnabled = (aSelectedIndicies && aSelectedIndicies.length !== 0) ? true : false;
                let oCockpitModel = this.getView().getModel("cockpitModel"); 
                oCockpitModel.setProperty("/jobStartEnabled", bStartButtonEnabled);                
            },

            onSystemObjectSelectionChange: function (oEvent) {
                let oSystemsComboBox = this.getView().byId("systemsPickBox");
                let sSystem = oSystemsComboBox.getSelectedKey();
                let oCockpitModel = this.getView().getModel("cockpitModel"); 
                let oObjTypeComboBox = this.getView().byId("objectsTypePickBox");
                let sObjType = oObjTypeComboBox.getSelectedKey();
                let oObjsTable = this.getView().byId("scheduleRunObjects");

                if (sSystem && sObjType) {
                    oCockpitModel.setProperty("/objectsTabVisible", true);
                } else {
                    oCockpitModel.setProperty("/objectsTabVisible", false);
                    return;
                }

                let oFilter = this._getSystemFilter();

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
