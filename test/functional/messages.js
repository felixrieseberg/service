var app = require('../../server')
  ,	assert = require('assert')
  ,	config = require('../../config')
  ,	faye = require('faye')
  , fixtures = require('../fixtures')
  , mongoose = require('mongoose')
  , request = require('request')
  , services = require('../../services');

describe('messages endpoint', function() {

    it('index should be not be accessible anonymously', function(done) {
        request(config.messages_endpoint, function(err, resp, body) {
            assert.equal(resp.statusCode, 401);
            done();
        });
    });

	it('index should return all messages', function(done) {
	    request({ url: config.messages_endpoint,
                  headers: { Authorization: fixtures.models.accessTokens.device.toAuthHeader() },
                  json: true }, function(err,resp,body) {
	        assert.equal(resp.statusCode, 200);

            assert.notEqual(body.messages, undefined);
            assert.equal(body.messages.length > 0, true);

	        done();
	    });
	});

    it('index query should return only those messages', function(done) {
        request({ url: config.messages_endpoint + "?message_type=ip",
                  headers: { Authorization: fixtures.models.accessTokens.device.toAuthHeader() },
                  json: true }, function(err,resp,body) {

            assert.equal(resp.statusCode, 200);

            assert.notEqual(body.messages, undefined);
            assert.equal(body.messages.length > 0, true);

            body.messages.forEach(function(message) {
                assert.equal(message.message_type, 'ip');
            });

            done();
        });
    });

    it('index should not be accessible with an invalid accessToken', function(done) {
        request({ url: config.messages_endpoint,
            headers: { Authorization: "Bearer DEADBEEF" } }, function(err,resp,body) {
            assert.equal(resp.statusCode, 401);
            done();
        });
    });

    it('show should be not be accessible without accessToken', function(done) {
        request(config.messages_endpoint + '/' + fixtures.models.messages.deviceIp.id, function(err, resp, body) {
            assert.equal(resp.statusCode, 401);
            done();
        });
    });

    it('create should be not be accessible without accessToken', function(done) {
        request.post(config.messages_endpoint,
            { json: [{ from: fixtures.models.principals.device.id,
                       message_type: "_custom"}] }, function(err, resp, body) {
            assert.equal(err, null);
            assert.equal(resp.statusCode, 401);
            done();
        });
    });

    it ('delete should be only accessible to system principal', function(done) {
        var query = encodeURIComponent(JSON.stringify({ "_id" : fixtures.models.messages.deviceIp.id }));
        request.del({ url: config.messages_endpoint + "?q=" + query,
                      json: true,
                      headers: { Authorization: fixtures.models.accessTokens.device.toAuthHeader() } }, function(del_err, del_resp, del_body) {

                assert.equal(del_err, null);
                assert.equal(del_resp.statusCode, 403);

                done();
            }
        );

    });

    it('should create and fetch a message', function(done) {
		var notification_passed = false,
			get_passed = false,
			started_post = false;

		var client = new faye.Client(config.realtime_endpoint);
        client.addExtension({
            outgoing: function(message, callback) {
                message.ext = message.ext || {};
                message.ext.access_token = fixtures.models.accessTokens.device.token;
                callback(message);
            }
        });

		client.subscribe('/messages', function(message_json) {
            var message = JSON.parse(message_json);
            if (message.message_type != "_messageSubscriptionTest") return;

			assert.equal(message.body.reading, 5.1);
			notification_passed = true;
		    if (notification_passed && get_passed) {
                client.unsubscribe('/messages');
                done();
		    }
		});

        services.realtime.bind('subscribe', function(clientId) {
			if (started_post) return;
			started_post = true;

			request.post(config.messages_endpoint,
				{ json: [{ from: fixtures.models.principals.device.id,
                           message_type: "_messageSubscriptionTest",
                           public: false,
                           body: { reading: 5.1 } }],
                  headers: { Authorization: fixtures.models.accessTokens.device.toAuthHeader() } }, function(post_err, post_resp, post_body) {
				  assert.equal(post_err, null);
			      assert.equal(post_resp.statusCode, 200);

			      var message_id = null;
                  post_body.messages.forEach(function(message) {
				      assert.equal(message.body.reading, 5.1);
				      message_id = message.id;
                  });

                  assert.notEqual(message_id, null);

			      request({ url: config.messages_endpoint + '/' + message_id, json: true,
                          headers: { Authorization: fixtures.models.accessTokens.device.toAuthHeader() } },
					function(get_err, get_resp, get_body) {

		                assert.equal(get_err, null);
		                assert.equal(get_resp.statusCode, 200);

		                assert.equal(get_body.message.body.reading, 5.1);
		                assert.notEqual(get_body.message.created_at, 5.1);

                        var query = encodeURIComponent(JSON.stringify({ "_id" : message_id }));
                        request.del({ url: config.messages_endpoint + "?q=" + query,
                                      json: true,
                                      headers: { Authorization: fixtures.models.accessTokens.system.toAuthHeader() } },
                            function(del_err, del_resp, del_body) {

                                assert.equal(del_err, null);
                                assert.equal(del_resp.statusCode, 200);

                                get_passed = true;
                                if (notification_passed && get_passed) {
                                    client.unsubscribe('/messages');
                                    done();
                                }
                            }
                        );
	              });
		    });
    	});
	});
});
