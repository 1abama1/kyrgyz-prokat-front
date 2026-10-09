// Namespace only; authentication and permissions are still enforced by the server.
export function tokenSubject(token: string | null): string | null {
  try {
    if (!token || token.startsWith('offline_')) return null;
    const value = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).sub;
    return /^\d+$/.test(String(value)) ? String(value) : null;
  } catch { return null; }
}

export function databaseName(owner: string | null): string {
  const legacyOwner = localStorage.getItem('legacyDatabaseOwner');
  return owner && owner === legacyOwner ? 'RentalDocsDB' : `RentalDocsDB:${owner ?? 'signed-out'}`;
}

const existingOwner = tokenSubject(localStorage.getItem('accessToken'));
// Bind the existing database only when there is a server-issued session to identify it.
if (existingOwner && !localStorage.getItem('legacyDatabaseOwner')) {
  localStorage.setItem('legacyDatabaseOwner', existingOwner);
}
export function currentOwner(): string | null {
  return tokenSubject(localStorage.getItem('accessToken'));
}
