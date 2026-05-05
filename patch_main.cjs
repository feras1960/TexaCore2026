const fs = require('fs');
const path = require('path');
const file = '/Users/macbook/TexaCore-Backups-2026-03-25/erpsystem supabase/texacore-installer/src/main.js';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `
    // Start container
    const runCmd = [
      'docker run -d',
      \`--name \${CONTAINER_NAME}\`,
      \`-p \${port || APP_PORT}:80\`,
      \`--restart unless-stopped\`,
      \`-e LICENSE_KEY="\${licenseKey}"\`,
      \`-e LICENSING_SERVER_URL="\${LICENSING_URL}"\`,
      \`-e APP_VERSION="1.0.1"\`,
      \`-e SUPABASE_URL="\${supabaseUrl}"\`,
      \`-e SUPABASE_ANON_KEY="\${supabaseKey}"\`,
      DOCKER_IMAGE,
    ].join(' ');

    await runCommand(runCmd);`;

const replacementStr = `
    // Generate docker-compose.yml and kong.yml dynamically
    const dockerDir = path.join(app.getPath('userData'), 'docker');
    if (!fs.existsSync(dockerDir)) fs.mkdirSync(dockerDir, { recursive: true });
    
    const volumesApiDir = path.join(dockerDir, 'volumes', 'api');
    if (!fs.existsSync(volumesApiDir)) fs.mkdirSync(volumesApiDir, { recursive: true });

    const composeYaml = \`name: texacore-desktop

services:
  kong:
    image: kong:2.8.1
    restart: unless-stopped
    ports:
      - "\${port || APP_PORT}:8000/tcp"
    environment:
      KONG_DATABASE: "off"
      KONG_DECLARATIVE_CONFIG: /home/kong/kong.yml
      KONG_DNS_ORDER: LAST,A,CNAME
      KONG_PLUGINS: request-transformer,cors,key-auth,acl,basic-auth
      KONG_LOG_LEVEL: warn
    volumes:
      - ./volumes/api/kong.yml:/home/kong/kong.yml:ro
    depends_on:
      - auth
      - rest

  db:
    image: ghcr.io/feras1960/texacore-db:latest
    restart: unless-stopped
    ports:
      - "54322:5432/tcp"
    environment:
      POSTGRES_HOST: /var/run/postgresql
      PGPORT: "5432"
      POSTGRES_PORT: "5432"
      PGPASSWORD: \${dbPassword}
      POSTGRES_PASSWORD: \${dbPassword}
      PGDATABASE: postgres
      POSTGRES_DB: postgres
      JWT_SECRET: texacore-jwt-secret-at-least-32-characters-long
      JWT_EXP: 3600
    volumes:
      - db-data:/var/lib/postgresql/data
    healthcheck:
      test: pg_isready -U postgres -h localhost
      interval: 5s
      timeout: 5s
      retries: 10

  rest:
    image: postgrest/postgrest:v12.2.8
    restart: unless-stopped
    depends_on:
      - db
    environment:
      PGRST_DB_URI: postgres://authenticator:\${dbPassword}@db:5432/postgres
      PGRST_DB_SCHEMAS: public,graphql_public
      PGRST_DB_ANON_ROLE: anon
      PGRST_JWT_SECRET: texacore-jwt-secret-at-least-32-characters-long
      PGRST_DB_USE_LEGACY_GUCS: "false"
      PGRST_APP_SETTINGS_JWT_SECRET: texacore-jwt-secret-at-least-32-characters-long

  auth:
    image: supabase/gotrue:v2.170.0
    restart: unless-stopped
    depends_on:
      - db
    environment:
      GOTRUE_API_HOST: 0.0.0.0
      GOTRUE_API_PORT: "9999"
      API_EXTERNAL_URL: http://localhost:\${port || APP_PORT}
      GOTRUE_DB_DATABASE_URL: postgres://supabase_auth_admin:\${dbPassword}@db:5432/postgres
      GOTRUE_SITE_URL: http://localhost:5173
      GOTRUE_DISABLE_SIGNUP: "false"
      GOTRUE_JWT_ADMIN_ROLES: service_role
      GOTRUE_JWT_AUD: authenticated
      GOTRUE_JWT_DEFAULT_GROUP_NAME: authenticated
      GOTRUE_JWT_EXP: 3600
      GOTRUE_JWT_SECRET: texacore-jwt-secret-at-least-32-characters-long
      GOTRUE_MAILER_AUTOCONFIRM: "true"
      GOTRUE_SMS_AUTOCONFIRM: "true"

  realtime:
    image: supabase/realtime:v2.34.47
    restart: unless-stopped
    depends_on:
      - db
    environment:
      PORT: "4000"
      DB_HOST: db
      DB_PORT: "5432"
      DB_USER: supabase_admin
      DB_PASSWORD: \${dbPassword}
      DB_NAME: postgres
      DB_AFTER_CONNECT_QUERY: "SET search_path TO _realtime"
      DB_ENC_KEY: supabaseEncryptionKey
      API_JWT_SECRET: texacore-jwt-secret-at-least-32-characters-long
      SECRET_KEY_BASE: texacore-realtime-secret-key-base-at-least-64-characters-for-erlang-cookie
      ERL_AFLAGS: -proto_dist inet_tcp
      DNS_NODES: "''"
      APP_NAME: realtime
      SEED_SELF_HOST: "true"
      REPLICATION_MODE: RLS

  storage:
    image: supabase/storage-api:v1.14.7
    restart: unless-stopped
    depends_on:
      - db
    environment:
      ANON_KEY: \${supabaseKey}
      SERVICE_KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6a2tsZW5mc2FlcGVneW1meGZ6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODc1MjE3NywiZXhwIjoyMDg0MzI4MTc3fQ.DUMMY
      POSTGREST_URL: http://rest:3000
      PGRST_JWT_SECRET: texacore-jwt-secret-at-least-32-characters-long
      DATABASE_URL: postgres://supabase_storage_admin:\${dbPassword}@db:5432/postgres
      FILE_SIZE_LIMIT: 52428800
      STORAGE_BACKEND: file
      FILE_STORAGE_BACKEND_PATH: /var/lib/storage
      TENANT_ID: stub
      REGION: local
      GLOBAL_S3_BUCKET: stub
    volumes:
      - storage-data:/var/lib/storage

  app:
    image: ghcr.io/feras1960/texacore-app:latest
    restart: unless-stopped
    ports:
      - "5173:80"
    depends_on:
      - kong
    environment:
      LICENSE_KEY: "\${licenseKey}"
      LICENSING_SERVER_URL: "\${LICENSING_URL}"

volumes:
  db-data:
    driver: local
  storage-data:
    driver: local
\`;

    const kongYaml = \`_format_version: "1.1"

consumers:
  - username: DASHBOARD

services:
  - name: auth-v1-open
    url: http://auth:9999/verify
    routes: [{ name: auth-v1-open, strip_path: true, paths: [ /auth/v1/verify ] }]
    plugins: [{ name: cors }]
  - name: auth-v1-open-callback
    url: http://auth:9999/callback
    routes: [{ name: auth-v1-open-callback, strip_path: true, paths: [ /auth/v1/callback ] }]
    plugins: [{ name: cors }]
  - name: auth-v1-open-authorize
    url: http://auth:9999/authorize
    routes: [{ name: auth-v1-open-authorize, strip_path: true, paths: [ /auth/v1/authorize ] }]
    plugins: [{ name: cors }]
  - name: auth-v1
    url: http://auth:9999/
    routes: [{ name: auth-v1, strip_path: true, paths: [ /auth/v1/ ] }]
    plugins: [{ name: cors }, { name: key-auth, config: { hide_credentials: false, key_names: [apikey] } }]
  - name: rest-v1
    url: http://rest:3000/
    routes: [{ name: rest-v1, strip_path: true, paths: [ /rest/v1/ ] }]
    plugins: [{ name: cors }, { name: key-auth, config: { hide_credentials: false, key_names: [apikey] } }]
  - name: realtime-v1-ws
    url: http://realtime:4000/socket/
    routes: [{ name: realtime-v1-ws, strip_path: true, paths: [ /realtime/v1/ ] }]
    plugins: [{ name: cors }, { name: key-auth, config: { hide_credentials: false, key_names: [apikey] } }]
  - name: storage-v1
    url: http://storage:5000/
    routes: [{ name: storage-v1, strip_path: true, paths: [ /storage/v1/ ] }]
    plugins: [{ name: cors }]
  - name: app
    url: http://app:80/
    routes: [{ name: app, strip_path: true, paths: [ / ] }]

keyauth_credentials:
  - consumer: DASHBOARD
    key: \${supabaseKey}
\`;

    fs.writeFileSync(path.join(dockerDir, 'docker-compose.yml'), composeYaml);
    fs.writeFileSync(path.join(volumesApiDir, 'kong.yml'), kongYaml);

    // Stop existing container if any
    try { await runCommand(\`cd "\${dockerDir}" && docker compose down\`); } catch (e) {}
    
    // Start the full stack
    await runCommand(\`cd "\${dockerDir}" && docker compose up -d\`);`;

if(content.includes('docker run -d')) {
    content = content.replace(targetStr, replacementStr);
    
    // Also fix the 'stop-erp'
    content = content.replace(
      'await runCommand(`docker stop ${CONTAINER_NAME}`);\n    await runCommand(`docker rm ${CONTAINER_NAME}`);',
      'const dockerDir = path.join(app.getPath(\'userData\'), \'docker\');\n    await runCommand(`cd "${dockerDir}" && docker compose down`);'
    );
    
    // Also remove the initial docker rm in start-erp to avoid conflicts
    content = content.replace(
      'await runCommand(`docker stop ${CONTAINER_NAME} 2>/dev/null || true`);\n    await runCommand(`docker rm ${CONTAINER_NAME} 2>/dev/null || true`);',
      ''
    );
    
    fs.writeFileSync(file, content);
    console.log("Successfully patched main.js");
} else {
    console.log("Already patched or target string not found.");
}
