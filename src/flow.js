var gpn = require('get-parameter-names')
var async = require('async');
var _ = require('underscore');
var ok = require('okay');

module.exports = {
	start: function (context, methods, callback, parent) {
		var ignore = false;

		var doFinished = function (err, context) {
			// prevent accidental invocation
			delete context.flow;

			if (err) {
				if (parent) {
					return parent.error(err);
				}

				return callback(err, context);
			}

			if (parent) {
				return parent.next();
			}

			callback(null, context);
		};

		var processStep = function (index) {
			if (ignore) {
				return doFinished(null, context);
			}

			var method = methods[index];

			var ctx = _.extend({}, context, {
				flow: {
					error: function (err) {
						callback(err, ctx);
					},
					ok: function (callback) {
						if (!callback) {
							callback = this.next;
						}

						return ok(this.error, callback);
					},
					fork: function (name, items) {
						var queue = [];

						items.forEach(function (item) {
							var subcontext = {};
							subcontext[name] = item;

							_.extend(subcontext, ctx);

							queue.push(function (qCallback) {
								module.exports.start(subcontext, methods.slice(index + 1), qCallback);
							});
						});

						return async.series(queue, function (err) {
							doFinished(err, ctx);
						});
					},
					next: function (data) {
						if (methods[index + 1]) {
							_.extend(context, data);

							return processStep(index + 1);
						}

						_.extend(ctx, data);

						doFinished(null, ctx);
					},
					ignore: function (chain) {
						ignore = true;

						if (parent && (index + 1 == methods.length || chain)) {
							return parent.ignore(true);
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

				return method.apply(undefined, args);
			}

			throw new Error('invalid flow method defined.');
		};

		processStep(0);
	}
}