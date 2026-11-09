export type Contact = {
  user_id: string; display_name: string; job_title: string | null; phone: string | null; login_name: string | null;
  role_code: string; unit_id: string; unit_name: string; unit_level: string; relation: "below" | "above";
  created_by_me: boolean; must_change_password: boolean;
};
export type InboxRow = { message_id: string; subject: string; body: string; created_at: string; read_at: string | null; sender_id: string; sender_name: string; sender_title: string | null };
export type SentRow = { message_id: string; subject: string; body: string; created_at: string; audience: string; recipients: number; read_count: number };
