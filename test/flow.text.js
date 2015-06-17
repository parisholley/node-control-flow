require('chai').should();
var flow = require('../src/flow');

describe('index', function () {
	it('should complete', function (done) {
		flow({}, [
			function (flow) {
				flow.next();
			}
		], function () {
			done();
		});
	});

	it('should complete when ignored', function (done) {
		flow({}, [
			function (flow) {
				flow.ignore();
			}
		], function () {
			done();
		});
	});

	it('should not execute subflows', function (done) {
		var sub1 = false;
		var sub2 = false;
		var last = false;

		flow({}, [
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
		], function () {
			last.should.be.ok;
			sub1.should.not.be.ok;
			sub2.should.not.be.ok;

			done();
		});
	});

	it('should have access to context value in subflows', function (done) {
		flow({
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
		], function () {
			done();
		});
	});

	it('should still last', function (done) {
		var sub1 = false;
		var last = false;

		flow({}, [
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
		], function () {
			last.should.be.ok;
			sub1.should.be.ok;

			done();
		});
	});

	it('should still execute sub2', function (done) {
		var sub1 = false;
		var sub2 = false;
		var last = false;

		flow({}, [
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
		], function () {
			last.should.be.ok;
			sub1.should.be.ok;
			sub2.should.be.ok;

			done();
		});
	});

	it('should stop main flow execution', function (done) {
		var sub = false;
		var last = false;

		flow({}, [
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
		], function () {
			last.should.not.be.ok;
			sub.should.be.ok;

			done();
		});
	});

	it('should stop sub and main flow execution', function (done) {
		var sub1 = false;
		var sub2 = false;
		var last = false;

		flow({}, [
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
		], function () {
			sub1.should.be.ok;
			sub2.should.not.be.ok;
			last.should.not.be.ok;

			done();
		});
	});

	it('should allow for nested forks', function (done) {
		var sub1 = false;
		var sub2 = false;
		var last = false;

		flow({}, [
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
		], function () {
			last.should.be.ok;
			sub1.should.be.ok;
			sub2.should.be.ok;

			done();
		});
	});

	it('should fork when an array is passed', function (done) {
		var invoked = [];
		var last = false;

		flow({}, [
			function (flow) {
				flow.next([0, 1, 2], 'number');
			},
			function (number, flow) {
				invoked.push(number);

				flow.next();
			},
			function (flow) {
				last = true;
				flow.next();
			}
		], function () {
			invoked.should.eql([0, 1, 2]);
			last.should.be.ok;

			done();
		});
	});

	it('should invoke all forks even if one ignores', function (done) {
		var invoked = [];
		var last = false;

		flow({}, [
			function (flow) {
				flow.next([0, 1, 2], 'number');
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
		], function () {
			invoked.should.eql([0, 1, 2]);
			last.should.be.ok;

			done();
		});
	});


	it('should invoke all forks even if last ignores', function (done) {
		var invoked = [];
		var last = false;

		flow({}, [
			function (flow) {
				flow.next([0, 1, 2], 'number');
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
		], function () {
			invoked.should.eql([0, 1, 2]);

			done();
		});
	});

	it('should die on error', function (done) {
		var invoked = [];

		flow({}, [
			function (flow) {
				flow.next([0, 1, 2], 'number');
			},
			function (number, flow) {
				invoked.push(number);

				if (number == 1) {
					return flow.error('wee');
				}

				flow.next();
			}
		], function (err) {
			err.should.eql('wee');

			invoked.should.eql([0, 1]);

			done();
		});
	});

	it('should not invoke last flow method when ignored', function (done) {
		var invoked = false;

		flow({}, [
			function (flow) {
				flow.ignore();
			},
			function (flow) {
				invoked = true;
				flow.next();
			}
		], function () {
			invoked.should.not.be.ok;

			done();
		});
	});

	it('should not invoke last flow when last methond in fork calls ignore', function (done) {
		var invoked = false;

		flow({}, [
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
		], function () {
			invoked.should.not.be.ok;

			done();
		});
	});

	it('should invoke last flow method when ignore is called in middle of fork', function (done) {
		var invoked = false;

		flow({}, [
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
		], function () {
			invoked.should.be.ok;

			done();
		});
	});

	it('should invoke last flow method when next is called at end of fork', function (done) {
		var invoked = false;

		flow({}, [
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
		], function () {
			invoked.should.be.ok;

			done();
		});
	});

	it('should error', function (done) {
		flow({}, [
			function (flow) {
				flow.error('wtf');
			}
		], function (err) {
			err.should.eql('wtf');

			done();
		});
	});

	it('should send error callback of true', function (done) {
		flow({}, [
			function (flow) {
				flow.retry();
			}
		], function (err) {
			err.should.eql(true);

			done();
		});
	});

	it('should send error callback of delay time', function (done) {
		flow({}, [
			function (flow) {
				flow.retry(30);
			}
		], function (err) {
			err.should.eql(30);

			done();
		});
	});
});