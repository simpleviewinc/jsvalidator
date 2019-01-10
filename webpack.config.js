module.exports = {
	mode : "production",
	entry : `./src/index.js`,
	output : {
		path : `${__dirname}/dist`,
		filename : "index.min.js",
		libraryTarget : "umd"
	}
}