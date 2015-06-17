# Control Flow
A control flow library for javascript intended to handle the orchestration of multiple invocations within a data context.

## Purpose

### 1. Ability to terminate flow on business errors without using the error callback model.

This is the main reason I built this library, as this was a sore spot when dealing with batch processing and worker models. Often times, based on business requirements, I want to prevent execution flow from continuing but do not want to rely on the error callback pattern or introduce additional code checking between each step (ie: returning a status object and asserting how to continue). By allowing each method to determine their place in the flow, I can encapsulate that logic and reuse it across flows without much effort.

### 2. Avoid passing data through a callback waterfall

Another pain point when using a library like async directly, is you end up having to implement your own context pattern. This often requires having a global context "object" that is either accessed through scoped invocation for each method, or passed from call to call. That model breaks down as soon you want to break your invocation into separate modules and now you have the concern of sharing state across each.

### 3. Fork flows to execute the same logic across different data sets

The best example of this would be to pull data from a remote source (like a database), then for each result execute a series of methods. Sounds simple, but to do so without introducing a ton of boilerplate code is a hassle.


### Simple Use

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