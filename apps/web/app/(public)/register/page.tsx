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

const schema = z.object({ name: z.string().min(1), email: z.string().email(), password: z.string().min(8) });
type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [formError, setFormError] = useState<string>();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setFormError(undefined);
    try {
      const user = await api<CurrentUser>("/api/auth/register", { method: "POST", body: JSON.stringify(values) });
      queryClient.setQueryData(["me"], user);
      router.push(searchParams.get("next") ?? "/dashboard");
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm items-center px-4">
      <Card className="w-full">
        <CardContent className="pt-6">
          <h1 className="mb-6 font-display text-xl font-semibold">Create an account</h1>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Input placeholder="Name" {...register("name")} />
              <ErrorText>{errors.name?.message}</ErrorText>
            </div>
            <div>
              <Input type="email" placeholder="Email" {...register("email")} />
              <ErrorText>{errors.email?.message}</ErrorText>
            </div>
            <div>
              <Input type="password" placeholder="Password (min 8 characters)" {...register("password")} />
              <ErrorText>{errors.password?.message}</ErrorText>
            </div>
            <ErrorText>{formError}</ErrorText>
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "Creating account…" : "Create account"}
            </Button>
          </form>
          <p className="mt-4 text-sm text-neutral-600">
            Already have an account? <a href="/login" className="underline">Log in</a>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
