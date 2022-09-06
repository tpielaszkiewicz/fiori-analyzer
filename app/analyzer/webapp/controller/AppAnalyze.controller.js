sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History",
    "sap/ui/model/Filter",
    'sap/ui/model/FilterOperator'
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, History, Filter, FilterOperator) {
        "use strict";

        return Controller.extend("com.pg.xa.fiori.analyzer.app.analyzer.controller.AppAnalyze", {
            _iMessageRow: 0,
            _sMessageType: "",
            onInit: function () {
                var oRouter = this.getOwnerComponent().getRouter();
                oRouter.getRoute("RouteAppAnalyze").attachPatternMatched(this._onObjectMatched, this);
                let oCodeEditor = this.getView().byId("codeEditor");
                oCodeEditor.setBusyIndicatorDelay(0);
                let myDelegate = {
                    "onAfterRendering": function () {
                        // Should be replaced with some event after code editor dom nodes are inserted into dom
                        // For now without timeout it fails during first onAfterRendering event 
                        let oCodeEditor = this.getView().byId("codeEditor");
                        this.intersectionObserver = new IntersectionObserver(function (entries) {
                            let aCodeEditorLines = oCodeEditor.$()[0].querySelectorAll('.ace_line_group');
                            if (aCodeEditorLines.length >= this._iMessageRow) {
                                for (let i = 0; i < aCodeEditorLines.length; i++) {
                                    if (i === this._iMessageRow - 1) {
                                        aCodeEditorLines[i].style.background = (this._sMessageType === 'E') ? '#ef4a19' : '#e2ef19';
                                    } else {
                                        aCodeEditorLines[i].style.background = "";
                                    }
                                }
                            } 
                        }.bind(this));
                        this.intersectionObserver.observe(oCodeEditor.getDomRef()); 
                    }.bind(this)
                };
                oCodeEditor.addEventDelegate(myDelegate, this);
            },

            onCodeChange: function (oEvent) {
                document.getElementsByClassName("ace_line_group");
            },

            _onObjectMatched: function (oEvent) {
                let oCodeEditor = this.getView().byId("codeEditor");
                oCodeEditor.unbindProperty("value");
                this._sjobID = oEvent.getParameter("arguments").jobId;
                this._sAppName = oEvent.getParameter("arguments").appName;
                 
                // Bind view 
                this.getView().bindElement({
                    path: `/AnalyseJobApps(AppName='${this._sAppName}',job_ID=${this._sjobID})`
                });

                // Bind table 
                let oMessagesTable = this.getView().byId("messagesTab");
                // let oAppNameFilter = new Filter({
                //     path: "job_AppName",
                //     operator: FilterOperator.EQ,
                //     value1: this._sAppName
                // });
                // let oJobIDFilter = new Filter({
                //     path: "job_job_ID",
                //     operator: FilterOperator.EQ,
                //     value1: this._sjobID
                // });
                oMessagesTable.bindRows({
                    // path: "/AnalyseAppResults",
                    path: `/AnalyseJobApps(AppName='${this._sAppName}',job_ID=${this._sjobID})/appResults` // ,
                    // filters: [new Filter({
                    //     filters: [oAppNameFilter, oJobIDFilter],
                    //     bAnd: true
                    // })]
                });
            },

            onMessageDetails: function (oEvent) {
                let oMessageLine = oEvent.getSource();
                let oViewBindingObject = this.getView().getBindingContext().getObject();
                let sPageName = oMessageLine.getBindingContext().getObject().pageName;
                let oCodeEditor = this.getView().byId("codeEditor");
                this._iMessageRow = oMessageLine.getBindingContext().getObject().row;
                this._sMessageType = oMessageLine.getBindingContext().getObject().severity_code;
                // To trigger rendering again 
                oCodeEditor.unbindProperty("value");
                oCodeEditor.setVisible(false);
                oCodeEditor.bindProperty("value", "/ApplicationPages(AppName='" + oViewBindingObject.AppName + "',PageName='" + sPageName.replaceAll("/", "%2F") + "',System='" + oViewBindingObject.System + "')/PageContent");
                oCodeEditor.setVisible(true);
            },

            onNavBack: function (oEvent) {
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
