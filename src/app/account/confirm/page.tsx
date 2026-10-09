import { SupabaseEmailAction } from '@/components/supabase-email-action';

export default function ConfirmEmailPage() {
  return (
    <div className="page-container">
      <SupabaseEmailAction mode="confirm" />
    </div>
  );
}
