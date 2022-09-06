sap.ui.define([
    "sap/ui/core/Control",
    "sap/ui/core/Icon",
    "sap/m/Label"

], function (Control, Icon, Label) {
    "use strict";
    return Control.extend("com.pg.xa.fiori.analyzer.app.analyzer.controls.TrendIndicator", {
        metadata: {
            properties: {
                prevValue: { type: "any", defaultValue: 0 },
                currValue: { type: "any", defaultValue: 0 }
            },
            aggregations: {
                _icon: { type: "sap.ui.core.Icon", multiple: false, visibility: "hidden" },
                _label: { type: "sap.m.Label", multiple: false, visibility: "hidden" }
            }
        },
        init: function () {
            let sIcon = "sap-icon://less";
            let sColor = "#b00";
            let sText = "";
            this.setAggregation("_icon", new Icon({
                src: sIcon,
                color: sColor,
                size: "1rem"
            }));
            this.setAggregation("_label", new Label({
                text: sText
            }).addStyleClass("sapUiSmallMarginEnd"));
        },
 
        setPrevValue(sValue) {
            this.setProperty("prevValue", sValue, true);
             
            this._updateAggregations();
        },

        setCurrValue(sValue) {
            this.setProperty("currValue", sValue, true);
            this._updateAggregations();
        },

        _updateAggregations() {
            let sIcon = "";
            let sColor = "";
            let iPrevValue = this.getPrevValue();
            let iCurrValue = this.getCurrValue();
            let fValue = 0.00;
            let sText = "";

            if (iPrevValue === 0 && iCurrValue !== 0) {
                sIcon = "sap-icon://trend-up";
                sColor = "#b00";
                sText = `+ ${iCurrValue}`;
            } else if (iPrevValue === iCurrValue) {
                sIcon = "sap-icon://less";
                sColor = "#0854a0";
                sText = 'No change';
            } else {
                fValue = parseFloat(((iCurrValue / iPrevValue) * 100) - 100);
                if (fValue > 0) {
                    sIcon = "sap-icon://trend-up";
                    sColor = "#b00";
                } else if (fValue < 0) {
                    sIcon = "sap-icon://trend-down";
                    sColor = "#107e3e";
                } 
                sText = `${(fValue > 0) ? '+' : '-'}${Math.abs(iCurrValue-iPrevValue)} (${String(fValue.toFixed(2))}%)`
            }
            this.setAggregation("_icon", new Icon({
                src: sIcon,
                color: sColor,
                size: "1rem"
            }).addStyleClass("sapUiSmallMarginEnd"));
            this.setAggregation("_label", new Label({
                text: sText
            }).addStyleClass("sapUiSmallMarginEnd"));
        },

        renderer: function (oRm, oControl) { 
            oRm.openStart("div", oControl);
            oRm.class("myAppDemoWTProductRating");
            oRm.openEnd();
            oRm.renderControl(oControl.getAggregation("_icon"));
            oRm.renderControl(oControl.getAggregation("_label"));
            oRm.close("div");
        }
    });
});