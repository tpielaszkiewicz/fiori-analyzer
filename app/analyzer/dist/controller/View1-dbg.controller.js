sap.ui.define([
    "sap/ui/core/mvc/Controller"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller) {
        "use strict";

        return Controller.extend("com.pg.xa.fiori.analyzer.app.analyzer.controller.View1", {
            onInit: function () {

            },

            onAfterRendering: function () {
                let oOperation = this.getView().getModel().bindContext("/runAnalyse(system='HZE',package='ZTEST')");

                // Execute function
                oOperation.execute().then(function () {
                    oAuthsModel.setProperty("/authFetched", true);
                    oAuthsModel.setProperty("/isAdmin", oOperation.getBoundContext().getObject()["value"]);
                }.bind(this), function (oError) {
                    oAuthsModel.setProperty("/isAdmin", false);
                    MessageBox.error(oError.message);
                });
            }
        });
    });
