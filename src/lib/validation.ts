/**
 * Client-side checks for the auth forms. They give instant feedback but can be
 * bypassed, so the same password policy must also be enforced in the Supabase
 * dashboard (Authentication → Sign In / Providers → Email).
 */

export const PASSWORD_MIN_LENGTH = 10;

/** Normalizes an email the way it should be sent to Supabase. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// local@domain.tld — no spaces, a single "@", a domain made of dot-separated
// labels (letters, digits, hyphens, not starting/ending with "-"), and a TLD of
// at least 2 letters.
const EMAIL_PATTERN =
  /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/;

export function isValidEmail(email: string): boolean {
  const value = normalizeEmail(email);
  if (value.length > 254) return false;
  if (!EMAIL_PATTERN.test(value)) return false;
  const [local] = value.split("@");
  // Dots are allowed in the local part, but not at the edges or doubled.
  return local.length <= 64 && !local.startsWith(".") && !local.endsWith(".") && !local.includes("..");
}

export type PasswordRule = { label: string; met: boolean };

export function getPasswordRules(password: string): PasswordRule[] {
  return [
    { label: `Au moins ${PASSWORD_MIN_LENGTH} caractères`, met: password.length >= PASSWORD_MIN_LENGTH },
    { label: "Une lettre minuscule", met: /[a-z]/.test(password) },
    { label: "Une lettre majuscule", met: /[A-Z]/.test(password) },
    { label: "Un chiffre", met: /[0-9]/.test(password) },
    { label: "Un caractère spécial (!@#$…)", met: /[^A-Za-z0-9]/.test(password) },
  ];
}

export function isStrongPassword(password: string): boolean {
  return getPasswordRules(password).every((rule) => rule.met);
}

/** Turns the Supabase auth errors users are likely to hit into French messages. */
export function authErrorMessage(error: { code?: string; message: string }): string {
  switch (error.code) {
    case "invalid_credentials":
      return "Email ou mot de passe incorrect.";
    case "email_not_confirmed":
      return "Confirmez d'abord votre adresse email grâce au lien reçu.";
    case "user_already_exists":
    case "email_exists":
      return "Un compte existe déjà avec cette adresse email.";
    case "weak_password":
      return "Mot de passe trop faible : respectez toutes les règles indiquées.";
    case "email_address_invalid":
      return "Cette adresse email n'est pas acceptée.";
    case "otp_expired":
    case "otp_invalid":
      return "Code invalide ou expiré. Demandez-en un nouveau.";
    case "same_password":
      return "Choisissez un mot de passe différent de l'actuel.";
    case "reauthentication_needed":
      return "Par sécurité, déconnectez-vous puis reconnectez-vous avant de changer votre mot de passe.";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "Trop de tentatives. Réessayez dans quelques minutes.";
    default:
      return error.message;
  }
}
