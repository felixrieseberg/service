var assert = require('assert')
  , config = require('../../config')
  , fixtures = require('../fixtures')
  , models = require('../../models')
  , services = require("../../services");
describe('principals service', function() {

    it('can create and validate a user', function(done) {
        var passwordFixture = "sEcReT44";
        var user = new models.Principal({ principal_type: "user",
                                          email: "user@gmail.com",
                                          password: passwordFixture });

        services.principals.create(user, function(err, user) {
            assert.ifError(err);
            assert.notEqual(user.id, undefined);
            assert.notEqual(user.password_hash, undefined);
            assert.notEqual(user.password_hash, passwordFixture);
            assert.equal(user.email, "user@gmail.com");

            services.principals.verifyPassword(passwordFixture, user, function(err) {
                assert.ifError(err);
                 services.principals.verifyPassword("NOTCORRECT", user, function(err) {
                     assert.notEqual(err, null);
                     done();
                });
            });
        });
    });

    it('can create and validate a device', function(done) {
        var device = new models.Principal({ principal_type: "device" });
        services.principals.create(device, function(err, device) {
            assert.ifError(err);
            assert.notEqual(device.id, undefined);
            assert.notEqual(device.secret_hash, undefined);

            services.principals.verifySecret(device.secret, device, function(err) {
                assert.ifError(err);
                services.principals.verifySecret("NOTCORRECT", device, function(err) {
                    assert.notEqual(err, null);
                    done();
                });
            });
        });
    });

    it('can authenticate a device', function(done) {

        var request = { id: fixtures.models.device.id,
                        secret :fixtures.models.device.secret };

        services.principals.authenticate(request, function(err, principal, accessToken) {
            assert.ifError(err);
            assert.notEqual(principal, undefined);
            assert.notEqual(accessToken, undefined);

            done();
        });
    });

});