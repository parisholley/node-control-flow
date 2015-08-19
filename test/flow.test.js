require('chai').should();
var flow = require('../src/flow');

describe('index', function () {
	it('should succeed when using callback pattern', function (done) {
		flow.start({
			foo: 'bar'
		}, [
			function (foo, callback) {
				foo.should.equal('bar');

				callback();
			}
		], function (err, context) {
			context.foo.should.equal('bar');

			done(err);
		});
	});

	it('should error out when using callback pattern', function (done) {
		flow.start({
			foo: 'bar'
		}, [
			function (foo, callback) {
				foo.should.equal('bar');

				callback('fail');
			}
		], function (err, context) {
			err.should.equal('fail');
			context.foo.should.equal('bar');

			done();
		});
	});

	it('should error out when using flow.ok', function (done) {
		flow.start({
			foo: 'bar'
		}, [
			function (flow) {
				var callback = flow.ok(function () {
					fail();
				});

				callback('fail');
			}
		], function (err, context) {
			err.should.equal('fail');
			context.foo.should.equal('bar');

			done();
		});
	});

	it('should call flow next if no function is passed', function (done) {
		var called = false;

		flow.start({
			foo: 'bar'
		}, [
			function (flow) {
				var callback = flow.ok();

				callback();
			},
			function (flow) {
				called = true;

				flow.next();
			}
		], function (err, context) {
			called.should.be.true;
			context.foo.should.equal('bar');

			done(err);
		});
	});

	it('should complete and pass data', function (done) {
		flow.start({
			foo: 'bar'
		}, [
			function (flow) {
				var callback = flow.ok(function (data) {
					data.should.equal('data');

					flow.next();
				});

				callback(null, 'data');
			}
		], function (err, context) {
			(err == null).should.be.true;
			context.foo.should.equal('bar');

			done(err);
		});
	});

	it('should complete', function (done) {
		flow.start({
			foo: 'bar'
		}, [
			function (flow) {
				flow.next();
			}
		], function (err, context) {
			context.foo.should.equal('bar');

			done(err);
		});
	});

	it('should complete when ignored', function (done) {
		flow.start({
			foo: 'bar'
		}, [
			function (flow) {
				flow.ignore();
			}
		], function (err, context) {
			context.foo.should.equal('bar');

			done(err);
		});
	});

	it('should not execute subflows', function (done) {
		var sub1 = false;
		var sub2 = false;
		var last = false;

		flow.start({
			foo: 'bar'
		}, [
			function (flow) {
				flow.next();
			},
			[
				function (flow) {
					flow.ignore();
				},
				[
					function (flow) {
						sub1 = true;

						flow.next();
					}
				],
				[
					function (flow) {
						sub2 = true;

						flow.next();
					}
				]
			],
			function (flow) {
				last = true;
				flow.next();
			}
		], function (err, context) {
			last.should.be.ok;
			sub1.should.not.be.ok;
			sub2.should.not.be.ok;
			context.foo.should.equal('bar');

			done(err);
		});
	});

	it('should pass new data to next call', function (done) {
		flow.start({
			foo: 'bar'
		}, [
			function (flow) {
				flow.next({
					baz: 'bah'
				});
			},
			function (baz, flow) {
				baz.should.equal('bah');

				flow.next({
					last: true
				});
			}
		], function (err, context) {
			context.foo.should.equal('bar');
			context.baz.should.equal('bah');
			context.last.should.equal(true);

			done(err);
		});
	});

	it('should pass inserted main flow data into final context', function (done) {
		flow.start({
			foo: 'bar'
		}, [
			function (flow) {
				flow.next({
					baz: 'bah'
				});
			}
		], function (err, context) {
			context.foo.should.equal('bar');
			context.baz.should.equal('bah');

			done(err);
		});
	});

	it('should have access to context value in subflows', function (done) {
		flow.start({
			foo: 'bar'
		}, [
			function (foo, flow) {
				foo.should.eql('bar');

				flow.next();
			},
			[
				function (foo, flow) {
					foo.should.eql('bar');

					flow.next();
				},
				[
					function (foo, flow) {
						foo.should.eql('bar');

						flow.next();
					}
				]
			],
			function (foo, flow) {
				foo.should.eql('bar');

				flow.next();
			}
		], function (err, context) {
			context.foo.should.equal('bar');

			done(err);
		});
	});

	it('should still last', function (done) {
		var sub1 = false;
		var last = false;

		flow.start({
			foo: 'bar'
		}, [
			function (flow) {
				flow.next();
			},
			[
				function (flow) {
					flow.next();
				},
				[
					function (flow) {
						sub1 = true;

						flow.ignore();
					},
					function (flow) {
						flow.next();
					}
				]
			],
			function (flow) {
				last = true;
				flow.next();
			}
		], function (err, context) {
			last.should.be.ok;
			sub1.should.be.ok;

			context.foo.should.equal('bar');

			done(err);
		});
	});

	it('should still execute sub2', function (done) {
		var sub1 = false;
		var sub2 = false;
		var last = false;

		flow.start({
			foo: 'bar'
		}, [
			function (flow) {
				flow.next();
			},
			[
				function (flow) {
					flow.next();
				},
				[
					function (flow) {
						sub1 = true;

						flow.ignore();
					},
					function (flow) {
						flow.next();
					}
				],
				[
					function (flow) {
						sub2 = true;

						flow.next();
					}
				]
			],
			function (flow) {
				last = true;
				flow.next();
			}
		], function (err, context) {
			last.should.be.ok;
			sub1.should.be.ok;
			sub2.should.be.ok;

			context.foo.should.equal('bar');

			done(err);
		});
	});

	it('should stop main flow execution', function (done) {
		var sub = false;
		var last = false;

		flow.start({
			foo: 'bar'
		}, [
			function (flow) {
				flow.next();
			},
			[
				function (flow) {
					flow.next();
				},
				[
					function (flow) {
						sub = true;

						flow.ignore();
					}
				]
			],
			function (flow) {
				last = true;
				flow.next();
			}
		], function (err, context) {
			last.should.not.be.ok;
			sub.should.be.ok;
			context.foo.should.equal('bar');

			done(err);
		});
	});

	it('should stop sub and main flow execution', function (done) {
		var sub1 = false;
		var sub2 = false;
		var last = false;

		flow.start({
			foo: 'bar'
		}, [
			function (flow) {
				flow.next();
			},
			[
				function (flow) {
					flow.next();
				},
				[
					function (flow) {
						flow.next();
					},
					function (flow) {
						sub1 = true;

						flow.ignore();
					}
				],
				[
					function (flow) {
						sub2 = true;

						flow.next();
					}
				]
			],
			function (flow) {
				last = true;
				flow.next();
			}
		], function (err, context) {
			sub1.should.be.ok;
			sub2.should.not.be.ok;
			last.should.not.be.ok;

			context.foo.should.equal('bar');

			done(err);
		});
	});

	it('should allow for nested subflows', function (done) {
		var sub1 = false;
		var sub2 = false;
		var last = false;

		flow.start({
			foo: 'bar'
		}, [
			function (flow) {
				flow.next();
			},
			[
				function (flow) {
					flow.next();
				},
				[
					function (flow) {
						sub1 = true;

						flow.next();
					}
				],
				[
					function (flow) {
						sub2 = true;

						flow.next();
					}
				]
			],
			function (flow) {
				last = true;
				flow.next();
			}
		], function (err, context) {
			last.should.be.ok;
			sub1.should.be.ok;
			sub2.should.be.ok;

			context.foo.should.equal('bar');

			done(err);
		});
	});

	it('should fork when an array is passed', function (done) {
		var invoked = [];
		var last = false;

		flow.start({
			foo: 'bar'
		}, [
			function (flow) {
				flow.fork('number', [0, 1, 2]);
			},
			function (number, flow) {
				invoked.push(number);

				flow.next();
			},
			function (flow) {
				last = true;
				flow.next();
			}
		], function (err, context) {
			invoked.should.eql([0, 1, 2]);
			last.should.be.ok;

			context.foo.should.equal('bar');
			context.should.not.have.keys('number'); // only main context data should return

			done(err);
		});
	});

	it('should invoke all forks even if one ignores', function (done) {
		var invoked = [];
		var last = false;

		flow.start({
			foo: 'bar'
		}, [
			function (flow) {
				flow.fork('number', [0, 1, 2]);
			},
			function (number, flow) {
				invoked.push(number);

				if (number == 1) {
					return flow.ignore();
				}

				flow.next();
			},
			function (flow) {
				last = true;
				flow.next();
			}
		], function (err, context) {
			invoked.should.eql([0, 1, 2]);
			last.should.be.ok;

			context.foo.should.equal('bar');

			done(err);
		});
	});


	it('should invoke all forks even if last ignores', function (done) {
		var invoked = [];
		var last = false;

		flow.start({
			foo: 'bar'
		}, [
			function (flow) {
				flow.fork('number', [0, 1, 2]);
			},
			function (number, flow) {
				invoked.push(number);

				if (number == 2) {
					return flow.ignore();
				}

				flow.next();
			},
			function (flow) {
				last = true;
				flow.next();
			}
		], function (err, context) {
			invoked.should.eql([0, 1, 2]);
			context.foo.should.equal('bar');

			done(err);
		});
	});

	it('should die on error', function (done) {
		var invoked = [];

		flow.start({
			foo: 'bar'
		}, [
			function (flow) {
				flow.fork('number', [0, 1, 2]);
			},
			function (number, flow) {
				invoked.push(number);

				if (number == 1) {
					return flow.error('wee');
				}

				flow.next();
			}
		], function (err, context) {
			err.should.eql('wee');

			invoked.should.eql([0, 1]);
			context.foo.should.equal('bar');

			done();
		});
	});

	it('should not invoke last flow method when ignored', function (done) {
		var invoked = false;

		flow.start({
			foo: 'bar'
		}, [
			function (flow) {
				flow.ignore();
			},
			function (flow) {
				invoked = true;
				flow.next();
			}
		], function (err, context) {
			invoked.should.not.be.ok;
			context.foo.should.equal('bar');

			done(err);
		});
	});

	it('should not invoke last flow when last method in subflow calls ignore', function (done) {
		var invoked = false;

		flow.start({
			foo: 'bar'
		}, [
			function (flow) {
				flow.next();
			},
			[function (flow) {
				flow.ignore();
			}],
			function (flow) {
				invoked = true;
				flow.next();
			}
		], function (err, context) {
			invoked.should.not.be.ok;
			context.foo.should.equal('bar');

			done(err);
		});
	});

	it('should invoke last flow method when ignore is called in middle of subflow', function (done) {
		var invoked = false;

		flow.start({
			foo: 'bar'
		}, [
			function (flow) {
				flow.next();
			},
			[
				function (flow) {
					flow.ignore();
				},
				function (flow) {
					flow.next();
				}
			],
			function (flow) {
				invoked = true;
				flow.next();
			}
		], function (err, context) {
			invoked.should.be.ok;
			context.foo.should.equal('bar');

			done(err);
		});
	});

	it('should invoke last flow method when next is called at end of subflow', function (done) {
		var invoked = false;

		flow.start({
			foo: 'bar'
		}, [
			function (flow) {
				flow.next();
			},
			[
				function (flow) {
					flow.next();
				}
			],
			function (flow) {
				invoked = true;
				flow.next();
			}
		], function (err, context) {
			invoked.should.be.ok;
			context.foo.should.equal('bar');

			done(err);
		});
	});

	it('should error', function (done) {
		flow.start({
			foo: 'bar'
		}, [
			function (flow) {
				flow.error('wtf');
			}
		], function (err, context) {
			err.should.eql('wtf');
			context.foo.should.equal('bar');

			done();
		});
	});
})
;