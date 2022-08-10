//@ui5-bundle com/pg/xa/fiori/analyzer/app/analyzer/Component-preload.js
jQuery.sap.registerPreloadedModules({
"version":"2.0",
"modules":{
	"com/pg/xa/fiori/analyzer/app/analyzer/Component.js":function(){sap.ui.define(["sap/ui/core/UIComponent","sap/ui/Device","com/pg/xa/fiori/analyzer/app/analyzer/model/models"],function(e,i,t){"use strict";return e.extend("com.pg.xa.fiori.analyzer.app.analyzer.Component",{metadata:{manifest:"json"},init:function(){e.prototype.init.apply(this,arguments);this.getRouter().initialize();this.setModel(t.createDeviceModel(),"device")}})});
},
	"com/pg/xa/fiori/analyzer/app/analyzer/controller/App.controller.js":function(){sap.ui.define(["sap/ui/core/mvc/Controller"],function(r){"use strict";return r.extend("com.pg.xa.fiori.analyzer.app.analyzer.controller.controller.App",{onInit(){}})});
},
	"com/pg/xa/fiori/analyzer/app/analyzer/controller/View1.controller.js":function(){sap.ui.define(["sap/ui/core/mvc/Controller"],function(e){"use strict";return e.extend("com.pg.xa.fiori.analyzer.app.analyzer.controller.View1",{onInit:function(){},onAfterRendering:function(){let e=this.getView().getModel().bindContext("/runAnalyse(system='HZE',package='ZTEST')");e.execute().then(function(){oAuthsModel.setProperty("/authFetched",true);oAuthsModel.setProperty("/isAdmin",e.getBoundContext().getObject()["value"])}.bind(this),function(e){oAuthsModel.setProperty("/isAdmin",false);MessageBox.error(e.message)})}})});
},
	"com/pg/xa/fiori/analyzer/app/analyzer/i18n/i18n.properties":'# This is the resource bundle for com.pg.xa.fiori.analyzer.app.analyzer\n\n#Texts for manifest.json\n\n#XTIT: Application name\nappTitle=Fiori analyzer\n\n#YDES: Application description\nappDescription=Fiori analyzer\n#XTIT: Main view title\ntitle=Fiori analyzer',
	"com/pg/xa/fiori/analyzer/app/analyzer/manifest.json":'{"_version":"1.40.0","sap.app":{"id":"com.pg.xa.fiori.analyzer.app.analyzer","type":"application","i18n":"i18n/i18n.properties","applicationVersion":{"version":"0.0.1"},"title":"{{appTitle}}","description":"{{appDescription}}","resources":"resources.json","sourceTemplate":{"id":"@sap/generator-fiori:basic","version":"1.7.0","toolsId":"560b19ee-acca-4494-96b2-42c44bb86e4b"},"dataSources":{"mainService":{"uri":"analyze/","type":"OData","settings":{"annotations":[],"localUri":"localService/metadata.xml","odataVersion":"4.0"}}}},"sap.ui":{"technology":"UI5","icons":{"icon":"","favIcon":"","phone":"","phone@2":"","tablet":"","tablet@2":""},"deviceTypes":{"desktop":true,"tablet":true,"phone":true}},"sap.ui5":{"flexEnabled":true,"dependencies":{"minUI5Version":"1.102.1","libs":{"sap.m":{},"sap.ui.core":{},"sap.f":{},"sap.suite.ui.generic.template":{},"sap.ui.comp":{},"sap.ui.generic.app":{},"sap.ui.table":{},"sap.ushell":{}}},"contentDensities":{"compact":true,"cozy":true},"models":{"i18n":{"type":"sap.ui.model.resource.ResourceModel","settings":{"bundleName":"com.pg.xa.fiori.analyzer.app.analyzer.i18n.i18n"}},"":{"dataSource":"mainService","preload":true,"settings":{"synchronizationMode":"None","operationMode":"Server","autoExpandSelect":true,"earlyRequests":true}}},"resources":{"css":[{"uri":"css/style.css"}]},"routing":{"config":{"routerClass":"sap.m.routing.Router","viewType":"XML","async":true,"viewPath":"com.pg.xa.fiori.analyzer.app.analyzer.view","controlAggregation":"pages","controlId":"app","clearControlAggregation":false},"routes":[{"name":"RouteView1","pattern":":?query:","target":["TargetView1"]}],"targets":{"TargetView1":{"viewType":"XML","transition":"slide","clearControlAggregation":false,"viewId":"View1","viewName":"View1"}}},"rootView":{"viewName":"com.pg.xa.fiori.analyzer.app.analyzer.view.App","type":"XML","async":true,"id":"App"}},"sap.cloud":{"public":true,"service":"compgbtpfiorianalyzer"}}',
	"com/pg/xa/fiori/analyzer/app/analyzer/model/models.js":function(){sap.ui.define(["sap/ui/model/json/JSONModel","sap/ui/Device"],function(e,n){"use strict";return{createDeviceModel:function(){var i=new e(n);i.setDefaultBindingMode("OneWay");return i}}});
},
	"com/pg/xa/fiori/analyzer/app/analyzer/utils/locate-reuse-libs.js":'(function(e){var t=function(e){var t=e;var n="";var r=["sap.apf","sap.base","sap.chart","sap.collaboration","sap.f","sap.fe","sap.fileviewer","sap.gantt","sap.landvisz","sap.m","sap.ndc","sap.ovp","sap.rules","sap.suite","sap.tnt","sap.ui","sap.uiext","sap.ushell","sap.uxap","sap.viz","sap.webanalytics","sap.zen"];function a(e,t){Object.keys(e).forEach(function(e){if(!r.some(function(t){return e===t||e.startsWith(t+".")})){if(t.length>0){t=t+","+e}else{t=e}}});return t}return new Promise(function(r,i){$.ajax(t).done(function(e){if(e){if(e["sap.ui5"]&&e["sap.ui5"].dependencies){if(e["sap.ui5"].dependencies.libs){n=a(e["sap.ui5"].dependencies.libs,n)}if(e["sap.ui5"].dependencies.components){n=a(e["sap.ui5"].dependencies.components,n)}}if(e["sap.ui5"]&&e["sap.ui5"].componentUsages){n=a(e["sap.ui5"].componentUsages,n)}}r(n)}).fail(function(t){i(new Error("Could not fetch manifest at \'"+e))})})};e.registerComponentDependencyPaths=function(e){return t(e).then(function(e){if(e&&e.length>0){var t="/sap/bc/ui2/app_index/ui5_app_info?id="+e;var n=jQuery.sap.getUriParameters().get("sap-client");if(n&&n.length===3){t=t+"&sap-client="+n}return $.ajax(t).done(function(e){if(e){Object.keys(e).forEach(function(t){var n=e[t];if(n&&n.dependencies){n.dependencies.forEach(function(e){if(e.url&&e.url.length>0&&e.type==="UI5LIB"){jQuery.sap.log.info("Registering Library "+e.componentId+" from server "+e.url);jQuery.sap.registerModulePath(e.componentId,e.url)}})}})}})}})}})(sap);var scripts=document.getElementsByTagName("script");var currentScript=document.getElementById("locate-reuse-libs");if(!currentScript){currentScript=document.currentScript}var manifestUri=currentScript.getAttribute("data-sap-ui-manifest-uri");var componentName=currentScript.getAttribute("data-sap-ui-componentName");var useMockserver=currentScript.getAttribute("data-sap-ui-use-mockserver");sap.registerComponentDependencyPaths(manifestUri).catch(function(e){jQuery.sap.log.error(e)}).finally(function(){sap.ui.getCore().attachInit(function(){jQuery.sap.require("jquery.sap.resources");var e=sap.ui.getCore().getConfiguration().getLanguage();var t=jQuery.sap.resources({url:"i18n/i18n.properties",locale:e});document.title=t.getText("appTitle")});if(componentName&&componentName.length>0){if(useMockserver&&useMockserver==="true"){sap.ui.getCore().attachInit(function(){sap.ui.require([componentName.replace(/\\./g,"/")+"/localService/mockserver"],function(e){e.init();sap.ushell.Container.createRenderer().placeAt("content")})})}else{sap.ui.require(["sap/ui/core/ComponentSupport"]);sap.ui.getCore().attachInit(function(){jQuery.sap.require("jquery.sap.resources");var e=sap.ui.getCore().getConfiguration().getLanguage();var t=jQuery.sap.resources({url:"i18n/i18n.properties",locale:e});document.title=t.getText("appTitle")})}}else{sap.ui.getCore().attachInit(function(){sap.ushell.Container.createRenderer().placeAt("content")})}});sap.registerComponentDependencyPaths(manifestUri);',
	"com/pg/xa/fiori/analyzer/app/analyzer/view/App.view.xml":'<mvc:View controllerName="com.pg.xa.fiori.analyzer.app.analyzer.controller.App"\n    xmlns:html="http://www.w3.org/1999/xhtml"\n    xmlns:mvc="sap.ui.core.mvc" displayBlock="true"\n    xmlns="sap.m"><App id="app"></App></mvc:View>\n',
	"com/pg/xa/fiori/analyzer/app/analyzer/view/View1.view.xml":'<mvc:View controllerName="com.pg.xa.fiori.analyzer.app.analyzer.controller.View1"\n    xmlns:mvc="sap.ui.core.mvc" displayBlock="true"\n    xmlns="sap.m"><Page id="page" title="{i18n>title}"><content /></Page></mvc:View>\n'
}});
