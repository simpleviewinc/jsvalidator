var validator = require("../index.js");
var assert = require("assert");

describe(__filename, function() {
	it("should require values", function() {
		var data = {};
		var returnData = validator.validate(data, { type : "object", schema : [{ name : "foo", type : "string", required : true }] });
		
		assert.ok(!returnData.success);
		assert.ok(returnData.err.message.match(/Required field 'foo' does not exist\./));
	});
	
	it("should do nothing on values that don't exist and aren't required", function() {
		var data = { foo : "fooValue" }
		var returnData = validator.validate(data, { type : "object", schema : [{ name : "foo", type : "string" }, { name : "bar", type : "string" }] });
		
		assert.equal(Object.keys(data).length, 1);
		assert.equal(data.bar, undefined);
	});
	
	it("should replace undefined value with default", function() {
		var data = {};
		var returnData = validator.validate(data, { type : "object", schema : [{ name : "foo", type : "string", default : "foo" }] });
		
		assert.ok(returnData.success);
		assert.ok(returnData.errors.length === 0);
		assert.ok(data.foo === "foo");
	});
	
	it("should replace invalid value with default", function() {
		var data = {
			foo : "some string"
		};
		var returnData = validator.validate(data, { type : "object", schema : [{ name : "foo", type : "number", default : 1, defaultOnInvalid : true }] });
		
		assert.ok(returnData.success);
		assert.ok(data.foo === 1);
	});
	
	it("should run default object back through validator", function() {
		assert.deepEqual(validator.validate(undefined, { type : "object", schema : [{ name : "foo", type : "string", default : "foo" }], default : {} }).data, { foo : "foo" });
		assert.equal(validator.validate(undefined, { type : "object", schema : [{ name : "foo", type : "string" }], default : { foo : 5 } }).success, false);
	});
	
	it("should replace undefined value with default from function", function() {
		var data = { foo : "fooValue" };
		var returnData = validator.validate(data, { type : "object", schema : [{ name : "bar", type : "number", default : function(args) { return args.current.foo + "_barValue" } }] });
		
		assert.ok(returnData.success);
		assert.ok(data.bar === "fooValue_barValue");
	});
	
	it("should replace undefined value with default from function in array of objects", function() {
		var data = [{ foo : "fooValue" }, { foo : "fooValue2" }];
		var returnData = validator.validate(data, { type : "array", schema : { type : "object", schema : [{ name : "bar", type : "boolean", default : function(args) { return args.current.foo + "_barValue" } }] } });
		
		assert.ok(returnData.success);
		assert.ok(data[0].bar === "fooValue_barValue");
		assert.ok(data[1].bar === "fooValue2_barValue");
	});
	
	it("should have iterator on default function in array of objects", function() {
		var data = [{ foo : "fooValue" }, { foo : "fooValue2" }];
		var returnData = validator.validate(data, { type : "array", schema : { type : "object", schema : [{ name : "bar", type : "number", default : function(args) { return args.i } }] } });
		
		assert.equal(data[0].bar, 0);
		assert.equal(data[1].bar, 1);
		
		var data = {
			inner : {
				array : [
					{},
					{}
				]
			}
		}
		
		var returnData = validator.validate(data, { type : "object", schema : [{ name : "inner", type : "object", schema : [{ name : "array", type : "array", schema : { type : "object", schema : [{ name : "i", type : "integer", default : function(args) { return args.i } }] } }] }] });
		assert.deepEqual(returnData.data, {
			inner : {
				array : [
					{ i : 0 },
					{ i : 1 }
				]
			}
		});
	});
	
	it("should return no errors when everything is valid", function() {
		var data = {
			foo : "bar"
		};
		var returnData = validator.validate(data, { type : "object", schema : [{ name : "foo", type : "string", required : true }] });
		
		assert.ok(returnData.success);
	});
	
	it("should validate string", function() {
		var data = {
			foo : "data"
		};
		var returnData = validator.validate(data, { type : "object", schema : [{ name : "foo", type : "string" }] });
		
		assert.ok(returnData.success);
	});
	
	it("should validate string with min and/or max", function() {
		var data = {
			foo : "data"
		}
		assert.equal(validator.validate("short", { type : "string", min : 10 }).success, false);
		assert.equal(validator.validate("short", { type : "string", min : 5 }).success, true);
		assert.equal(validator.validate("short", { type : "string", min : 3 }).success, true);
		assert.equal(validator.validate("short", { type : "string", max : 10 }).success, true);
		assert.equal(validator.validate("short", { type : "string", max : 5 }).success, true);
		assert.equal(validator.validate("short", { type : "string", max : 3 }).success, false);
		assert.equal(validator.validate("short", { type : "string", max : 10, min : 3 }).success, true);
		assert.equal(validator.validate("short", { type : "string", max : 5, min : 5 }).success, true);
		assert.equal(validator.validate("short", { type : "string", max : 3, min : 1 }).success, false);
		assert.equal(validator.validate("short", { type : "string", max : 10, min : 6 }).success, false);
		
		var temp = validator.validate("short", { type : "string", min : 10 });
		assert.ok(temp.err.message.match(/Field has a minimum length of '10'\./));
		
		var temp = validator.validate("short", { type : "string", max : 3 });
		assert.ok(temp.err.message.match(/Field has a maximum length of '3'\./));
		
		var temp = validator.validate({ foo : { bar : "string" } }, { type : "object", schema : [{ name : "foo", type : "object", schema : [{ name : "bar", type : "string", max : 3 }] }] });
		assert.ok(temp.err.message.match(/Field 'foo.bar' has a maximum length of '3'\./));
	});
	
	it("should validate string with enum", function() {
		assert.equal(validator.validate("test", { type : "string", enum : ["test", "test2"] }).success, true);
		assert.equal(validator.validate("test", { type : "string", enum : ["test3", "test2"] }).success, false);
		assert.equal(validator.validate("test", { type : "string", enum : ["test"] }).success, true);
	});
	
	it("should validate string with regex", function() {
		assert.equal(validator.validate("test_123_foo", { type : "string", regex : /^[a-z0-9_]*$/ }).success, true);
		assert.equal(validator.validate("teSt_123_foo", { type : "string", regex : /^[a-z0-9_]*$/ }).success, false);
	});
	
	it("should validate number", function() {
		var data = {
			foo : 1
		};
		var returnData = validator.validate(data, { type : "object", schema : [{ name : "foo", type : "number" }] });
		
		assert.ok(returnData.success);
	});
	
	it("should validate boolean", function() {
		var data = {
			foo : true
		};
		var returnData = validator.validate(data, { type : "object", schema : [{ name : "foo", type : "boolean" }] });
		
		assert.ok(returnData.success);
	});
	
	it("should validate function", function() {
		var data = {
			foo : function() {}
		};
		var returnData = validator.validate(data, { type : "object", schema : [{ name : "foo", type : "function" }] });
		
		assert.ok(returnData.success);
	});
	
	it("should validate class", function() {
		var MyClass = function() {}
		
		var data = {
			foo : new MyClass()
		};
		var returnData = validator.validate(data, { type : "object", schema : [{ name : "foo", type : "class", class : MyClass }] });
		
		assert.ok(returnData.success);
	});
	
	it("should validate date", function() {
		var returnData = validator.validate(new Date(), { type : "date" });
		assert.equal(returnData.success, true);
		var returnData = validator.validate(Date.now(), { type : "date" });
		assert.equal(returnData.success, false);
	});
	
	it("should validate inner objects", function() {
		var data = {
			foo : {
				bar : "something",
				baz : 1
			}
		};
		
		var returnData = validator.validate(data, {
			type : "object",
			schema : [
				{
					name : "foo",
					type : "object",
					schema : [
						{ name : "foo", default : "my default" },
						{ name : "bar", type : "string", required : true },
						{ name : "baz", type : "number", default : 2 }
					]
				}
			]
		});
		
		assert.ok(returnData.success);
		assert.ok(data.foo.foo === "my default");
		assert.ok(data.foo.bar === "something");
		assert.ok(data.foo.baz === 1);
	});
	
	it("should validate indexObject", function() {
		// should succeed
		var data = { foo : { inner : 1 }, bar : { inner : 2 }, baz : { inner : 3 } };
		var returnData = validator.validate(data, { type : "indexObject", schema : [{ name : "inner", type : "number", required : true }] });
		assert.ok(returnData.success);
		
		// should fail validation due to inner object
		var data = { foo : { inner : 1 }, bar : { inner : "fail" } };
		var returnData = validator.validate(data, { type : "indexObject", schema : [{ name : "inner", type : "number", required : true }] });
		assert.ok(!returnData.success);
	});
	
	it("should validate simple field", function() {
		var data = "stuff";
		
		var returnData = validator.validate(data, { type : "number" });
		
		assert.ok(!returnData.success);
	});
	
	it("should validate with undefined type", function() {
		var tests = [
			["something", true],
			[5, true],
			[undefined, false]
		];
		
		tests.forEach(function(val, i) {
			var result = validator.validate({ foo : val[0] }, {
				type : "object",
				schema : [
					{ name : "foo", type : "any", required : true }
				]
			});
			
			assert.equal(result.success, val[1]);
		});
	});
	
	it("should delete object key on invalid in object", function() {
		var data = {
			foo : "bar",
			bar : "baz"
		};
		
		var returnData = validator.validate(data, { type : "object", schema : [{ name : "foo", type : "number", deleteOnInvalid : true }] });
		
		assert.ok(data.foo === undefined);
	});
	
	it("should fail validation on extra keys", function() {
		var data = {
			foo : "fooValue",
			bar : "barValue"
		};
		
		var returnData = validator.validate(data, { type : "object", schema : [{ name : "foo", type : "string" }], allowExtraKeys : false });
		
		assert.equal(returnData.success, false);
		assert.ok(returnData.err.message.match(/Object contains extra key 'bar' not declared in schema\./));
	});
	
	it("should delete extra keys on object", function() {
		var data = {
			foo : "fooValue",
			bar : "barValue"
		}
		
		var returnData = validator.validate(data, { type : "object", schema : [{ name : "foo", type : "string" }], deleteExtraKeys : true });
		
		assert.strictEqual(returnData.success, true);
		assert.strictEqual(data.bar, undefined);
	});
	
	it("should delete extra keys on indexObject", function() {
		var data = {
			foo : {
				foo : "fooValue",
				bar : "barValue"
			}
		}
		
		var returnData = validator.validate(data, { type : "indexObject", schema : [{ name : "foo", type : "string" }], deleteExtraKeys : true });
		
		assert.strictEqual(returnData.success, true);
		assert.strictEqual(data.foo.foo, "fooValue");
		assert.strictEqual(data.foo.bar, undefined);
	});
	
	it("should throw on invalid", function() {
		var data = "test";
		
		assert.throws(
			function() {
				var returnData = validator.validate(data, { type : "number", throwOnInvalid : true });
			},
			Error
		);
	});
	
	it("should validate array without schema", function() {
		var data = [];
		
		var returnData = validator.validate(data, { type : "array" });
		
		assert.equal(returnData.success, true);
	});
	
	it("should validate object without schema", function() {
		var data = {};
		
		var returnData = validator.validate(data, { type : "object" });
		
		assert.equal(returnData.success, true);
	});
	
	it("should validate array of simple", function() {
		var data = [1,2,3,"test"];
		
		var returnData = validator.validate(data, { type : "array", schema : { type : "number" } });
		
		assert.ok(!returnData.success);
		assert.ok(returnData.err.message.match(/Field '3' is not of type 'number'\./));
	});
	
	it("should validate array of objects", function() {
		var data = [{ foo : "bar" }, { foo : "baz" }, { foo : 1 }];
		
		var returnData = validator.validate(data, { type : "array", schema : { type : "object", schema : [{ name : "foo", type : "string" }] } });
		
		assert.ok(!returnData.success);
		assert.ok(returnData.err.message.match(/Field '2.foo' is not of type 'string'\./));
	});
	
	it("should delete invalid array entries", function() {
		var data = [1,2,"foo"];
		
		var returnData = validator.validate(data, { type : "array", schema : { type : "number", deleteOnInvalid : true } });
		
		assert.ok(returnData.success);
	});
	
	it("should default invalid array entries", function() {
		var data = [1,2,"foo"];
		
		var returnData = validator.validate(data, { type : "array", schema : { type : "number", default : 3, defaultOnInvalid : true } });
		
		assert.ok(returnData.success);
		assert.ok(data[2] === 3);
	});
	
	it("should default invalid arrays", function() {
		var data = [1,2,"foo"];
		
		var returnData = validator.validate(data, { type : "array", schema : { type : "number" }, defaultOnInvalid : [], default : [] });
		
		assert.ok(returnData.success);
		assert.ok(returnData.data.length === 0);
	});
	
	it("should concat to a single error", function() {
		var data = { foo : "bar", bar : 1, baz : "moo" };
		var temp = validator.validate(data, {
			type : "object",
			schema : [{ name : "foo", type : "number" }, { name : "bar", type : "string" }, { name : "baz", type : "number" }]
		});
		
		assert.equal(temp.err instanceof Error, true);
		assert.ok(temp.err.message.match(/Field 'foo' is not of type 'number'\./));
		assert.ok(temp.err.message.match(/Field 'bar' is not of type 'string'\./));
		assert.ok(temp.err.message.match(/Field 'baz' is not of type 'number'\./));
	});
	
	it("should handler circular references in errors", function() {
		var data = { foo : "bar" };
		data.circle = data;
		
		var temp = validator.validate(data, {
			type : "object",
			schema : [{ name : "foo", type : "number" }]
		});
		
		assert.equal(temp.err instanceof Error, true);
		assert.ok(temp.err.message.match(/in \{ foo: 'bar', circle: \[Circular\] \}/));
	});
	
	it("should throw on invalid type", function() {
		assert.throws(
			function() {
				var data = { foo : "string" };
				var returnData = validator.validate(data, { type : "object", schema : [{ name : "foo", type : "fakeType" }] });
			},
			/Field 'foo' should be of type 'fakeType' but that type isn't supported by jsvalidator\./
		);
	});
	
	it("should return proper returnData", function() {
		var result1 = validator.validate(undefined, { type : "string", required : true });
		assert.equal(result1.success, false);
		assert.equal(result1.err instanceof Error, true);
		assert.equal(result1.errors.length, 1);
		
		var result2 = validator.validate("foo", { type : "string", required : true });
		assert.equal(result2.success, true);
		assert.equal(result2.err, undefined);
		assert.equal(result2.errors.length, 0);
	});
});