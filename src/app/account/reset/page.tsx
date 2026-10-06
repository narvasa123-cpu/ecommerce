import { AuthForm } from '@/components/auth';
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  return (
    <div className="page-container">
      <AuthForm mode="reset" resetToken={(await searchParams).token} />
    </div>
  );
}
