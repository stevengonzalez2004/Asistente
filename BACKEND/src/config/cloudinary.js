const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'asistente-financiero',
    api_key: process.env.CLOUDINARY_API_KEY || '663288717825276',
    api_secret: process.env.CLOUDINARY_API_SECRET || 'ZN6sPTehU9kGnqkV4QLtbrb_LDw',
    secure: true
});

module.exports = cloudinary;
