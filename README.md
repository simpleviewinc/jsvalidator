[![Build Status](https://travis-ci.org/simpleviewinc/jsvalidator.svg?branch=master)](https://travis-ci.org/simpleviewinc/jsvalidator)

# jsvalidator

`npm install jsvalidator`

Comprehensive recursive Javscript validator for objects, arrays, strings and more.

# Features

1. Validate Objects, Arrays, and Arrays of Objects, Objects with Arrays, strings, numbers, classes and any recursive combination in between.
1. There is no limit on how deeply nested the data you are validating. You can have objects with objects with arrays of yet more objects.
1. Specify default values for fields anywhere in the tree.
1. Specify what fields are required and what fields are optional while still enforcing the type on both.
1. Perfect for validating complicated input to functions or from 3rd party APIs.
1. Can return a single error which states all of the validation problems in the object. Helps to provide developers with exactly what is wrong with their arguments.

# Current Benchmark

```
: npm run simplebench
> jsvalidator@0.9.0 simplebench /sv/gits/jsvalidator
> simplebench testing/benchmark.js

Group:  default
benchmark - count: 334, ops/sec: 334
```

# Getting Started

`npm install jsvalidator`

jsvalidator has a very simple syntax.

```js
// basic syntax
var jsvalidator = require("jsvalidator");
var temp = jsvalidator.validate(data, schema);

// validate some simple value
var temp = jsvalidator.validate("foo", { type : "string" });
// temp.success === true
var temp = jsvalidator.validate(5, { type : "string" } );
// temp.success === false
```

Of course, there's no reason for a package like this if all you are doing is validating simple things. What `jsvalidator` excels at is validating and defaulting `array` and `object`. Here is a more complicated example which shows a validation of an array of objects. `jsvalidator` will ensure that every key matches the defined schema, all required fields exist, and default values filled in. If anything is arwy, it will return an error.

```js
// imagine we start with the following data
var posts = [
    { title : "Science is Awesome", views : 5, tags : ["foo", "bar", "baz"] },
    { title : "NPM 4 Lyfe" }
];

var temp = jsvalidator.validate(posts, { 
    type : "array", 
    schema : {
        type : "object",
        schema : [
            { name : "title", type : "string", required : true },
            { name : "views", type : "number", default : 0 },
            { name : "tags", type : "array", schema : { type : "string" } },
            { name : "created", type : "date", default : function() { return new Date() } }
        ]
    }
});
// temp.success === true

// after running it through the validator, it will have filled in some values, leaving us with the following posts array

// posts = [
//    { title : "Science is Awesome", views : 5, tags : ["foo", "bar", "baz"] },
//    { title : "NPM 4 Lyfe", views : 0, created : (Today's Date) }
// ];
```

## Examples

### Validating objects

* Note: When validating objects, you do not need to provide a `schema`, if not included it will only check to make sure the key is an object, but will not recurse and validate it's sub-keys.

```js
var temp = jsvalidator.validate(data, {
    type : "object",
    // schema for objects should be an array of the valid keys
    schema : [
        // ensure data.foo is a string
        { name : "foo", type : "string" },
        // ensure data.bar is an object as well, which is required
        {
            name : "bar",
            type : "object" 
            schema : [
                // ensure data.bar.subBar1 is a number
                { name : "subBar1", type : "number" },
                // ensure data.bar.subBar2 is object, with any schema
                { name : "subBar2", type : "object" }
            ],
            required : true
        }
    ]
})
```

### Validing indexObjects

indexObject's are used in cases where you the key names are arbitrary but the data in each key conforms to a specific schema.

* Note: When validating indexObjects, you can pass schema as an object `{}` which will validate each key as exactly that type. If schema is passed as an array then it will validate each key as an object using that schema.

```js
// ensures all keys in the original data are of type number, does not validate the key names themselves.
var temp = jsvalidator.validate({
    foo : 5,
    bar : 10,
    baz : 5
}, {
    type : "indexObject",
    schema : {
        type : "number"
    }
});
```

```js
// ensures all keys in the original data are objects with the matching schema.
var temp = jsvalidator.validate({
    foo : { nested : "stringValue" },
    bar : { nested : "stringValue2" },
    baz : { nested : "stringValue3" }
}, {
    type : "indexObject",
    schema : [
        { name : "nested", type : "string", required : true }
    ],
    allowExtraKeys : false
});
```

### Validating function args

```js
// imagine we have a function which accepts a whole bunch of arguments
var myFunc = function(args, cb) {
    // this validation schema will ensure the following things
    // args is an object
    // args.foo always exists and is a number
    // args.bar is a string, but if not provided the validator will fill in value of "defaultBar"
    // args.tags is an array of strings, but if a non-string is in the array, it will delete it.
    // args.baz is a date, but isn't required and doesn't have a default
    var temp = jsvalidator.validate(args, {
        type : "object"
        schema : [
            { name : "foo", type : "number", required : true },
            { name : "bar", type : "string", default : "defaultBar" },
            { name : "tags", type : "array", schema : { type : "string" }, deleteOnInvalid : true },
            { name : "baz", type : "date" }
        ],
        required : true
    });
    
    if (temp.success === false) {
        return cb(temp.err);
    }
}
```

### Validating classes

```js
var Foo = function() {
    this.me = "fooValue";
};

var Bar = function() {
    this.me = "barValue";
}

// create instance of Foo and Bar
var foo = new Foo();
var bar = new Bar();

var temp = jsvalidator.validate(foo, { type : "class", class : Foo });
// temp.success === true

var temp = jsvalidator.validate(bar, { type : "class", class : Foo });
// temp.success === false
```

### Defaulting values

You can specify a default value with a simple value or with a function.

```js
// sets a value from a simple value
var data = {};
var temp = jsvalidator.validate(data, { type : "object", schema : [{ name : "foo", type : "string", default : "fooValue" }] });
// data.foo === "fooValue"

// sets a value from a function
var data = {};
var temp = jsvalidator.validate(data, { type : "object", schema : [{ name : "foo", type : "string", default : function(args) { return "fooValue" } }] });
// data.foo === "fooValue"

// sets a value from a function based on another key within the object
var data = [
    {
        i : 0,
        foo : "fooValue1"
    },
    {
        i : 1,
        foo : "FoOVaLue2"
    }
];

var temp = jsvalidator.validate(data, {
    type : "array",
    schema : {
        type : "object",
        schema : [
            { name : "foo", type : "string", required : true },
            { name : "fooLower", type : "string", default : function(args) { return args.current.foo.toLowerCase() } }
        ]
    }
});

// data[0].fooLower === "foovalue1"
// data[1].foolower === "foovalue2"
```

* `default` function args
    * `rootObj` - `any` - The root entity that is being validated.
    * `current` - `any` - If inside an object, it is a reference to that object, this is useful if a key depends on another key.
    * `i` - `interger` - If inside an object which is inside an array, it is the array index of this object. This is useful for defaulting an ascending integer to each element in an array.

*NOTE:* If you are iterating through an array an default a value to a implicit array or object `{}` or `[]` it is doing it by reference. This means all iterations will get the same array or object. You should use a function in that situation.

# API Documentation

## validator.validate(data, schema)

* `data` - `any` - Any type of data you want to validate, including undefined, and null.
* `schema` - `object` - The schema object
    * `name` - `string` - The name of the key. Not required for the root level schema.
    * `type` - `string` - The type of the key. If the data in that key is not the valid type, it will return invalid.
    * `required` - `boolean` - Whether the key is required. If key is undefined, it will return invalid.
    * `default` - `any` or `function` - The default value to use when the key is undefined, or will execute a function to fill it in. See the section on defaulting values for more information.
    * `class` - `class` - Any un-initialized `function` to be used when doing `type : "class"`. Equivalent to `foo instanceof class`.
    * `schema` - `object` or `array` - For objects, use an array to define the schema (because it is the keys of the object). For arrays, use an object to define the schema (because it is the schema checked against each item in the array).
    * `allowExtraKeys` - `boolean` - default `true` - When validating object, this will allow extra keys not declared in the schema to remain in the object. If `false` then it will be considered invalid if a non-declared key is in the object being validated.
    * `deleteExtraKeys` - `boolean` - default `false` - When validating objects, if extra keys are passed which aren't declared in the schema, they will be removed, but the object will be considered valid.
    * `throwOnInvalid` - `boolean` - default `false` - When true, it will throw an error if the data did not pass validation.
    * `min` - `number` - When validating strings ensures that the string is longer than the `min`.
    * `max` - `number` - When validating strings ensures that the string is longer than the `max`.
    * `regex` - `regex` - When validating strings ensures that the string matches the regex. If no match, it will be invalid.

## valid types

* `string` - Key is `typeof "string"`
* `number` - Numbers which pass `typeof "number"`. `"5"` is not a valid number but `5` is.
* `boolean` - Key is boolean `true` or `false`. Strings `"true"`, or `"false"` are not valid.
* `class` - Used with 'class' key to ensure a key is an instance of a certain class
* `date` - Key is `instanceof Date`
* `array` - Arrays which pass `instanceof Array`
* `object` - Objects which pass `typeof "object"`
* `indexObject` - Objects which have key values where the key names are unknown but the values match a schema such as { foo : number, bar : number, baz : number }
* `function` - Key is a `typeof "function"`
