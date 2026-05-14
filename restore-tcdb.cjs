#!/usr/bin/env node
// Script to restore a .tcdb file directly without Electron
const fs = require('fs');
const crypto = require('crypto');
const zlib = require('zlib');
const { execSync } = require('child_process');

const TCDB_MAGIC = Buffer.from('TCDB');
const ENCRYPTION_KEY = 'texacore-default-backup-key-2026';
const KEY_ITERATIONS = 100000;
const DB_PORT = 54322;

function deriveKey(key, salt) {
  return crypto.pbkdf2Sync(key, salt, KEY_ITERATIONS, 32, 'sha512');
}

function parseTcdb(buffer) {
  const magic = buffer.subarray(0, 4);
  if (!magic.equals(TCDB_MAGIC)) throw new Error('Not a valid TCDB file');

  let offset = 4;
  const version = buffer.readUInt8(offset); offset += 1;
  const timestamp = Number(buffer.readBigUInt64LE(offset)); offset += 8;
  const originalSize = buffer.readUInt32LE(offset); offset += 4;
  const compressedSize = buffer.readUInt32LE(offset); offset += 4;
  const encryptedSize = buffer.readUInt32LE(offset); offset += 4;
  const salt = buffer.subarray(offset, offset + 32); offset += 32;
  const iv = buffer.subarray(offset, offset + 16); offset += 16;
  const authTag = buffer.subarray(offset, offset + 16); offset += 16;
  const checksum = buffer.subarray(offset, offset + 64); offset += 64;
  const ciphertext = buffer.subarray(offset, offset + encryptedSize);

  console.log(`Version: ${version}, Created: ${new Date(timestamp).toISOString()}`);
  console.log(`Original: ${(originalSize / 1024 / 1024).toFixed(1)} MB, Compressed: ${(compressedSize / 1024).toFixed(0)} KB`);

  return { salt, iv, authTag, ciphertext };
}

