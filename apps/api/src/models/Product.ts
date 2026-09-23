import { Schema, model, Types } from "mongoose";

export interface ProductVersion {
  _id: Types.ObjectId;
  version: string;
  changelog?: string;
  zip_filename: string;
  zip_path: string;
  file_size: number;
  released_at: Date;
  is_current: boolean;
}

export interface ProductDoc {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  tagline?: string;
  status: "active" | "archived";
  versions: ProductVersion[];
  created_at: Date;
}

const productVersionSchema = new Schema<ProductVersion>({
  version: { type: String, required: true },
  changelog: String,
  zip_filename: { type: String, required: true },
  zip_path: { type: String, required: true },
  file_size: { type: Number, required: true },
  released_at: { type: Date, default: Date.now },
  is_current: { type: Boolean, default: false },
});

const productSchema = new Schema<ProductDoc>({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: String,
  tagline: String,
  status: { type: String, enum: ["active", "archived"], default: "active" },
  versions: { type: [productVersionSchema], default: [] },
  created_at: { type: Date, default: Date.now },
});

export const Product = model<ProductDoc>("Product", productSchema);
