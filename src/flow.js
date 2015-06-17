var gpn = require('get-parameter-names')
var async = require('async');
var _ = require('underscore');

module.exports = function (context, methods, callback, parent) {
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
				next: function (data, name) {
					if (_.isArray(data)) {
						var queue = [];

						data.forEach(function (item) {
							var subcontext = {};
							subcontext[name] = item;

							_.extend(subcontext, ctx);

							queue.push(function (qCallback) {
								module.exports(subcontext, methods.slice(index + 1), qCallback);
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
				retry: function (delay) {
					callback(delay ? delay : true);
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
			return module.exports(ctx, method, callback, ctx.flow);
		}

		var args = [];

		gpn(method).forEach(function (argumentName) {
			if (typeof ctx[argumentName] === 'undefined') {
				throw Error('Unable to find ' + argumentName + ' in flow context.');
			}

			args.push(ctx[argumentName]);
		});

		method.apply(undefined, args);
	};

	processStep(0);
}