// umd boilerplate for CommonJS and AMD
if (typeof exports === 'object' && typeof define !== 'function') {
	var define = function (factory) {
		factory(require, exports, module);
	};
}

define(function(require, exports, module) {
	var util = require("util-browser");
	
	var validate = function(obj, schema) {
		var contextArray = [];
		var contextArrayObj = [];
		var returnData = validateField(obj, schema, contextArray, contextArrayObj, obj, obj);
		
		returnData.success = returnData.errors.length === 0;
		
		if (returnData.errors.length > 0) {
			returnData.err = concatErrors(obj, returnData.errors);
		}
		
		return returnData;
	}

	var validateField = function(value, def, contextArray, contextArrayObj, rootObj, currentObj) {
		var returnData = getDefaultReturn(value);
		
		def.required = def.required !== undefined ? def.required : false;
		def.default = def.default !== undefined ? def.default : undefined;
		def.schema = def.schema !== undefined ? def.schema : undefined;
		def.allowExtraKeys = def.allowExtraKeys !== undefined ? def.allowExtraKeys : true;
		def.deleteExtraKeys = def.deleteExtraKeys !== undefined ? def.deleteExtraKeys : false;
		def.defaultOnInvalid = def.defaultOnInvalid !== undefined ? def.defaultOnInvalid : false;
		def.throwOnInvalid = def.throwOnInvalid !== undefined ? def.throwOnInvalid : false;
		
		var getDefault = function() {
			if (typeof def.default === "function") {
				var args = {
					rootObj : rootObj,
					value : value,
					def : def,
					contextArray : contextArray,
					contextArrayObj : contextArrayObj,
					current : currentObj
				};
				
				if (contextArrayObj[contextArrayObj.length - 2] instanceof Array) {
					args.i = contextArray[contextArray.length - 2];
				}
				
				return def.default(args);
			} else {
				return def.default;
			}
		}
		
		var exists = value !== undefined;
		
		if (!exists && def.required) {
			var err = new Error("Required field" + contextToString(contextArray) + "does not exist.");
			
			if (def.throwOnInvalid) {
				throw err;
			} else {
				returnData.errors.push({ err : err, contextArray : contextArray });
				return returnData;
			}
		}
		
		if (!exists && !def.required && def.default === undefined) {
			// doesn't exist, not required, does not have default then do nothing
			return returnData;
		}
		
		if (!exists && !def.required && def.default !== undefined) {
			// doesn't exist, not required, has default then use default
			value = getDefault();
			returnData.data = value;
			
			if (def.type === "object" || def.type === "array") {
				// if it is an object and we're using the default, we still want it to run through the validations of it's inner keys
				// this allows defaults and requires to still be processed on "default" values
				
				exists = true;
			} else {
				return returnData;
			}
		}
		
		// field exists
		if (!exists) {
			throw new Error("Wtf, this case should never happen.");
		}
		
		var myErrors = [];
		var simpleError = false;
		
		if (def.type === "any") {
			// no type declared perform no type validation
		} else if (def.type === "string") {
			if (typeof value !== "string") {
				simpleError = true;
			} else {
				if (def.enum !== undefined && def.enum.indexOf(value) === -1) {
					var err = new Error("Field" + contextToString(contextArray) + "must be a value in '" + def.enum + "'.");
					myErrors.push({ err : err, contextArray : contextArray });
				}
				
				if (def.min !== undefined && value.length < def.min) {
					var err = new Error("Field" + contextToString(contextArray) + "has a minimum length of '" + def.min + "'.");
					myErrors.push({ err : err, contextArray : contextArray });
				}
				
				if (def.max !== undefined && value.length > def.max) {
					var err = new Error("Field" + contextToString(contextArray) + "has a maximum length of '" + def.max + "'.");
					myErrors.push({ err : err, contextArray : contextArray });
				}
				
				if (def.regex !== undefined && !value.match(def.regex)) {
					var err = new Error("Field" + contextToString(contextArray) + "does not match a regex of '" + def.regex + "'.");
					myErrors.push({ err : err, contextArray : contextArray });
				}
			}
		} else if (def.type === "boolean") {
			if (typeof value !== "boolean") {
				simpleError = true;
			}
		} else if (def.type === "number") {
			if (typeof value !== "number") {
				simpleError = true;
			}
		} else if (def.type === "function") {
			if (typeof value !== "function") {
				simpleError = true;
			}
		} else if (def.type === "class") {
			if (! (value instanceof def.class)) {
				simpleError = true;
			}
		} else if (def.type === "date") {
			if (! (value instanceof Date)) {
				simpleError = true;
			}
		} else if (def.type === "indexObject") {
			if (typeof value !== "object") {
				simpleError = true;
			} else if (def.schema !== undefined) {
				forEach(value, function(val, i) {
					var schema = def.schema instanceof Array ? {
						type : "object",
						schema : def.schema,
						deleteExtraKeys : def.deleteExtraKeys,
						allowExtraKeys : def.allowExtraKeys
					} : def.schema;
					
					var tempContext = [].slice.call(contextArray);
					tempContext.push(i);
					
					var tempContextObj = [].slice.call(contextArrayObj);
					tempContextObj.push(value);
					
					var tempReturn = validateField(val, schema, tempContext, tempContextObj, rootObj, value);
					
					if (tempReturn.errors.length > 0) {
						if (def.deleteOnInvalid) {
							delete value[i];
						} else {
							myErrors = myErrors.concat(tempReturn.errors);
						}
					}
				});
			}
		} else if (def.type === "object" || def.type === "indexObject") {
			if (typeof value !== "object") {
				simpleError = true;
			} else if (def.schema !== undefined) {
				// set aside field names for use in when validating extra keys
				var fields = [];
				
				def.schema.forEach(function(val2, i2) {
					fields.push(val2.name);
					
					var tempContext = [].slice.call(contextArray);
					tempContext.push(val2.name);
					
					var tempContextObj = [].slice.call(contextArrayObj);
					tempContextObj.push(value);
					
					var tempReturn = validateField(value[val2.name], val2, tempContext, tempContextObj, rootObj, value);
					
					if (tempReturn.data !== undefined) {
						value[val2.name] = tempReturn.data;
					}
					
					if (tempReturn.errors.length > 0) {
						if (val2.deleteOnInvalid) {
							delete value[val2.name];
						} else {
							myErrors = myErrors.concat(tempReturn.errors);
						}
					}
				});
				
				if (def.allowExtraKeys === false || def.deleteExtraKeys === true) {
					forEach(value, function(val2, i2) {
						if (fields.indexOf(i2) === -1) {
							if (def.deleteExtraKeys === true) {
								delete value[i2];
							} else {
								myErrors.push({ err : new Error("Object" + contextToString(contextArray) + "contains extra key '" + i2 + "' not declared in schema."), contextArray : contextArray });
							}
						}
					});
				}
			}
		} else if (def.type === "array") {
			if (! (value instanceof Array)) {
				simpleError = true;
			} else if (def.schema !== undefined) {
				value.forEach(function(val, i) {
					var tempContext = [].slice.call(contextArray);
					tempContext.push(i);
					
					var tempContextObj = [].slice.call(contextArrayObj);
					tempContextObj.push(value);
					
					var tempReturn = validateField(val, def.schema, tempContext, tempContextObj, rootObj, value);
					
					value[i] = tempReturn.data;
					
					if (tempReturn.errors.length > 0) {
						if (def.schema.deleteOnInvalid) {
							value.splice(i, 1);
						} else {
							myErrors = myErrors.concat(tempReturn.errors);
						}
					}
				});
			}
		} else if (def.type === "simpleObject") {
			if (typeof value !== "object") {
				simpleError = true;
			} else {
				forEach(value, function(val, i) {
					var tempContext = [].slice.call(contextArray);
					tempContext.push(i);
					
					var tempContextObj = [].slice.call(contextArrayObj);
					tempContextObj.push(value);
					
					var tempReturn = validateField(val, def.schema, tempContext, tempContextObj, rootObj, value);
					
					if (tempReturn.errors.length > 0) {
						if (def.schema.deleteOnInvalid) {
							delete value[i];
						} else {
							myErrors = myErrors.concat(tempReturn.errors);
						}
					}
				});
			}
		} else {
			// invalid type specified throw error, this is not a validation error but a developer error, so we throw
			throw new Error("Field" + contextToString(contextArray) + "should be of type '" + def.type + "' but that type isn't supported by jsvalidator.");
		}
		
		if (simpleError) {
			var err = new Error("Field" + contextToString(contextArray) + "is not of type '" + def.type + "'.");
			myErrors.push({ err : err, contextArray : contextArray });
		} else if (def.custom !== undefined) {
			def.custom.forEach(function(val, i) {
				var valid = val.fn({ value : value, current : currentObj });
				if (!valid) {
					var err = new Error("Field" + contextToString(contextArray) + "failed custom validation '" + val.label + "'.");
					myErrors.push({ err : err, contextArray : contextArray });
				}
			});
		}
		
		if (myErrors.length > 0) {
			if (def.defaultOnInvalid) {
				returnData.data = getDefault();
			} else if (def.throwOnInvalid) {
				throw concatErrors(rootObj, myErrors);
			} else {
				returnData.errors = returnData.errors.concat(myErrors);
			}
		}
		
		return returnData;
	}

	var contextToString = function(contextArray) {
		return contextArray.length === 0 ? " " : " '" + contextArray.join(".") + "' ";
	}

	var concatErrors = function(rootObj, errors) {
		var msg = errors.map(function(val) { return val.err.message }).join("\r\n\t") + "\r\n\tin " + util.inspect(rootObj);
		return new Error("Validation Error\r\n\t" + msg);
	}

	var getDefaultReturn = function(data) {
		return {
			data : data,
			errors : [],
			err : null,
			success : false
		}
	}

	var forEach = function(obj, callback) {
		for(var i in obj) {
			callback(obj[i], i);
		}
	}

	module.exports = {
		validate : validate
	}
});