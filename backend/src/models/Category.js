import mongoose from 'mongoose';

const i18nString = {
  uz: { type: String, required: true },
  ru: { type: String, required: true },
  en: { type: String, required: true },
};

const categorySchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: i18nString,
    description: i18nString,
    icon: { type: String, default: 'Package' },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

categorySchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

export const Category = mongoose.model('Category', categorySchema);