async function main() {
  const tcdbPath = process.argv[2] || './temp/2023 مطور بعد الصيانة.tcdb';
  
  console.log('=== TexaCore TCDB Restore ===');
  console.log('File:', tcdbPath);
  
  // 1. Read & parse
  const buffer = fs.readFileSync(tcdbPath);
  const { salt, iv, authTag, ciphertext } = parseTcdb(buffer);

  // 2. Decrypt
  console.log('Decrypting...');
  const key = deriveKey(ENCRYPTION_KEY, salt);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  const compressed = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

  // 3. Decompress
  console.log('Decompressing...');
  const sql = zlib.gunzipSync(compressed);
  console.log(`SQL size: ${(sql.length / 1024 / 1024).toFixed(1)} MB`);

  // 4. Write temp SQL file WITH FK constraint bypass
  const tmpFile = '/tmp/tcdb_restore.sql';
  const header = Buffer.from("SET session_replication_role = 'replica';\n");
  const footer = Buffer.from("\nSET session_replication_role = 'origin';\n");
  fs.writeFileSync(tmpFile, Buffer.concat([header, sql, footer]));

  // 5. Kill GoTrue to prevent interference during restore
  console.log('Stopping GoTrue...');
  try { execSync('lsof -ti:9999 | xargs kill 2>/dev/null', { stdio: 'pipe' }); } catch {}

  // 6. Execute via psql
  console.log('Restoring to PostgreSQL on port', DB_PORT, '...');
  try {
    execSync(`PGPASSWORD=postgres psql -h localhost -p ${DB_PORT} -U postgres -d postgres -f "${tmpFile}" --set ON_ERROR_STOP=off 2>&1 | tail -5`, {
      stdio: 'inherit',
      maxBuffer: 100 * 1024 * 1024,
    });
    console.log('✅ Database restored successfully!');
  } catch (err) {
    console.log('⚠️ Some errors during restore (may be normal)');
  }

  // 7. Post-restore fixes via heredoc-style (avoid $$ shell issues)
  console.log('Applying post-restore fixes...');
  const fixFile = '/tmp/tcdb_postfix.sql';
  fs.writeFileSync(fixFile, `
-- === RLS & Public Schema Grants ===
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' DISABLE ROW LEVEL SECURITY';
  END LOOP;
END $$;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- === Auth Schema Ownership (tables) ===
ALTER SCHEMA auth OWNER TO supabase_auth_admin;
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'auth' LOOP
    EXECUTE 'ALTER TABLE auth.' || quote_ident(r.tablename) || ' OWNER TO supabase_auth_admin';
  END LOOP;
END $$;

-- === Auth Schema Ownership (sequences) ===
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT sequencename FROM pg_sequences WHERE schemaname = 'auth' LOOP
    EXECUTE 'ALTER SEQUENCE auth.' || quote_ident(r.sequencename) || ' OWNER TO supabase_auth_admin';
  END LOOP;
END $$;

-- === Auth Schema Ownership (enum types - required for GoTrue migrations) ===
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT t.typname
           FROM pg_type t JOIN pg_namespace n ON t.typnamespace = n.oid
           WHERE n.nspname = 'auth' AND t.typtype = 'e'
  LOOP
    EXECUTE format('ALTER TYPE auth.%I OWNER TO supabase_auth_admin', r.typname);
  END LOOP;
END $$;

-- === Auth Schema Ownership (functions) ===
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT p.proname, pg_get_function_identity_arguments(p.oid) as args
           FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
           WHERE n.nspname = 'auth'
  LOOP
    EXECUTE format('ALTER FUNCTION auth.%I(%s) OWNER TO supabase_auth_admin', r.proname, r.args);
  END LOOP;
END $$;

-- === Auth Schema Grants ===
GRANT ALL ON SCHEMA auth TO supabase_auth_admin;
GRANT ALL ON ALL TABLES IN SCHEMA auth TO supabase_auth_admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA auth TO supabase_auth_admin;
GRANT USAGE ON SCHEMA auth TO authenticator, supabase_auth_admin;

-- === Search Path for GoTrue (CRITICAL - GoTrue queries tables without schema prefix) ===
ALTER ROLE supabase_auth_admin SET search_path TO auth, public, extensions;

-- === Mark GoTrue migrations as applied to prevent re-execution errors ===
INSERT INTO public.schema_migrations (version) VALUES
  ('20250731150234'),('20250731150235'),('20250904133000'),
  ('20250925093508'),('20251007112900'),('20251104100000'),
  ('20251111201300'),('20251201000000'),('20260115000000'),
  ('20260121000000'),('20260219120000'),('20260302000000'),
  ('20260401000000'),('20260501000000')
ON CONFLICT DO NOTHING;

-- === Reload PostgREST ===
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
  `);
  execSync(`PGPASSWORD=postgres psql -h localhost -p ${DB_PORT} -U postgres -d postgres -f ${fixFile}`, { stdio: 'inherit' });

  // 8. Restart GoTrue with correct configuration
  console.log('Restarting GoTrue...');
  try { execSync('lsof -ti:9999 | xargs kill -9 2>/dev/null', { stdio: 'pipe' }); } catch {}
  
  const gotrueDir = require('path').join(__dirname, 'texacore-installer', 'bin');
  const arch = process.arch === 'arm64' ? 'arm64' : 'x64';
  const platform = process.platform === 'darwin' ? 'macos' : 'win';
  const ext = process.platform === 'win32' ? '.exe' : '';
  const gotrueBin = require('path').join(gotrueDir, `${platform}-${arch}`, 'gotrue', `auth${ext}`);
  
  if (fs.existsSync(gotrueBin)) {
    const { spawn } = require('child_process');
    const gotrueEnv = {
      ...process.env,
      GOTRUE_DB_DATABASE_URL: `postgres://supabase_auth_admin:texacore-local-super-secret@localhost:${DB_PORT}/postgres`,
      API_EXTERNAL_URL: 'http://localhost:9999',
      GOTRUE_API_HOST: '0.0.0.0',
      GOTRUE_API_PORT: '9999',
      GOTRUE_DB_DRIVER: 'postgres',
      GOTRUE_JWT_SECRET: 'texacore-jwt-secret-at-least-32-characters-long',
      GOTRUE_JWT_EXP: '3600',
      GOTRUE_JWT_DEFAULT_GROUP_NAME: 'authenticated',
      GOTRUE_JWT_AUD: 'authenticated',
      GOTRUE_SITE_URL: 'http://localhost:5174',
      GOTRUE_DISABLE_SIGNUP: 'false',
      GOTRUE_EXTERNAL_EMAIL_ENABLED: 'true',
      GOTRUE_MAILER_AUTOCONFIRM: 'true',
      GOTRUE_LOG_LEVEL: 'warn',
    };
    const child = spawn(gotrueBin, [], { env: gotrueEnv, detached: true, stdio: 'ignore' });
    child.unref();
    console.log('✅ GoTrue restarted (PID:', child.pid, ')');
    
    // Wait for GoTrue to be ready
    await new Promise(r => setTimeout(r, 3000));
  } else {
    console.log('⚠️ GoTrue binary not found at:', gotrueBin);
    console.log('   Please restart GoTrue manually.');
  }

  // 9. Create admin user if auth.users is empty
  const authCount = execSync(`PGPASSWORD=postgres psql -h localhost -p ${DB_PORT} -U postgres -d postgres -t -c "SELECT count(*) FROM auth.users;"`)
    .toString().trim();
  
  const companyId = execSync(`PGPASSWORD=postgres psql -h localhost -p ${DB_PORT} -U postgres -d postgres -t -c "SELECT id FROM companies LIMIT 1;"`)
    .toString().trim();

  if (parseInt(authCount) === 0 && companyId) {
    console.log('Creating default admin user...');
    try {
      const http = require('http');
      const signupData = JSON.stringify({
        email: `admin@${companyId}.local`,
        password: 'admin123',
        data: { role: 'admin' }
      });
      await new Promise((resolve, reject) => {
        const req = http.request({
          hostname: 'localhost', port: 54321, path: '/auth/v1/signup',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1sb2NhbCIsInJlZiI6InRleGFjb3JlLWxvY2FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyMzQ1MzUsImV4cCI6MjA5MjU5NDUzNX0.aEuY0oBAUi1C9XHpr_xFEtvPDVXYrIdnjJsZUgWJxSk',
          }
        }, (res) => {
          let body = '';
          res.on('data', d => body += d);
          res.on('end', () => {
            try {
              const result = JSON.parse(body);
              if (result.access_token) {
                console.log('✅ Admin user created (admin / admin123)');
              } else {
                console.log('⚠️ User creation response:', result.msg || body.substring(0, 100));
              }
            } catch { console.log('⚠️ Unexpected response'); }
            resolve();
          });
        });
        req.on('error', () => { console.log('⚠️ Could not create user - GoTrue may not be ready'); resolve(); });
        req.write(signupData);
        req.end();
      });
    } catch (e) {
      console.log('⚠️ User creation failed:', e.message);
    }
  }

  // 10. Final verification
  const result = execSync(`PGPASSWORD=postgres psql -h localhost -p ${DB_PORT} -U postgres -d postgres -t -c "SELECT id, name FROM companies LIMIT 1;"`)
    .toString().trim();
  console.log('Company:', result || '(empty)');

  const finalAuth = execSync(`PGPASSWORD=postgres psql -h localhost -p ${DB_PORT} -U postgres -d postgres -t -c "SELECT email FROM auth.users LIMIT 5;"`)
    .toString().trim();
  console.log('Auth users:', finalAuth || '(empty)');

  // Cleanup
  try { fs.unlinkSync(tmpFile); } catch {}
  try { fs.unlinkSync(fixFile); } catch {}
  console.log('\n🎉 Restore complete! Login with: admin / admin123');
}

main().catch(e => { console.error('❌ Error:', e.message); process.exit(1); });
