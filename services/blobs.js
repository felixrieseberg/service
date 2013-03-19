var config = require('../config'),
    models = require('../models');

var stream = function(blobId, stream, callback) {
    models.Blob.findOne({"_id": blobId}, function (err, blob) {
        if (err) return callback(err);
        if (!blob) return callback("Blob not found");

        // TODO:  do authorization here

        config.blob_provider.stream(blob, stream, function(error) {
            callback(error);
        });
    });
};

var create = function(blob, stream, callback) {

    // TODO: do authorization of principal to create blob here.

    config.blob_provider.create(blob, stream, function(err) {
        if (err) return callback(err, null);

        blob.save(function(err, blob) {
            if (err) return callback(err, null);

            console.log('created blob with id: ' + blob._id);
            callback(null, blob);
        });

    });
};

module.exports = {
    stream: stream,
    create: create
};