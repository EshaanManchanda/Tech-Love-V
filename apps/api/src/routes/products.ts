import { Router } from "express";
import { Plan } from "../models/Plan.js";
import { Product } from "../models/Product.js";

export const productsRouter = Router();

function publicShape(product: { _id: unknown; name: string; slug: string; description?: string; tagline?: string; versions: { version: string; is_current: boolean }[] }) {
  return {
    _id: product._id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    tagline: product.tagline,
    current_version: product.versions.find((v) => v.is_current)?.version ?? null,
  };
}

productsRouter.get("/", async (_req, res) => {
  const products = await Product.find({ status: "active" }).sort({ name: 1 }).lean();
  res.json(products.map(publicShape));
});

productsRouter.get("/:slug", async (req, res) => {
  const product = await Product.findOne({ slug: req.params.slug, status: "active" }).lean();
  if (!product) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Product not found." } });

  const plans = await Plan.find({ product_id: product._id, status: "active" }).sort({ sort_order: 1 }).lean();
  res.json({ ...publicShape(product), plans });
});
