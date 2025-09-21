const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^(\+91|91|0)?[6-9]\d{9}$/, 'Please enter a valid Indian phone number']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  userType: {
    type: String,
    enum: ['user', 'helper', 'admin'],
    default: 'user'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  digilockerData: {
    verified: { type: Boolean, default: false },
    documentId: String,
    verifiedAt: Date
  },
  profile: {
    avatar: String,
    bio: String,
    location: {
      city: String,
      state: String,
      coordinates: {
        lat: Number,
        lng: Number
      }
    }
  },
  stats: {
    incidentsReported: { type: Number, default: 0 },
    chatroomsJoined: { type: Number, default: 0 },
    helpfulVotes: { type: Number, default: 0 }
  },
  preferences: {
    notifications: { type: Boolean, default: true },
    language: { type: String, default: 'en' },
    emergencyContacts: [String]
  },
  lastActive: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.generateAuthToken = function() {
  return jwt.sign(
    { 
      id: this._id, 
      email: this.email, 
      userType: this.userType 
    },
    process.env.JWT_SECRET || 'roadlink-secret-key',
    { expiresIn: '7d' }
  );
};

userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

module.exports = mongoose.model('User', userSchema);
