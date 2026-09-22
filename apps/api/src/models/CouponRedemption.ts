import { Schema, model, Types } from "mongoose";

export interface CouponRedemptionDoc {
  _id: Types.ObjectId;
  coupon_id: Types.ObjectId;
  user_id: Types.ObjectId;
  subscription_id?: Types.ObjectId;
  redeemed_at: Date;
}

const couponRedemptionSchema = new Schema<CouponRedemptionDoc>({
  coupon_id: { type: Schema.Types.ObjectId, ref: "Coupon", required: true },
  user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
  subscription_id: { type: Schema.Types.ObjectId, ref: "Subscription" },
  redeemed_at: { type: Date, default: Date.now },
});

export const CouponRedemption = model<CouponRedemptionDoc>("CouponRedemption", couponRedemptionSchema);
