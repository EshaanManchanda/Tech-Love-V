"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ErrorText } from "@/components/ui/error-text";
import { Input } from "@/components/ui/input";

const schema = z.object({ email: z.string().email() });
type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string>();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setFormError(undefined);
    try {
      await api("/api/auth/forgot-password", { method: "POST", body: JSON.stringify(values) });
      setSent(true);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm items-center px-4">
      <Card className="w-full">
        <CardContent className="pt-6">
          <h1 className="mb-6 font-display text-xl font-semibold">Forgot password</h1>
          {sent ? (
            <p className="text-sm text-neutral-600">If an account exists for that email, a reset link has been sent. Check your inbox.</p>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Input type="email" placeholder="Email" {...register("email")} />
                <ErrorText>{errors.email?.message}</ErrorText>
              </div>
              <ErrorText>{formError}</ErrorText>
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? "Sending…" : "Send reset link"}
              </Button>
            </form>
          )}
          <p className="mt-4 text-sm text-neutral-600">
            <a href="/login" className="underline">
              Back to log in
            </a>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
