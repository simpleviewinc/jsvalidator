[![Build Status](https://travis-ci.org/simpleviewinc/jsvalidator.svg?branch=master)](https://travis-ci.org/simpleviewinc/jsvalidator)

# jsvalidator

`npm install jsvalidator`

Comprehensive recursive Javscript validator for objects, arrays, strings and more.

# Features

0. Validate Objects, Arrays, and Arrays of Objects, Objects with Arrays, strings, numbers, classes and any recursive combination in between.
0. There is no limit on how deeply nested the data you are validating. You can have objects with objects with arrays of yet more objects.
0. Specify default values for fields anywhere in the tree.
0. Specify what fields are required and what fields are optional while still enforcing the type on both.
0. Perfect for validating complicated input to functions or from 3rd party APIs.
0. Can return a single error which states all of the validation problems in the object. Helps to provide developers with exactly what is wrong with their arguments.

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

# API Documentation

## validator.validate(data, schema)

* `data` - `any` - Any type of data you want to validate, including undefined, and null.
* `schema` - `object` - The schema object
    * `name` - `string` - The name of the key. Not required for the root level schema.
    * `type` - `string` - The type of the key. If the data in that key is not the valid type, it will return invalid.
    * `required` - `boolean` - Whether the key is required. If key is undefined, it will return invalid.
    * `default` - `any` or `function` - The default value to use when the key is undefined, or will execute a function to fill it in. When using a function, it wil have access to the keys in the passed in data as well.
    * `class` - `class` - Any un-initialized `function` to be used when doing `type : "class"`. Equivalent to `foo instanceof class`.
    * `schema` - `object` or `array` - For objects, use an array to define the schema (because it is the keys of the object). For arrays, use an object to define the schema (because it is the schema checked against each item in the array).
    * `allowExtraKeys` - `boolean` - default `true` - When validating object, this will allow extra keys not declared in the schema to remain in the object. If `false` then it will be considered invalid if a non-declared key is in the object being validated.
    * `deleteExtraKeys` - `boolean` - default `false` - When validating objects, if extra keys are passed which aren't declared in the schema, they will be removed, but the object will be considered valid.
    * `throwOnInvalid` - `boolean` - default `false` - When true, it will throw an error if the data did not pass validation.
    * `min` - `number` - When validating strings ensures that the string is longer than the `min`.
    * `max` - `number` - When validating strings ensures that the string is longer than the `max`.

## valid types

* `string` - Key is `typeof "string"`
* `number` - Numbers which pass `typeof "number"`. `"5"` is not a valid number but `5` is.
* `boolean` - Key is boolean `true` or `false`. Strings `"true"`, or `"false"` are not valid.
* `class` - Used with 'class' key to ensure a key is an instance of a certain class
* `date` - Key is `instanceof Date`
* `array` - Arrays which pass `instanceof Array`
* `object` - Objects which pass `typeof "object"`
* `function` - Key is a `typeof "function"`
