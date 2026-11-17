-- SaaS phase 3a: at most one active company profile per business.
-- Closes a race where two first requests of a new business could both
-- bootstrap a profile. Every existing business has exactly one active row
-- (checked before this migration).
CREATE UNIQUE INDEX "company_settings_one_active_per_organization" ON "company_settings"("organizationId") WHERE ("isActive" = true);
