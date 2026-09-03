-- Trigger, immutability, dan Row-Level Security.
-- Mengikuti docs/db-standards.md §3, §10, dan §11.

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION fn_prevent_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Tabel % bersifat immutable, tidak dapat diubah atau dihapus', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

DO $$
DECLARE
    target TEXT;
BEGIN
    FOREACH target IN ARRAY ARRAY[
        'users', 'projects', 'branches', 'stores', 'products', 'product_variants',
        'transactions', 'inventory', 'team_members', 'file_uploads'
    ] LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated_at ON %I', target, target);
        EXECUTE format(
            'CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %I
             FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at()',
            target, target
        );
    END LOOP;
END;
$$;
--> statement-breakpoint

DO $$
DECLARE
    target TEXT;
BEGIN
    FOREACH target IN ARRAY ARRAY['audit_logs', 'inventory_movements'] LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_immutable ON %I', target, target);
        EXECUTE format(
            'CREATE TRIGGER trg_%s_immutable BEFORE UPDATE OR DELETE ON %I
             FOR EACH ROW EXECUTE FUNCTION fn_prevent_mutation()',
            target, target
        );
    END LOOP;
END;
$$;
--> statement-breakpoint

-- Row-Level Security sebagai lapis kedua isolasi tenant.
--
-- Lapis pertama tetap pengecekan permission di service layer; policy ini
-- memastikan query yang lolos dari sana pun tidak bisa menyentuh baris milik
-- project lain. `withTenant()` di lib/db/tenant.ts yang mengisi setting-nya.
--
-- Bila app.current_project_id belum di-set, current_setting(..., true)
-- mengembalikan NULL sehingga perbandingan bernilai NULL dan seluruh baris
-- tersaring — gagal tertutup, bukan gagal terbuka.
--
-- Tabel yang sengaja TIDAK memakai policy ini:
--   users, accounts, sessions, verificationTokens  -> milik Auth.js, lintas tenant
--   projects                                       -> perlu dibaca sebelum tenant dipilih
--   audit_logs                                     -> project_id nullable (event login
--                                                     tidak terikat project); dibatasi DAL
--
-- PENTING: RLS tidak berlaku untuk role superuser maupun role ber-BYPASSRLS.
-- Supaya policy ini benar-benar aktif, aplikasi harus terhubung memakai role
-- terbatas, bukan role `postgres` bawaan Supabase. Lihat docs/PLAN.md.
DO $$
DECLARE
    target TEXT;
BEGIN
    FOREACH target IN ARRAY ARRAY[
        'branches', 'stores', 'products', 'product_variants', 'transactions',
        'transaction_fees', 'transaction_items', 'inventory',
        'inventory_movements', 'team_members', 'file_uploads'
    ] LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', target);
        EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', target);
        EXECUTE format('DROP POLICY IF EXISTS policy_%s_tenant ON %I', target, target);
        EXECUTE format(
            'CREATE POLICY policy_%s_tenant ON %I
             USING (project_id = current_setting(''app.current_project_id'', true)::uuid)
             WITH CHECK (project_id = current_setting(''app.current_project_id'', true)::uuid)',
            target, target
        );
    END LOOP;
END;
$$;
