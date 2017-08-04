var jsvalidator = require("../index.js");

var data = []
for(var i = 0; i < 1000; i++) {
	data.push({
		foo : {
			nested : { something : "yes" },
			bool : true
		},
		indexObject : {
			foo : "fooValue",
			bar : "barValue",
			baz : "bazValue"
		},
		baz : 10,
		qux : [1,2,3]
	});
}

suite.add("benchmark", function(done) {
	jsvalidator.validate(data, {
		type : "array",
		schema : {
			type : "object",
			schema : [
				{
					name : "foo",
					type : "object",
					schema : [
						{
							name : "nested",
							type : "object",
							schema : [
								{ name : "something", type : "string" }
							],
							allowExtraKeys : false
						},
						{
							name : "bool",
							type : "boolean"
						}
					],
					allowExtraKeys : false
				},
				{
					name : "indexObject",
					type : "indexObject",
					schema : { type : "string" }
				},
				{
					name : "baz",
					type : "number"
				},
				{
					name : "qux",
					type : "array",
					schema : {
						type : "number"
					}
				}
			]
		},
		throwOnInvalid : true
	});
	return done();
});