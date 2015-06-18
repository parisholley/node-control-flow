var gpn = require('get-parameter-names')
var async = require('async');
var _ = require('underscore');
var ok = require('okay');

var dynamicMethodExecution = function(ctx, method){
	var args = [];

	gpn(method).forEach(function (argumentName) {
		if (typeof ctx[argumentName] === 'undefined') {
			throw Error('Unable to find ' + argumentName + ' in flow context.');
		}

		args.push(ctx[argumentName]);
	});

	return method.apply(undefined, args);
};

module.exports = {
	wrap: function(method){
		return {
			func: method,
			args: gpn(method),
			context: function(flow){
				return {
					callback: flow.ok()
				};
			}
		};
	},
	start: function (context, methods, callback, parent) {
		var ignore = false;

		var doFinished = function (err) {
			if (err) {
				if (parent) {
					return parent.error(err);
				}

				return callback(err);
			}

			if (parent) {
				return parent.next();
			}

			callback();
		};

		var processStep = function (index) {
			if (ignore) {
				return doFinished();
			}

			var method = methods[index];

			var ctx = _.extend({}, context, {
				flow: {
					error: function (err) {
						callback(err);
					},
					ok: function(callback){
						if(!callback){
							callback = this.next;
						}

						return ok(this.error, callback);
					},
					next: function (data, name) {
						if (_.isArray(data)) {
							var queue = [];

							data.forEach(function (item) {
								var subcontext = {};
								subcontext[name] = item;

								_.extend(subcontext, ctx);

								queue.push(function (qCallback) {
									module.exports.start(subcontext, methods.slice(index + 1), qCallback);
								});
							});

							return async.series(queue, doFinished);
						}

						_.extend(context, data);

						if (methods[index + 1]) {
							return processStep(index + 1);
						}

						doFinished()
					},
					ignore: function (chain) {
						ignore = true;

						if (parent && (index + 1 == methods.length || chain)) {
							return parent.ignore(true);
						}

						doFinished();
					}
				}
			});

			if (_.isArray(method)) {
				return module.exports.start(ctx, method, callback, ctx.flow);
			}

			if(_.isFunction(method)){
				return dynamicMethodExecution(ctx, method);
			}

			if(_.isObject(method.context)){
				var tempCtx = ctx;

				if(_.isFunction(method.context)){
					tempCtx = _.extend({}, ctx, dynamicMethodExecution(ctx, method.context));
				};

				var args = [];

				_.each(method.args, function(argumentName){
					args.push(tempCtx[argumentName]);
				});

				return method.func.apply(undefined, args);
			}

			throw new Error('invalid flow method defined.');
		};

		processStep(0);
	}
}