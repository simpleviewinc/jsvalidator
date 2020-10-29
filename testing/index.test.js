"use strict";
var validator = require("../src/index.js");
var assert = require("assert");
const deepFreeze = require("deep-freeze");

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
	
	it("should run default object back through validator", function() {
		assert.deepEqual(validator.validate(undefined, { type : "object", schema : [{ name : "foo", type : "string", default : "foo" }], default : {} }).data, { foo : "foo" });
		assert.equal(validator.validate(undefined, { type : "object", schema : [{ name : "foo", type : "string" }], default : { foo : 5 } }).success, false);
		
		// ensure nested objects with functions on functions works
		var returnData = validator.validate({}, {
			type : "object",
			schema : [
				{
					name : "foo",
					type : "object",
					schema : [
						{
							name : "foo",
							type : "object",
							schema : [{ name : "foo", type : "string", default : function() { return "foo" } }],
							default : function() { return {} }
						}
					],
					default : function() { return {} }
				}
			]
		});
		
		assert.strictEqual(returnData.success, true);
		assert.strictEqual(returnData.data.foo.foo.foo, "foo");
	});
	
	it("should run default array back through validator", function() {
		// ensure root level with functions on functions works
		assert.deepEqual(validator.validate(undefined, { type : "array", schema : { type : "object", schema : [{ name : "foo", type : "string", default : function() { return "foo" } }] }, default : function() { return [{}]; } }).data, [{ foo : "foo" }]);
		
		// ensure nested objects with functions on functions works
		var returnData = validator.validate({}, {
			type : "object",
			schema : [
				{
					name : "foo",
					type : "array",
					schema : {
						type : "object",
						schema : [{ name : "foo", type : "string", default : function() { return "foo" } }]
					},
					default : function() { return [{}] }
				}
			]
		});
		
		assert.strictEqual(returnData.success, true);
		assert.strictEqual(returnData.data.foo[0].foo, "foo");
	});
	
	it("should replace undefined value with default from function", function() {
		var data = {
			foo : "fooValue",
			nested : { key1 : "key1Value" },
			nested2 : { key2 : "key2Value" },
			arr : [
				{ key3 : "key3Value1" },
				{ key3 : "key3Value2" }
			]
		};
		var returnData = validator.validate(data, {
			type : "object",
			schema : [
				{ name : "foo", type : "string" },
				{ name : "fooCurrent", type : "string", default : function(args) { return args.current.foo + "_current" } },
				{
					name : "nested",
					type : "object",
					schema : [
						{ name : "key1", type : "string" },
						{ name : "key1Current", type : "string", default : function(args) { return args.current.key1 + "_current" } },
					]
				},
				{
					name : "nested2",
					type : "object",
					schema : [
						{ name : "key2", type : "string" },
						{ name : "key2Current", type : "string", default : function(args) { return args.current.key2 + "_current" } }
					]
				},
				{
					name : "arr",
					type : "array",
					schema : {
						type : "object",
						schema : [
							{ name : "key3", type : "string" },
							{ name : "key3Current", type : "string", default : function(args) { return args.current.key3 + "_current" } }
						]
					}
				}
			]
		});
		
		assert.ok(returnData.success);
		assert.deepStrictEqual(returnData.data, {
			foo : "fooValue",
			fooCurrent : "fooValue_current",
			nested : {
				key1 : "key1Value",
				key1Current : "key1Value_current"
			},
			nested2 : {
				key2 : "key2Value",
				key2Current : "key2Value_current"
			},
			arr : [
				{
					key3 : "key3Value1",
					key3Current : "key3Value1_current"
				},
				{
					key3 : "key3Value2",
					key3Current : "key3Value2_current"
				}
			]
		});
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
	
	it("should do simpleObject", function() {
		var data = { foo : "string", bar : "test", baz : "another" }
		var returnData = validator.validate(data, { type : "simpleObject", schema : { type : "string" } });
		assert.ok(returnData.success);
		
		var data = { foo : "string", bar : 123, baz : "another" }
		var returnData = validator.validate(data, { type : "simpleObject", schema : { type : "string" } });
		assert.ok(!returnData.success);
		assert.ok(returnData.err.message.match(/Field 'bar' should be type 'string'/));
		
		var data = { inner : { foo : "string", bar : 123 } }
		var returnData = validator.validate(data, { type : "object", schema : [{ name : "inner", type : "simpleObject", schema : { type : "string" } }] });
		assert.ok(!returnData.success);
		assert.ok(returnData.err.message.match(/Field 'inner.bar' should be type 'string'/));
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
		assert.ok(returnData.err.message.match(/Field '3' should be type 'number' but is type 'string'\./));
	});
	
	it("should validate array of objects", function() {
		var data = [{ foo : "bar" }, { foo : "baz" }, { foo : 1 }];
		
		var returnData = validator.validate(data, { type : "array", schema : { type : "object", schema : [{ name : "foo", type : "string" }] } });
		
		assert.ok(!returnData.success);
		assert.ok(returnData.err.message.match(/Field '2.foo' should be type 'string' but is type 'number'\. Value is 1\./));
	});
	
	it("should concat to a single error", function() {
		var data = { foo : "bar", bar : 1, baz : "moo" };
		var temp = validator.validate(data, {
			type : "object",
			schema : [{ name : "foo", type : "number" }, { name : "bar", type : "string" }, { name : "baz", type : "number" }]
		});
		
		assert.equal(temp.err instanceof Error, true);
		assert.ok(temp.err.message.match(/Field 'foo' should be type 'number' but is type 'string'\. Value is "bar"\./));
		assert.ok(temp.err.message.match(/Field 'bar' should be type 'string' but is type 'number'\. Value is 1\./));
		assert.ok(temp.err.message.match(/Field 'baz' should be type 'number' but is type 'string'\. Value is "moo"\./));
	});
	
	it("should handle circular references in errors", function() {
		var data = { foo : "bar" };
		data.circle = data;
		
		var temp = validator.validate(data, {
			type : "object",
			schema : [{ name : "foo", type : "number" }]
		});
		
		assert.equal(temp.err instanceof Error, true);
		assert.ok(temp.err.message.match(/Field 'foo' should be type 'number' but is type 'string'\. Value is "bar"\./));
	});
	
	it("should throw on invalid type", function() {
		assert.throws(
			function() {
				var data = { foo : "string" };
				var returnData = validator.validate(data, { type : "object", schema : [{ name : "foo", type : "fakeType" }] });
			},
			/Field 'foo' should be type 'fakeType' but that type isn't supported by jsvalidator\./
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
	
	describe("tests array", function() {
		var tests = [
			{
				it : "regex - valid",
				data : /test regex/,
				schema : {
					type : "regex"
				},
				success : true
			},
			{
				it : "regex - invalid",
				data : "string",
				schema : {
					type : "regex"
				},
				success : false,
				err : /Field should be type 'regex'/
			},
			{
				it : "indexObject - nested",
				data : {
					foo : { nested : "a" },
					bar : { nested : "b" },
					baz : { nested : "c" }
				},
				schema : {
					type : "indexObject",
					schema : [
						{ name : "nested", type : "string", required : true }
					]
				},
				success : true
			},
			{
				it : "indexObject - nested failure",
				data : {
					foo : { nested : "a" },
					bar : { nested : 10 },
					baz : { nested : "c" }
				},
				schema : {
					type : "indexObject",
					schema : [
						{ name : "nested", type : "string", required : true }
					]
				},
				success : false,
				err : /Field 'bar.nested' should be type 'string'/
			},
			{
				it : "indexObject - deleteExtraKeys from failure object",
				data : {
					foo : { nested : "a", fake : "b" }
				},
				schema : {
					type : "indexObject",
					schema : [
						{ name : "nested", type : "string", required : true }
					],
					deleteExtraKeys : true
				},
				resultData : {
					foo : { nested : "a" }
				},
				success : true
			},
			{
				it : "indexObject - allowExtraKeys from object",
				data : {
					foo : { nested : "a", fake : "b" }
				},
				schema : {
					type : "indexObject",
					schema : [
						{ name : "nested", type : "string", required : true }
					],
					allowExtraKeys : false
				},
				resultData : {
					foo : { nested : "a", fake : "b" }
				},
				success : false,
				err : /Object 'foo' contains extra key 'fake' not declared in schema./
			},
			{
				it : "indexObject - deep nested",
				data : {
					foo : [
						{ key : { foo : 1, bar : 2, baz : 3 } },
						{ fake : "value" },
						{ key : { foo : 5, baz : "string" }, fake : "value2" }
					]
				},
				schema : {
					type : "object",
					schema : [
						{
							name : "foo",
							type : "array",
							schema : {
								type : "object",
								schema : [
									{ name : "key", type : "indexObject", schema : { type : "number" } },
									{ name : "fake", type : "string" }
								],
								allowExtraKeys : false
							}
						}
					],
					allowExtraKeys : false
				},
				success : false,
				err : /Field 'foo.2.key.baz' should be type 'number'/
			},
			{
				it : "custom - simple",
				data : "foo",
				schema : {
					name : "foo",
					type : "string",
					custom : [{ label : "Valid", fn : function(args) { return true; } }]
				},
				success : true
			},
			{
				it : "custom - simple invalid",
				data : "foo",
				schema : {
					name : "foo",
					type : "string",
					custom : [{ label : "Invalid", fn : function(args) { return false; } }]
				},
				success : false,
				err : /Field failed custom validation 'Invalid'/
			},
			{
				it : "custom - multiple with failure",
				data : "foo",
				schema : {
					name : "foo",
					type : "string",
					custom : [
						{ label : "Valid", fn : function(args) { return true; } },
						{ label : "Invalid", fn : function(args) { return false; } },
						{ label : "Valid", fn : function(args) { return true; } }
					]
				},
				success : false,
				err : /Field failed custom validation 'Invalid'/
			},
			{
				it : "custom - traditional failure + custom",
				data : 5,
				schema : {
					name : "foo",
					type : "string",
					custom : [
						{ label : "Invalid", fn : function() { return false; } }
					]
				},
				success : false,
				err : [
					/Field should be type 'string'/
				]
			},
			{
				it : "custom - with multiple failures",
				data : 5,
				schema : {
					name : "foo",
					type : "number",
					custom : [
						{ label : "Invalid1", fn : function() { return false; } },
						{ label : "Valid", fn : function() { return true; } },
						{ label : "Invalid2", fn : function() { return false; } }
					]
				},
				success : false,
				err : [
					/Field failed custom validation 'Invalid1'/,
					/Field failed custom validation 'Invalid2'/
				]
			},
			{
				it : "simple - should not modify schema",
				data : "foo",
				schema : deepFreeze({
					type : "string"
				}),
				success : true
			},
			{
				it : "object - should not modify schema",
				data : {
					foo : "string",
					bar : true
				},
				schema : deepFreeze({
					type : "object",
					schema : [
						{ name : "foo", type : "string" },
						{ name : "bar", type : "boolean" }
					]
				}),
				success : true
			},
			{
				it : "indexObject { key: string } - should not modify schema",
				data : {
					a : "foo",
					b : "baz",
					c : "qux"
				},
				schema : deepFreeze({
					type : "indexObject",
					schema : { type : "string" }
				}),
				success : true
			},
			{
				it : "indexObject { key : Object } - should not modify schema",
				data : {
					foo : { a : "str", b : true, c : 10 },
					bar : { a : "str2", b : false, c : 5 }
				},
				schema : deepFreeze({
					type : "indexObject",
					schema : [
						{ name : "a", type : "string" },
						{ name : "b", type : "boolean" },
						{ name : "c", type : "number" }
					]
				}),
				success : true
			},
			{
				it : "deeply nested object - should not modify schema",
				data : {
					foo : [
						{ bar : { a : "str", b : true, c : 10 }, baz : { a : "test", b : false, c : 5 } }
					]
				},
				schema : deepFreeze({
					type : "object",
					schema : [
						{
							name : "foo",
							type : "array",
							schema : {
								type : "indexObject",
								schema : [
									{ name : "a", type : "string" },
									{ name : "b", type : "boolean" },
									{ name : "c", type : "number" }
								]
							}
						}
					]
				}),
				success : true
			},
			{
				it : "should not modify object unless necessary",
				data : deepFreeze({
					foo : {
						bar : {
							baz : true
						}
					}
				}),
				schema : deepFreeze({
					type : "object",
					schema : [
						{
							name : "foo",
							type : "object",
							schema : [
								{
									name : "bar",
									type : "object",
									schema : [
										{
											name : "baz",
											type : "boolean"
										}
									]
								}
							]
						}
					]
				}),
				success : true
			}
		]
		
		tests.forEach(function(test) {
			(test.only ? it.only : it)(test.it, function() {
				var valid = validator.validate(test.data, test.schema);
				
				assert.strictEqual(valid.success, test.success);
				
				if (test.err !== undefined) {
					var temp = test.err instanceof Array ? test.err : [test.err];
					assert.strictEqual(valid.errors.length, temp.length);
					temp.forEach(function(val) {
						assert.ok(valid.err.message.match(val));
					});
				}
				
				if (test.resultData !== undefined) {
					assert.deepStrictEqual(valid.data, test.resultData);
				}
			});
		});
	});
});