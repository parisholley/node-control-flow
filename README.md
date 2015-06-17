# Control Flow
[![travis](https://travis-ci.org/parisholley/node-control-flow.svg)](https://travis-ci.org/parisholley/node-control-flow)

[![NPM](https://nodei.co/npm/node-control-flow.png)](https://nodei.co/npm/node-control-flow/)

A control flow library for javascript intended to handle the orchestration of multiple invocations within a data context.

**Note:** This library is released pre-1.0 as the API will most likely change once members of the community provide their input. 

## Purpose

### 1. Ability to terminate flow on business errors without using the error callback model.

This is the main reason I built this library, as this was a sore spot when dealing with batch processing and worker models. Often times, based on business requirements, I want to prevent execution flow from continuing but do not want to rely on the error callback pattern or introduce additional code checking between each step (ie: returning a status object and asserting how to continue). By allowing each method to determine their place in the flow, I can encapsulate that logic and reuse it across flows without much effort.

### 2. Avoid passing data through a callback waterfall

Another pain point when using a library like async directly, is you end up having to implement your own context pattern. This often requires having a global context "object" that is either accessed through scoped invocation for each method, or passed from call to call. That model breaks down as soon you want to break your invocation into separate modules and now you have the concern of sharing state across each.

### 3. Fork flows to execute the same logic across different data sets

The best example of this would be to pull data from a remote source (like a database), then for each result execute a series of methods. Sounds simple, but to do so without introducing a ton of boilerplate code is a hassle.

## Examples

### Basic Use Case

```javascript
var flow = require('node-control-flow');

module.exports = {
	start: function (callback) {
		// run setup code, this typically is used to gather all I/O connections, listen to a queue or schedule via timer
		setTimeout(function(){
			module.exports._execute(var1, var2, var3, callback);
		});
	},
	_execute: function (var1, var2, var3, callback) {
		// we encapsulate our orechestration logic in one place to allow for better testing (ie: mocking out I/O)
	
		var context = {
			var1: var1,
			var2: var2,
			var3: var3
		};

		flow(context, [
			module.exports._doThingOne,
			module.exports._doThingTwo,
			module.exports._doThingThree
		], callback);
	},
	_doThingOne: function(var1, flow){
		// we have access to the var1 object from our context
		// flow is always injected as the last argument
		
		flow.next();
	},
	_doThingTwo: function(var2, var3, flow){
		// as the next called method, we can introduce new items in the context
		
		flow.next({
			var4: 'new value'
		});
	},
	_doThingThree: function(var4, flow){
		// any method called after _doThingTwo will have access to var4
		
		flow.next();
	}
}
```


### Flow Interruption

```javascript
var flow = require('node-control-flow');

module.exports = {
	_execute: function (callback) {
		var context = {};

		flow(context, [
			module.exports._doThingOne,
			module.exports._doThingTwo,
			module.exports._doThingThree
		], callback);
	},
	_doThingOne: function(flow){		
		flow.next();
	},
	_doThingTwo: function(flow){
		// because we invoke flow.ignore(), the main flow will stop executing and flow callback will be called
		
		flow.ignore();
	},
	_doThingThree: function(flow){
		// this method would never be called
	}
}
```

### Forked Flows

Forked flows allow you to easily define a single "flow" but have it execute multiple times per item. By default, each item will execute in sequence and complete fully before moving on to the next item.

**Note:** It is likely this logic will be moved to a flow.fork() method instead of piggybacking on flow.next()


```javascript
var flow = require('node-control-flow');

module.exports = {
	_execute: function (callback) {
		var context = {};

		flow(context, [
			module.exports._firstStep,
			module.exports._forkStep,
			module.exports._multipleOne,
            module.exports._multipleTwo
		], callback);
	},
	_firstStep: function(flow){		
		flow.next();
	},
	_forkStep: function(flow){
		flow.next(['item1', 'item2'], 'item');
	},
	_multipleOne: function(item, flow){
		// on the first past this will be called with item = 'item1', after _multipleTwo, this will be called again with item = 'item2'
		flow.next();
	},
	_multipleTwo: function(item, flow){
		// when item = 'item1', flow.next() will jump back to _mulltipleOne and continue with item = 'item2'. When item = 'item2', the main flow will complete.
		flow.next();
	}
}
```

### Subflows

A subflow behaves just like a normal flow but it comes with a few features:

1. The context is forked in a subflow and any data added to it will be discarded when continuing outside the flow
2. A subflow can be interrupted in isolation without affecting the main flow UNLESS the last method in the flow initatives the ignore.

#### Subflow Execute + Continue Main Flow

```javascript
var flow = require('node-control-flow');

module.exports = {
	_execute: function (callback) {
		var context = {};

		flow(context, [
			module.exports._firstStep,
			[module.exports._shouldSubflowExecute, module.exports._doSubflowLogic],
			module.exports._finalStep
		], callback);
	},
	_firstStep: function(flow){		
		flow.next();
	},
	_shouldSubflowExecute: function(flow){
		// we have an opportunity to abort the subflow via flow.ignore(), and continue the main flow, but in this example we continue
		
		flow.next({
			subflowData: 'foobar'
		});
	},
	_doSubflowLogic: function(subflowData, flow){
		// this will be invoked because _shouldSubflowExecute called flow.next() instead of flow.ignore()
		
		flow.next();
	},
	_finalStep: function(flow){
		// subflowData is not available as an argument to this step
		// this will call because the subflow executed without issue
		flow.next();
	}
}
```

#### Subflow Interrupt + Continue Main Flow

```javascript
var flow = require('node-control-flow');

module.exports = {
	_execute: function (callback) {
		var context = {};

		flow(context, [
			module.exports._firstStep,
			[module.exports._shouldSubflowExecute, module.exports._doSubflowLogic],
			module.exports._finalStep
		], callback);
	},
	_firstStep: function(flow){
		flow.next();
	},
	_shouldSubflowExecute: function(flow){
		// any method that calls flow.ignore() in a subflow will still allow the main flow to continue unless it is the last step in the subflow
		
		flow.ignore();
	},
	_doSubflowLogic: function(flow){
		// this will not be invoked because the previous step called flow.ignore()
	},
	_finalStep: function(flow){
		// this will call because the subflow executed without issue
		flow.next();
	}
}
```

#### Subflow Interrupt + Stop Main Flow

```javascript
var flow = require('node-control-flow');

module.exports = {
	_execute: function (callback) {
		var context = {};

		flow(context, [
			module.exports._firstStep,
			[module.exports._shouldSubflowExecute, module.exports._doSubflowLogic],
			module.exports._finalStep
		], callback);
	},
	_firstStep: function(flow){		
		flow.next();
	},
	_shouldSubflowExecute: function(flow){
		flow.next();
	},
	_doSubflowLogic: function(flow){
		// this will cause the entire flow to stop immediately
		
		flow.ignore();
	},
	_finalStep: function(flow){
		// this will not be invoked because the last step in the previous subflow called flow.ignore()
		flow.next();
	}
}
```