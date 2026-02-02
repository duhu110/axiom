export interface User {
  id: number;
  phone: string;
  name?: string;
  avatar?: string;
  created_at: string;
  last_login_at?: string;
  is_active: boolean;
  is_superuser: boolean;
}

export interface TokenPayload {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  server_time: number;
  access_expires_at: number;
  refresh_expires_at: number;
}
