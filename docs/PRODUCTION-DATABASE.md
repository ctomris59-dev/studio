# Production PostgreSQL role setup

This procedure is for a database administrator, not for automatic app startup.

1. Keep `AUTH_ALLOW_REGISTRATION=false`. Verify the encrypted backup and run migrations with `MIGRATION_DATABASE_URL`, never the app runtime identity.
2. Set `RUNTIME_ROLE_NAME` to a unique service login (lowercase alphanumerics and underscore), `RUNTIME_ROLE_PASSWORD` to a fresh 32+ character secret, and `CONFIRM_CREATE_PRODUCTION_ROLE=YES_I_CONFIRMED` in a secure shell. Run `npm run db:roles:production`. It grants only necessary application tables, and no GRANT for schema_migrations.
3. Set the app's `DATABASE_URL` to the newly created role and immediately remove role creation credentials from the service environment. Never set a postgres/superuser URL.
4. Test `SELECT current_user, rolsuper, rolbypassrls FROM pg_roles WHERE rolname=current_user` using the app credentials. Both privileges must be false. Verify `FORCE ROW LEVEL SECURITY` on tenant tables, two-tenant isolation, and owner-versus-instructor permissions.
5. Repeat role grants only after migrations introduce additional runtime tables. Keep public port 5432 closed. For private loopback 127.0.0.1, TLS transport can be optional; external hosted Postgres must use certificate-validated transport.
6. Never commit database URLs, service passwords, backups or key material. Schedule encrypted offsite backups and periodic restoration drills.

**Production readiness is not proven by creating this role alone.**
