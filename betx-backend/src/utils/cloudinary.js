const cloudinary = require('cloudinary').v2;
const config = require('../config/env');

cloudinary.config({
    cloud_name: config.CLOUDINARY_CLOUD_NAME,
    api_key: config.CLOUDINARY_API_KEY,
    api_secret: config.CLOUDINARY_API_SECRET,
});

/**
 * Upload an image to Cloudinary from a buffer
 * @param {Buffer} fileBuffer The file buffer
 * @param {string} folder The folder in Cloudinary to upload to
 * @returns {Promise<Object>} The Cloudinary response object
 */
exports.uploadFromBuffer = (fileBuffer, folder = 'qr_codes') => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: 'auto',
            },
            (error, result) => {
                if (result) {
                    resolve(result);
                } else {
                    reject(error);
                }
            }
        );

        uploadStream.end(fileBuffer);
    });
};

exports.cloudinary = cloudinary;
