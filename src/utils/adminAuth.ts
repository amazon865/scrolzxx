// Authentication management for Admin and Coleta panels

const AUTH_KEY = 'techstore_admin_auth_session';

const VALID_CREDENTIALS = {
  username: 'admin01',
  password: '123456',
};

export interface AdminSession {
  authenticated: boolean;
  username: string;
  loginTime: number;
}

export function isAdminAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(AUTH_KEY) || sessionStorage.getItem(AUTH_KEY);
    if (!raw) return false;
    const data: AdminSession = JSON.parse(raw);
    return !!data.authenticated && data.username.toLowerCase() === VALID_CREDENTIALS.username.toLowerCase();
  } catch {
    return false;
  }
}

export function loginAdmin(
  user: string,
  pass: string,
  rememberMe: boolean = true
): { success: boolean; error?: string } {
  const cleanUser = (user || '').trim().toLowerCase();
  const cleanPass = (pass || '').trim();

  if (!cleanUser || !cleanPass) {
    return { success: false, error: 'Por favor, preencha o usuário e a senha.' };
  }

  if (
    cleanUser === VALID_CREDENTIALS.username.toLowerCase() &&
    cleanPass === VALID_CREDENTIALS.password
  ) {
    const session: AdminSession = {
      authenticated: true,
      username: VALID_CREDENTIALS.username,
      loginTime: Date.now(),
    };

    try {
      const serialized = JSON.stringify(session);
      if (rememberMe) {
        localStorage.setItem(AUTH_KEY, serialized);
      } else {
        sessionStorage.setItem(AUTH_KEY, serialized);
      }
      window.dispatchEvent(new CustomEvent('techstore_admin_auth_changed', { detail: { authenticated: true } }));
    } catch {
      // Storage quota or privacy mode fallback
    }

    return { success: true };
  }

  return { success: false, error: 'Usuário ou senha incorretos. Verifique suas credenciais.' };
}

export function logoutAdmin(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(AUTH_KEY);
    sessionStorage.removeItem(AUTH_KEY);
    window.dispatchEvent(new CustomEvent('techstore_admin_auth_changed', { detail: { authenticated: false } }));
  } catch {
    // Ignore
  }
}
