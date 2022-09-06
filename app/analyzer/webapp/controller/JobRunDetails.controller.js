sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, History) {
        "use strict";

        return Controller.extend("com.pg.xa.fiori.analyzer.app.analyzer.controller.JobRunDetails", {
            onInit: function () {
                var oRouter = this.getOwnerComponent().getRouter();
                oRouter.getRoute("RouteJobDetails").attachPatternMatched(this._onObjectMatched, this);
            },
            _onObjectMatched: function (oEvent) {
                let sJobID = oEvent.getParameter("arguments").jobId;
                this.getView().bindElement({
                     path: "/AnalyseJobs(" + sJobID + ")"
                });

                // Bind table separately 
                let oAppsTab = this.getView().byId("analysedAppsTab");
                oAppsTab.bindRows("/AnalyseJobs(" + sJobID + ")/analysedApps");
            },

            onAppNavigate: function(oEvent) {
                let oSourceJob = oEvent.getSource();
                let oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("RouteAppAnalyze", {
                    jobId: oSourceJob.getBindingContext().getObject().job_ID,
                    appName: oSourceJob.getBindingContext().getObject().AppName 
                });
            },

            onNavBack: function(oEvent) {
                var oHistory = History.getInstance();
                var sPreviousHash = oHistory.getPreviousHash();
    
                if (sPreviousHash) {
                    window.history.go(-1);
                } else {
                    var oRouter = this.getOwnerComponent().getRouter();
                    oRouter.navTo("RouteCockpit", {}, true);
                }
            }
            
        });
    });
