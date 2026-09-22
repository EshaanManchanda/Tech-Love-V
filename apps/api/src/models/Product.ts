import { Schema, model, Types } from "mongoose";

export interface ProductDoc {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  status: "active" | "archived";
  created_at: Date;
}

const productSchema = new Schema<ProductDoc>({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: String,
  status: { type: String, enum: ["active", "archived"], default: "active" },
  created_at: { type: Date, default: Date.now },
});

export const Product = model<ProductDoc>("Product", productSchema);
