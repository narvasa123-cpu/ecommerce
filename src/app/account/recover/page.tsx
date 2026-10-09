import { SupabaseEmailAction } from '@/components/supabase-email-action';

export default function RecoverAccountPage() {
  return (
    <div className="page-container">
      <SupabaseEmailAction mode="recover" />
    </div>
  );
}
