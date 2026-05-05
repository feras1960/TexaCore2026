#!/usr/bin/env node
/**
 * TexaCore Dev Server — Standalone (No Electron Required)
 * ═══════════════════════════════════════════════════════
 * Port 54321: API Proxy (PostgREST + GoTrue)
 * Port 1960:  Local API (companies, delete, import-rsf)
 * 
 * ⚡ Replicates EXACT Electron main.js API behavior
 */
const http = require('http');
const { Client } = require('pg');

const PROXY_PORT  = 54321;
const LOCAL_PORT  = 1960;
const POSTGREST   = 3000;
const GOTRUE      = 9999;
const PG_PORT     = 54322;
const PG_PASSWORD = 'postgres';

const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1sb2NhbCIsInJlZiI6InRleGFjb3JlLWxvY2FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyMzQ1MzUsImV4cCI6MjA5MjU5NDUzNX0.aEuY0oBAUi1C9XHpr_xFEtvPDVXYrIdnjJsZUgWJxSk';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1sb2NhbCIsInJlZiI6InRleGFjb3JlLWxvY2FsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzIzNDUzNSwiZXhwIjoyMDkyNTk0NTM1fQ.8iGFw0gctL08j8y64qadPceHOR2I0GSGCPg69UJ81gs';

// ═══════════════════════════════════════════════════
// Helper: create pg client
// ═══════════════════════════════════════════════════
function createPgClient() {
  return new Client({
    host: 'localhost', port: PG_PORT,
    database: 'postgres', user: 'postgres', password: PG_PASSWORD,
  });
}

// ═══════════════════════════════════════════════════
// Helper: GoTrue admin request
// ═══════════════════════════════════════════════════
function gotrueRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1', port: GOTRUE, path,
      method,
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
        'Content-Type': 'application/json',
      }
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ═══════════════════════════════════════════════════
// Helper: read request body
// ═══════════════════════════════════════════════════
function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => resolve(body));
  });
}

// ═══════════════════════════════════════════════════
// Server 1: API Proxy on 54321
// ═══════════════════════════════════════════════════
const proxyServer = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey, x-client-info, Accept, Range, X-Upsert, Prefer, x-supabase-api-version, accept-profile, content-profile');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Range, X-Total-Count');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  let targetPort, targetPath;

  if (req.url.startsWith('/auth/v1/')) {
    targetPort = GOTRUE;
    targetPath = req.url.replace('/auth/v1', '') || '/';
  } else if (req.url.startsWith('/rest/v1')) {
    targetPort = POSTGREST;
    targetPath = req.url.replace('/rest/v1', '') || '/';
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found', hint: 'Use /auth/v1/ or /rest/v1/' }));
    return;
  }

  const proxyReq = http.request({
    hostname: '127.0.0.1', port: targetPort, path: targetPath,
    method: req.method,
    headers: { ...req.headers, host: `127.0.0.1:${targetPort}` },
  }, (proxyRes) => {
    proxyRes.headers['access-control-allow-origin'] = '*';
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Service unavailable', message: err.message }));
  });

  req.pipe(proxyReq);
});

