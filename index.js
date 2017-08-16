// umd boilerplate for CommonJS and AMD
if (typeof exports === 'object' && typeof define !== 'function') {
	var define = function (factory) {
		factory(require, exports, module);
	};
}

define(function(require, exports, module) {
	var util = require("util-browser");
	
	// stash state variables so we don't have to pass from function to function
	var contextArray;
	var contextArrayObj;
	var myErrors = [];
	var rootObj;
	var currentObj;
	
	var validate = function(obj, schema) {
		contextArray = [];
		contextArrayObj = [];
		myErrors = [];
		rootObj = obj;
		currentObj = obj;
		
		var newSchema = defaultSchema(schema);
		
		var data = validateField(obj, newSchema);
		
		var returnData = {
			data : data,
			errors : myErrors,
			err : null,
			success : false
		}
		
		returnData.success = returnData.errors.length === 0;
		
		if (returnData.errors.length > 0) {
			returnData.err = concatErrors(obj, returnData.errors);
		}
		
		return returnData;
	}
	
	var defaultSchema = function(def) {
		var newSchema = {
			type : def.type,
			name : def.name,
			enum : def.enum,
			default : def.default,
			max : def.max,
			min : def.min,
			regex : def.regex,
			class : def.class,
			custom : def.custom,
			required : def.required !== undefined ? def.required === true : false,
			schema : 
				def.type === "indexObject" && def.schema instanceof Array ? [{
					type : "object",
					schema : def.schema,
					deleteExtraKeys : def.deleteExtraKeys,
					allowExtraKeys : def.allowExtraKeys
				}] :
				def.schema instanceof Array ? def.schema :
				def.schema !== undefined ? [def.schema] :
				undefined
			,
			allowExtraKeys : def.allowExtraKeys !== undefined ? def.allowExtraKeys === true : true,
			deleteExtraKeys : def.deleteExtraKeys !== undefined ? def.deleteExtraKeys === true : false,
			throwOnInvalid : def.throwOnInvalid !== undefined ? def.throwOnInvalid === true : false
		}
		
		if (newSchema.schema !== undefined) {
			for(var i = 0; i < newSchema.schema.length; i++) {
				newSchema.schema[i] = defaultSchema(newSchema.schema[i]);
			}
		}
		
		return newSchema;
	}

	var validateField = function(value, def) {
		var exists = value !== undefined;
		var schema = def.schema;
		var type = def.type;
		var throwOnInvalid = def.throwOnInvalid;
		var required = def.required;
		var custom = def.custom;
		
		if (!exists && required) {
			var err = new Error("Required field" + contextToString(contextArray) + "does not exist.");
			
			if (throwOnInvalid) {
				throw err;
			} else {
				myErrors.push({ err : err, contextArray : contextArray });
				return value;
			}
		}
		
		if (!exists && !required && def.default === undefined) {
			// doesn't exist, not required, does not have default then do nothing
			return value;
		}
		
		if (!exists && !required && def.default !== undefined) {
			// doesn't exist, not required, has default then use default
			value = getDefault(value, def);
			
			if (def.type === "object" || def.type === "array") {
				// if it is an object and we're using the default, we still want it to run through the validations of it's inner keys
				// this allows defaults and requires to still be processed on "default" values
				
				exists = true;
			} else {
				return value;
			}
		}
		
		// field exists
		if (!exists) {
			throw new Error("Wtf, this case should never happen.");
		}
		
		var simpleError = false;
		
		if (type === "any") {
			// no type declared perform no type validation
		} else if (type === "string") {
			if (typeof value !== "string") {
				simpleError = true;
			} else {
				validateString(value, def);
			}
		} else if (type === "boolean") {
			if (typeof value !== "boolean") {
				simpleError = true;
			}
		} else if (type === "number") {
			if (typeof value !== "number") {
				simpleError = true;
			}
		} else if (type === "function") {
			if (typeof value !== "function") {
				simpleError = true;
			}
		} else if (type === "class") {
			if (! (value instanceof def.class)) {
				simpleError = true;
			}
		} else if (type === "date") {
			if (! (value instanceof Date)) {
				simpleError = true;
			}
		} else if (type === "indexObject") {
			if (typeof value !== "object") {
				simpleError = true;
			} else if (schema !== undefined) {
				validateIndexObject(value, def);
			}
		} else if (type === "object") {
			if (typeof value !== "object") {
				simpleError = true;
			} else if (schema !== undefined) {
				validateObject(value, def);
			}
		} else if (type === "array") {
			if (! (value instanceof Array)) {
				simpleError = true;
			} else if (schema !== undefined) {
				validateArray(value, def);
			}
		} else if (type === "simpleObject") {
			if (typeof value !== "object") {
				simpleError = true;
			} else {
				validateSimpleObject(value, def);
			}
		} else {
			// invalid type specified throw error, this is not a validation error but a developer error, so we throw
			throw new Error("Field" + contextToString(contextArray) + "should be of type '" + def.type + "' but that type isn't supported by jsvalidator.");
		}
		
		if (simpleError) {
			var err = new Error("Field" + contextToString(contextArray) + "is not of type '" + def.type + "'.");
			myErrors.push({ err : err, contextArray : contextArray });
		} else if (custom !== undefined) {
			custom.forEach(function(val, i) {
				var valid = val.fn({ value : value, current : currentObj });
				if (!valid) {
					var err = new Error("Field" + contextToString(contextArray) + "failed custom validation '" + val.label + "'.");
					myErrors.push({ err : err, contextArray : contextArray });
				}
			});
		}
		
		if (myErrors.length > 0 && throwOnInvalid === true) {
			throw concatErrors(rootObj, myErrors);
		}
		
		return value;
	}
	
	var validateArray = function(value, def) {
		var val;
		for(var i = 0; i < value.length; i++) {
			val = value[i];
			
			contextArray.push(i);
			contextArrayObj.push(value);
			
			var previous = currentObj;
			currentObj = value;
			var tempReturn = validateField(val, def.schema[0]);
			currentObj = previous;
			
			contextArray.pop();
			contextArrayObj.pop();
			
			value[i] = tempReturn;
		}
	}
	
	var validateObject = function(value, def) {
		// set aside field names for use in when validating extra keys
		var fields = [];
		
		var val;
		for(var i = 0; i < def.schema.length; i++) {
			val = def.schema[i];
			fields.push(val.name);
			
			contextArray.push(val.name);
			contextArrayObj.push(value);
			
			var previous = currentObj;
			currentObj = value;
			var tempReturn = validateField(value[val.name], val);
			currentObj = previous;
			
			contextArray.pop();
			contextArrayObj.pop();
			
			if (tempReturn !== undefined) {
				value[val.name] = tempReturn;
			}
		}
		
		if (def.allowExtraKeys === false || def.deleteExtraKeys === true) {
			for(var i in value) {
				if (fields.indexOf(i) === -1) {
					if (def.deleteExtraKeys === true) {
						delete value[i];
					} else {
						myErrors.push({ err : new Error("Object" + contextToString(contextArray) + "contains extra key '" + i + "' not declared in schema."), contextArray : contextArray });
					}
				}
			}
		}
	}
	
	var validateIndexObject = function(value, def) {
		var val;
		for(var i in value) {
			val = value[i];
			
			contextArray.push(i);
			contextArrayObj.push(value);
			
			var previous = currentObj;
			currentObj = value;
			var tempReturn = validateField(val, def.schema[0]);
			currentObj = previous;
			
			contextArray.pop();
			contextArrayObj.pop();
		}
	}
	
	var validateSimpleObject = function(value, def) {
		var val;
		for(var i in value) {
			val = value[i];
			
			contextArray.push(i);
			contextArrayObj.push(value);
			
			var previous = currentObj;
			currentObj = value;
			var tempReturn = validateField(val, def.schema[0]);
			currentObj = previous;
			
			contextArray.pop();
			contextArrayObj.pop();
		}
	}
	
	var validateString = function(value, def) {
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
	
	var getDefault = function(value, def) {
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

	var contextToString = function(contextArray) {
		return contextArray.length === 0 ? " " : " '" + contextArray.join(".") + "' ";
	}

	var concatErrors = function(rootObj, errors) {
		var msg = errors.map(function(val) { return val.err.message }).join("\r\n\t") + "\r\n\tin " + util.inspect(rootObj);
		return new Error("Validation Error\r\n\t" + msg);
	}

	module.exports = {
		validate : validate
	}
});