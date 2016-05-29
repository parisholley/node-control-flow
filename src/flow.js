var gpn = require('get-parameter-names')
var async = require('async');
var _ = require('underscore');
var ok = require('okay');

module.exports = {
	start: function (startingContext, methods, callback, parent) {
		var ignore = false;

		var interceptors = [];

		var executeInterceptors = function (err, interceptorContext, interceptorCallback) {
			if (interceptors.length == 0) {
				return interceptorCallback(err);
			}

			var runs = [];

			interceptors.reverse().forEach(function (intercept) {
				runs.push(function (qCallback) {
					intercept(err, interceptorContext, qCallback);
				});
			});

			async.series(runs, ok(interceptorCallback, function () {
				interceptorCallback(null, interceptorContext);
			}))
		};

		var doFinished = function (err, finishedContext) {
			// prevent accidental invocation
			delete finishedContext.flow;

			executeInterceptors(err, finishedContext, function (err) {
				if (parent) {
					if (err) {
						return parent.error(err);
					}

					return parent.next();
				}

				callback(err, finishedContext);
			});
		};

		var processStep = function (index) {
			if (ignore) {
				return doFinished(null, startingContext);
			}

			var method = methods[index];

			var ctx = _.extend({}, startingContext, {
				flow: {
					error: function (err) {
						doFinished(err, ctx);
					},
					ok: function (callback) {
						if (!callback) {
							callback = this.next;
						}

						return ok(this.error, callback);
					},
					fork: function (name, items, data) {
						var queue = [];

						items.forEach(function (item) {
							var subcontext = {};
							subcontext[name] = item;

							var additional = data || {};

							if (_.isFunction(data)) {
								additional = data(item);
							}

							_.extend(subcontext, ctx, additional);

							queue.push(function (qCallback) {
								module.exports.start(subcontext, methods.slice(index + 1), qCallback);
							});
						});

						return async.series(queue, function (err) {
							doFinished(err, ctx);
						});
					},
					intercept: function (func, data) {
						if (methods[index + 1]) {
							interceptors.push(func);

							if (data) {
								_.extend(startingContext, data);
							}

							return processStep(index + 1);
						}

						interceptors.push(data);

						if (data) {
							_.extend(ctx, data);
						}

						doFinished(null, ctx);
					},
					next: function (data) {
						if (methods[index + 1]) {
							_.extend(startingContext, data);

							return processStep(index + 1);
						}

						_.extend(ctx, data);

						doFinished(null, ctx);
					},
					ignore: function (chain) {
						ignore = true;

						if (parent && (index + 1 == methods.length || chain)) {
							return executeInterceptors(null, ctx, function (err) {
								if (err) {
									return parent.error(err);
								}

								return parent.ignore(true);
							});
						}

						doFinished(null, ctx);
					}
				}
			});

			ctx.callback = ctx.flow.ok();

			if (_.isArray(method)) {
				return module.exports.start(ctx, method, callback, ctx.flow);
			}

			if (_.isFunction(method)) {
				var args = [];

				gpn(method).forEach(function (argumentName) {
					if (typeof ctx[argumentName] === 'undefined') {
						throw Error('Unable to find ' + argumentName + ' in flow context.');
					}

					args.push(ctx[argumentName]);
				});

				try {
					return method.apply(undefined, args);
				} catch (ex) {
					return callback(ex);
				}
			}

			throw new Error('invalid flow method defined.');
		};

		processStep(0);
	}
}