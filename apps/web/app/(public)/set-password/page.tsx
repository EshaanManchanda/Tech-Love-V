"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { api, ApiError } from "@/lib/api";
import type { CurrentUser } from "@/lib/useUser";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ErrorText } from "@/components/ui/error-text";
import { Input } from "@/components/ui/input";

const schema = z
  .object({ password: z.string().min(8), confirmPassword: z.string().min(8) })
  .refine((data) => data.password === data.confirmPassword, { message: "Passwords don't match.", path: ["confirmPassword"] });
type FormValues = z.infer<typeof schema>;

export default function SetPasswordPage() {
  return (
    <Suspense>
      <SetPasswordForm />
    </Suspense>
  );
}

function SetPasswordForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [formError, setFormError] = useState<string>();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setFormError(undefined);
    try {
      const user = await api<CurrentUser>("/api/auth/set-password", { method: "POST", body: JSON.stringify({ token, password: values.password }) });
      queryClient.setQueryData(["me"], user);
      router.push("/dashboard/licenses");
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  }

  if (!token) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm items-center px-4">
        <Card className="w-full">
          <CardContent className="pt-6">
            <ErrorText>This invite link is missing its token. Ask your admin to resend it.</ErrorText>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm items-center px-4">
      <Card className="w-full">
        <CardContent className="pt-6">
          <h1 className="mb-6 font-display text-xl font-semibold">Set your password</h1>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Input type="password" placeholder="Password (min 8 characters)" {...register("password")} />
              <ErrorText>{errors.password?.message}</ErrorText>
            </div>
            <div>
              <Input type="password" placeholder="Confirm password" {...register("confirmPassword")} />
              <ErrorText>{errors.confirmPassword?.message}</ErrorText>
            </div>
            <ErrorText>{formError}</ErrorText>
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "Saving…" : "Set password & log in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
