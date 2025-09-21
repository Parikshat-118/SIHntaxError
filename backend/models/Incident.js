const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema({
  type: {
    type: String,
    required: [true, 'Incident type is required'],
    enum: ['accident', 'breakdown', 'construction', 'flooding', 'vip', 'protest', 'other']
  },
  severity: {
    type: String,
    required: [true, 'Severity level is required'],
    enum: ['low', 'medium', 'high', 'critical']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  location: {
    type: String,
    required: [true, 'Location is required']
  },
  coordinates: {
    lat: {
      type: Number,
      required: [true, 'Latitude is required'],
      min: [-90, 'Invalid latitude'],
      max: [90, 'Invalid latitude']
    },
    lng: {
      type: Number,
      required: [true, 'Longitude is required'],
      min: [-180, 'Invalid longitude'],
      max: [180, 'Invalid longitude']
    }
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'resolved', 'verified', 'false_report'],
    default: 'active'
  },
  chatRoomActive: {
    type: Boolean,
    default: true
  },
  media: [{
    type: String,
    url: String,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    uploadedAt: Date
  }],
  verification: {
    isVerified: { type: Boolean, default: false },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    verifiedAt: Date,
    verificationNotes: String
  },
  analytics: {
    views: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    reports: { type: Number, default: 1 }
  },
  resolvedAt: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

incidentSchema.index({ coordinates: '2dsphere' });
incidentSchema.index({ type: 1, severity: 1 });
incidentSchema.index({ createdAt: -1 });
incidentSchema.index({ status: 1 });

incidentSchema.methods.getDistance = function(lat, lng) {
  const R = 6371;
  const dLat = (lat - this.coordinates.lat) * Math.PI / 180;
  const dLng = (lng - this.coordinates.lng) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(this.coordinates.lat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

incidentSchema.statics.findNearby = function(lat, lng, radius = 5) {
  return this.find({
    coordinates: {
      $near: {
        $geometry: { type: 'Point', coordinates: [lng, lat] },
        $maxDistance: radius * 1000
      }
    },
    status: 'active'
  });
};

module.exports = mongoose.model('Incident', incidentSchema);
