import { AuthForm } from '@/components/auth';
export default function Page() {
  return (
    <div className="page-container auth-page-container">
      <AuthForm mode="forgot" />
    </div>
  );
}
