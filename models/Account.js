const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const uniqueValidator = require('mongoose-unique-validator');
const crypto = require('crypto');
const jwt = require("jsonwebtoken");
const secret = require('../config').secret;

const AccountSchema = new Schema({
   status: { type: String, default: "approved" },
   // status: { type: String, default: "pending" },
   firstName: { type: String, required: [true, "can't be blank"] },
   lastName: { type: String, required: [true, "can't be blank"] },
   email: { type: String, unique: true, required: [true, "can't be blank"], match: [/\S+@\S+\.\S+/, 'is invalid'], index: true },  // unique enabled mode
   timeZone: { type: String },
   displayEmail: { type: String, default: null },

   accountCompany: { type: Schema.Types.ObjectId, ref: 'AccountCompany' },
   role: { type: Boolean, default: false },  // admin -> true,  member -> false

   image: { type: String, default: "/assets/media/avatars/person1.png" },
   hash: String,
   salt: String,

   invitedBy: { type: Schema.Types.ObjectId, ref: 'AccountCompany' },
   invitationStatus: { type: String, default: null },
   invitedAt: { type: Date },
   expireAt: { type: Date, default: new Date(Date.now() + 30 * 24 * 3600 * 1000) }
}, { timestamps: true });

AccountSchema.plugin(uniqueValidator, { message: 'is already taken' });

AccountSchema.methods.validPassword = function (password) {
   const hash = crypto.pbkdf2Sync(password, this.salt, 10000, 512, 'sha512').toString('hex');
   return this.hash === hash;
};

AccountSchema.methods.setPassword = function (password) {
   this.salt = crypto.randomBytes(16).toString('hex');
   this.hash = crypto.pbkdf2Sync(password, this.salt, 10000, 512, 'sha512').toString('hex');
};

AccountSchema.methods.generateJWT = function (isRemember) {
   console.log("isRemember ===>", isRemember);
   console.log("this.accountCompany ~~~~", this.accountCompany);
   return jwt.sign({
      id: this._id,
      accountCompany: this.accountCompany,
   }, secret, { expiresIn: isRemember ? 3600 * 24 * 7 : 3600 * 24 });
};

AccountSchema.methods.toAuthJSON = function () {
   return {
      _id: this._id,
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email,
      displayEmail: this.displayEmail,
      role: this.role,
      image: this.image || 'https://static.productionready.io/images/smiley-cyrus.jpg'
   };
};

const Account = mongoose.model('Account', AccountSchema);
module.exports = Account;