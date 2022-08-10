const approuter = require("@sap/approuter");
const jwtDecode = require("jwt-decode");
const appRouter = approuter();

appRouter.beforeRequestHandler.use(async(req, res, next) => {
//	console.log(req.user.token.accessToken); 
	const jwt = jwtDecode(req.user.token.accessToken);
//    console.log(jwt);
	next();

});

appRouter.start();