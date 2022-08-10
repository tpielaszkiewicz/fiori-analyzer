const cds = require('@sap/cds')
const { retrieveJwt } = require("@sap-cloud-sdk/core");
var http = require("http");
const axios = require('axios');
const xsenv = require('@sap/xsenv')
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

let oConnectivityService;
let oUaaService;
let sConnServiceCredentials;


try {
    oConnectivityService = xsenv.getServices({ dest: { tag: 'connectivity' } }).dest;
    oUaaService = xsenv.getServices({ uaa: { tag: 'xsuaa' } }).uaa;
    sConnServiceCredentials = oConnectivityService.clientid + ':' + oConnectivityService.clientsecret;
} catch (error) {
    console.log(error);
}


class AnalyzeService extends cds.ApplicationService {
    async init() {

        // Connect to sap discovery centre service.
        const ordersService = await cds.connect.to('zorders00');
        const consService = await cds.connect.to('consolidated');

        const { Orders } = this.entities;
        this.on('READ', Orders, request => {
            return ordersService.tx(request).run(request.query);
        });

        this.on('runAnalyse', async req => {
            this._req = req;
            var jwt = retrieveJwt(req._.req);
            console.log(jwt);
            var sConnJwt = await this._getOAuthConnServiceToken();
            // var options = {
            //     host: "10.0.4.5",
            //     port: 20003,
            //     path: "http://hze-pp-400:8043/sap/opu/odata/sap/ZBTP_ORDERS_00/Orders",
            //     headers: {
            //         "Host": "http://hze-pp-400:8043",
            //         "SAP-Connectivity-Authentication": "Bearer " + jwt,
            //         "SAP-Connectivity-SCC-Location_ID": "Cloud_NPSCC",
            //         "sap-client": "400",
            //         "accept": "application/json,text/plain",
            //         "Proxy-Authorization": "Bearer " + sConnJwt //,
            //         // "x-correlation-id": "6c5bdd99-3343-489c-8929-72537489d3f6"
            //     }
            // };

            // const res = await axios.get('http://hze-pp-400:8043/sap/opu/odata/sap/ZBTP_ORDERS_00/Orders', {
            //     // `proxy` means the request actually goes to the server listening
            //     // on 10.0.4.5:20003, but the request says it is meant for
            //     // 'http://hze-pp-400:8043/sap/opu/odata/sap/ZBTP_ORDERS_00/Orders'
            //     headers: {
            //         "SAP-Connectivity-Authentication": "Bearer " + jwt,
            //         "SAP-Connectivity-SCC-Location_ID": "Cloud_NPSCC",
            //         "sap-client": "400",
            //         "accept": "application/json,text/plain",
            //         "Proxy-Authorization": "Bearer " + sConnJwt
            //     },
            //     proxy: {
            //         host: '10.0.4.5',
            //         port: 20003
            //     }
            // }).then(function (response) {
            //     console.log(response);
            //   }).catch(function(error) {
            //     console.log(error);
            //   });


            //   http.get(options, function(res) {
            //     console.log(res);
            //     res.pipe(process.stdout);
            //   }).on('error', function(e) {
            //     console.log("Got error: " + e.message);
            //   });
            //const categories = await consService.tx(req).run(SELECT.from('ZTMP_C_CATEGORIES'));
            const orders = await ordersService.tx(req).run(SELECT.from('Orders'));
            console.log(orders);
            // // console.log(orders);
            return jwt;
            // return `Analyze run for ${req.data.package} package, system: ${ req.data.system }!`; 
        });

        return super.init();
    }

    async _getOAuthConnServiceToken() {
        let sConnBasicAuth = 'Basic ' + Buffer.from(sConnServiceCredentials).toString('base64');
        let oResponse = await fetch(oUaaService.url + '/oauth/token', {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json; charset=UTF-8",
                "Authorization": sConnBasicAuth,
                "User-Agent": 'nodejs-xssec-3',
                "x-zid": oUaaService.zoneid
            },
            body: "grant_type=client_credentials&response_type=token&client_id=" + oConnectivityService.clientid + "&client_secret=" + oConnectivityService.clientsecret
        });
        if (oResponse.status >= 200 && oResponse.status <= 299) {
            const oJsonResponse = await oResponse.json();
            return oJsonResponse.access_token;
        } else {
            // Handle errors
            console.log('_getOAuthConnServiceToken', oResponse.status, oResponse.statusText);
        }
    }


}

module.exports = { AnalyzeService }