// ═══════════════════════════════════════════════════
// Server 2: Local API on 1960
// Mirrors Electron main.js API exactly
// ═══════════════════════════════════════════════════
const localServer = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // ══════════════════════════════════════════════
  // GET /api/companies
  // ══════════════════════════════════════════════
  if (req.url === '/api/companies' && req.method === 'GET') {
    const pg = createPgClient();
    try {
      await pg.connect();
      const { rows } = await pg.query('SELECT id, name FROM public.companies ORDER BY created_at DESC');
      const companies = rows.map(c => ({
        id: c.id,
        name: c.name,
        logo: c.name.charAt(0).toUpperCase(),
        lastAccessed: new Date().toISOString(),
      }));
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, companies }));
    } catch (err) {
      res.writeHead(500);
      res.end(JSON.stringify({ success: false, error: err.message }));
    } finally {
      pg.end().catch(() => {});
    }
    return;
  }

  // ══════════════════════════════════════════════
  // POST /api/delete-company
  // Exact copy from Electron main.js lines 934-1068
  // ══════════════════════════════════════════════
  if (req.url === '/api/delete-company' && req.method === 'POST') {
    const body = await readBody(req);
    const pg = createPgClient();
    try {
      const { companyId } = JSON.parse(body);
      if (!companyId) {
        res.writeHead(400);
        res.end(JSON.stringify({ success: false, error: 'companyId is required' }));
        return;
      }

      await pg.connect();

      // 1. Get tenant_id
      const { rows: compRows } = await pg.query(
        'SELECT tenant_id FROM public.companies WHERE id = $1', [companyId]
      );
      const tenantId = compRows.length > 0 ? compRows[0].tenant_id : null;

      // 2. Disable all triggers
      await pg.query(`
        DO $$ DECLARE r RECORD;
        BEGIN
          FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
            EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' DISABLE TRIGGER ALL';
          END LOOP;
        END $$;
      `);

      // 3. Delete from every table with company_id
      await pg.query(`
        DO $$ DECLARE r RECORD; cnt INTEGER;
        BEGIN
          FOR r IN 
            SELECT c.table_name FROM information_schema.columns c
            JOIN information_schema.tables t 
              ON c.table_schema = t.table_schema AND c.table_name = t.table_name
            WHERE c.table_schema = 'public' AND c.column_name = 'company_id'
            AND t.table_type = 'BASE TABLE'
            AND c.table_name != 'companies'
            ORDER BY c.table_name
          LOOP
            EXECUTE 'DELETE FROM public.' || quote_ident(r.table_name) 
              || ' WHERE company_id = $1' USING '${companyId}'::uuid;
            GET DIAGNOSTICS cnt = ROW_COUNT;
            IF cnt > 0 THEN
              RAISE NOTICE 'Deleted % rows from %', cnt, r.table_name;
            END IF;
          END LOOP;
        END $$;
      `);

      // 4. Delete tenant-scoped tables
      if (tenantId) {
        await pg.query(`
          DO $$ DECLARE r RECORD;
          BEGIN
            FOR r IN 
              SELECT c.table_name FROM information_schema.columns c
              JOIN information_schema.tables t 
                ON c.table_schema = t.table_schema AND c.table_name = t.table_name
              WHERE c.table_schema = 'public' AND c.column_name = 'tenant_id'
              AND t.table_type = 'BASE TABLE'
              AND c.table_name NOT IN ('companies', 'tenants')
              ORDER BY c.table_name
            LOOP
              EXECUTE 'DELETE FROM public.' || quote_ident(r.table_name) 
                || ' WHERE tenant_id = $1' USING '${tenantId}'::uuid;
            END LOOP;
          END $$;
        `);
      }

      // 5. Clean auth tables
      await pg.query(`DELETE FROM auth.identities WHERE user_id IN (
        SELECT id FROM auth.users WHERE raw_user_meta_data->>'company_id' = $1
      )`, [companyId]);
      await pg.query(`DELETE FROM auth.sessions WHERE user_id IN (
        SELECT id FROM auth.users WHERE raw_user_meta_data->>'company_id' = $1
      )`, [companyId]);
      await pg.query(`DELETE FROM auth.refresh_tokens WHERE user_id IN (
        SELECT id::varchar FROM auth.users WHERE raw_user_meta_data->>'company_id' = $1
      )`, [companyId]);
      await pg.query(
        `DELETE FROM auth.users WHERE raw_user_meta_data->>'company_id' = $1`,
        [companyId]
      );

      // 6. Delete company and tenant
      await pg.query('DELETE FROM public.companies WHERE id = $1', [companyId]);
      if (tenantId) {
        await pg.query('DELETE FROM public.tenants WHERE id = $1', [tenantId]);
      }

      // 7. Re-enable triggers
      await pg.query(`
        DO $$ DECLARE r RECORD;
        BEGIN
          FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
            EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' ENABLE TRIGGER ALL';
          END LOOP;
        END $$;
      `);

      // 8. Reload PostgREST schema cache
      await pg.query("NOTIFY pgrst, 'reload schema'");

      console.log('[Dev API] ✅ Company deleted:', companyId);
      res.writeHead(200);
      res.end(JSON.stringify({ success: true }));
    } catch (err) {
      console.error('[Dev API] ❌ Delete error:', err.message);
      res.writeHead(500);
      res.end(JSON.stringify({ success: false, error: err.message }));
    } finally {
      pg.end().catch(() => {});
    }
    return;
  }

  // ══════════════════════════════════════════════
  // POST /api/import-rsf
  // RSF import via file upload — delegates to Electron's RSF pipeline
  // ══════════════════════════════════════════════
  if (req.url === '/api/import-rsf' && req.method === 'POST') {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', async () => {
      const pg = createPgClient();
      try {
        const body = Buffer.concat(chunks);
        const contentType = req.headers['content-type'] || '';
        let rsfBuffer = null;
        let fileName = 'uploaded.rsf';

        if (contentType.includes('multipart/form-data')) {
          const boundary = contentType.split('boundary=')[1];
          const bodyStr = body.toString('binary');
          const parts = bodyStr.split('--' + boundary);
          for (const part of parts) {
            if (part.includes('filename=')) {
              const headerEnd = part.indexOf('\r\n\r\n');
              const headerPart = Buffer.from(part.substring(0, headerEnd), 'binary').toString('utf8');
              const filenameMatch = headerPart.match(/filename\*?=(?:UTF-8''|")?([^";\r\n]+)"?/i);
              if (filenameMatch) {
                let fn = filenameMatch[1];
                try { fn = decodeURIComponent(fn); } catch(e) {}
                fileName = fn;
              }
              const dataStart = headerEnd + 4;
              const dataEnd = part.lastIndexOf('\r\n');
              rsfBuffer = Buffer.from(part.substring(dataStart, dataEnd), 'binary');
            }
          }
        } else {
          rsfBuffer = body;
        }

        if (!rsfBuffer || rsfBuffer.length < 100) {
          res.writeHead(400);
          res.end(JSON.stringify({ success: false, error: 'No RSF data received' }));
          return;
        }

        // Save to temp
        const fs = require('fs');
        const path = require('path');
        const tmpDir = path.join(__dirname, '..', 'temp');
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
        const rsfPath = path.join(tmpDir, fileName);
        fs.writeFileSync(rsfPath, rsfBuffer);

        // Import using installer's RSF pipeline
        const installerSrc = path.join(__dirname, '..', 'texacore-installer', 'src');
        const { RsfReader } = require(path.join(installerSrc, 'rsf-reader'));
        const { RsfMapper } = require(path.join(installerSrc, 'rsf-mapper'));

        const reader = new RsfReader(rsfPath);
        await reader.open();
        const rsfCompanyName = fileName.replace('.rsf', '');

        await pg.connect();

        // Check existing company or create new
        const { rows: companies } = await pg.query("SELECT id, tenant_id FROM companies LIMIT 1");
        let tenantId, companyId;

        if (companies.length > 0) {
          tenantId = companies[0].tenant_id;
          companyId = companies[0].id;
          await pg.query('UPDATE public.companies SET name = $1, name_en = $1 WHERE id = $2', [rsfCompanyName, companyId]);
        } else {
          const crypto = require('crypto');
          tenantId = crypto.randomUUID();
          companyId = crypto.randomUUID();
          const tsCode = Date.now();

          const rsfCurrencies = reader.getCurrencies();
          const baseCurr = rsfCurrencies.find(c => c.num === 1);
          const foreignCurr = rsfCurrencies.find(c => c.num === 2);
          const detectISO = (name) => {
            if (!name) return 'USD';
            const n = name.toLowerCase();
            if (n.includes('غريفن') || n.includes('hryvnia')) return 'UAH';
            if (n.includes('دولار') || n.includes('dollar')) return 'USD';
            if (n.includes('يورو') || n.includes('euro')) return 'EUR';
            if (n.includes('ريال')) return 'SAR';
            return 'USD';
          };
          const baseCurrCode = detectISO(baseCurr?.name);
          const foreignCurrCode = detectISO(foreignCurr?.name);

          await pg.query('ALTER TABLE public.tenants DISABLE TRIGGER ALL');
          await pg.query(`INSERT INTO public.tenants (id, code, name, email, status, default_language) VALUES ($1, $2, $3, $4, 'active', 'ar') ON CONFLICT DO NOTHING`,
            [tenantId, `rsf_${tsCode}`, rsfCompanyName, `rsf_${tsCode}@texacore.local`]);
          await pg.query('ALTER TABLE public.tenants ENABLE TRIGGER ALL');

          await pg.query('ALTER TABLE public.companies DISABLE TRIGGER ALL');
          await pg.query(`INSERT INTO public.companies (id, tenant_id, code, name, name_en, default_currency) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING`,
            [companyId, tenantId, `rsf_${tsCode}`, rsfCompanyName, rsfCompanyName, baseCurrCode]);
          await pg.query('ALTER TABLE public.companies ENABLE TRIGGER ALL');

          const supportedCurrencies = baseCurrCode === foreignCurrCode ? [baseCurrCode] : [baseCurrCode, foreignCurrCode];
          await pg.query(`UPDATE public.companies SET accounting_settings = $1::jsonb WHERE id = $2`,
            [JSON.stringify({ base_currency: baseCurrCode, local_currency: baseCurrCode, supported_currencies: supportedCurrencies, fiscal_year_start: 'January' }), companyId]);
        }

        // Import
        const mapper = new RsfMapper(reader, tenantId, companyId, null);
        const gotrueReq = (method, reqPath, body) => gotrueRequest(method, reqPath, body);
        const result = await mapper.importAll(pg, { gotrueRequest: gotrueReq });
        result.companyName = rsfCompanyName;
        result.companyId = companyId;

        reader.close();

        console.log('[Dev API] ✅ RSF imported:', rsfCompanyName);
        res.writeHead(200);
        res.end(JSON.stringify(result));
      } catch (err) {
        console.error('[Dev API] ❌ RSF import error:', err.message);
        res.writeHead(500);
        res.end(JSON.stringify({ success: false, error: err.message }));
      } finally {
        pg.end().catch(() => {});
      }
    });
    return;
  }

  // ══════════════════════════════════════════════
  // GET /api/ping
  // ══════════════════════════════════════════════
  if (req.url === '/api/ping') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok', mode: 'dev' }));
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

// ═══════════════════════════════════════════════════
// Start both servers
// ═══════════════════════════════════════════════════
proxyServer.listen(PROXY_PORT, '0.0.0.0', () => {
  console.log(`✅ API Proxy on http://localhost:${PROXY_PORT}`);
  console.log(`   /auth/v1/* → GoTrue (${GOTRUE})`);
  console.log(`   /rest/v1/* → PostgREST (${POSTGREST})`);
});

localServer.listen(LOCAL_PORT, '0.0.0.0', () => {
  console.log(`✅ Local API on http://localhost:${LOCAL_PORT}`);
  console.log(`   /api/companies, /api/delete-company, /api/import-rsf`);
});
