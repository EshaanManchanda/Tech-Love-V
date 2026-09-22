export function ErrorText({ children }: { children?: string }) {
  if (!children) return null;
  return <p className="mt-1 text-sm text-destructive">{children}</p>;
}
