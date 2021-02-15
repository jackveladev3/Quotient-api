const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DefaultSettingSchema = new Schema({
   createdBy: { type: Schema.Types.ObjectId, required: [true, "can't be blank"], ref: 'Account' },
   defaultTemplate: { type: Schema.Types.ObjectId, ref: 'Template' }
}, { timestamps: true });

const DefaultSetting = mongoose.model("DefaultSetting", DefaultSettingSchema);
module.exports = DefaultSetting;