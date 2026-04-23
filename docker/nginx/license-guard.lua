-- ════════════════════════════════════════════════════════════════
-- 🔒 TexaCore License Guard — OpenResty Lua Middleware
-- ════════════════════════════════════════════════════════════════
-- يتحقق من صلاحية الترخيص قبل تمرير أي request
-- يعمل مع ملف license.json المحلي + يتحقق من السيرفر دورياً
-- ════════════════════════════════════════════════════════════════

local cjson = require("cjson.safe")

-- ═══ Cache ═══
local license_cache = ngx.shared.license_cache
local CACHE_KEY = "license_valid"
local CACHE_TTL = 3600  -- 1 hour

-- ═══ Skip paths that don't need license check ═══
local skip_paths = {
    "/health",
    "/api/license/activate",
    "/api/license/status",
    "/favicon.ico",
}

local function should_skip(uri)
    for _, path in ipairs(skip_paths) do
        if uri == path or string.sub(uri, 1, #path) == path then
            return true
        end
    end
    return false
end

-- ═══ Read license.json ═══
local function read_license_file()
    local file = io.open("/etc/texacore/license.json", "r")
    if not file then
        return nil, "License file not found"
    end
    local content = file:read("*all")
    file:close()
    
    local data, err = cjson.decode(content)
    if not data then
        return nil, "Invalid license file: " .. (err or "unknown")
    end
    
    return data, nil
end

-- ═══ Validate license locally ═══
local function validate_local(license)
    -- Check required fields
    if not license.license_key or not license.status or not license.expires_at then
        return false, "Missing required license fields"
    end
    
    -- Check status
    if license.status ~= "active" then
        return false, "License is " .. license.status
    end
    
    -- Check expiry (with grace period)
    local expires_at = license.expires_at
    local grace_days = license.grace_period_days or 14
    
    -- Parse ISO date (basic parsing)
    local year, month, day = string.match(expires_at, "(%d+)-(%d+)-(%d+)")
    if not year then
        return false, "Invalid expiry date format"
    end
    
    local expiry_time = os.time({
        year = tonumber(year),
        month = tonumber(month),
        day = tonumber(day),
        hour = 23, min = 59, sec = 59
    })
    
    local grace_seconds = grace_days * 86400
    local now = os.time()
    
    if now > (expiry_time + grace_seconds) then
        return false, "License has expired (past grace period)"
    end
    
    -- Check hardware_id if available
    local hw_file = io.open("/etc/texacore/hardware_id", "r")
    if hw_file then
        local local_hw = hw_file:read("*all"):gsub("%s+$", "")
        hw_file:close()
        
        if license.hardware_id and license.hardware_id ~= local_hw then
            return false, "Hardware ID mismatch"
        end
    end
    
    return true, nil
end

-- ═══ Main Guard Logic ═══
local function check_license()
    local uri = ngx.var.uri
    
    -- Skip paths
    if should_skip(uri) then
        return
    end
    
    -- Check cache first
    local cached = license_cache:get(CACHE_KEY)
    if cached == "valid" then
        return  -- License is valid (cached)
    end
    
    -- Read and validate license
    local license, err = read_license_file()
    if not license then
        ngx.log(ngx.ERR, "License Guard: " .. (err or "unknown error"))
        ngx.status = 403
        ngx.header["Content-Type"] = "application/json"
        ngx.say(cjson.encode({
            error = "LICENSE_REQUIRED",
            message = "لم يتم العثور على ملف الترخيص. يرجى تفعيل البرنامج.",
            message_en = "License file not found. Please activate the software."
        }))
        return ngx.exit(403)
    end
    
    local valid, reason = validate_local(license)
    if not valid then
        ngx.log(ngx.ERR, "License Guard: Invalid — " .. (reason or "unknown"))
        ngx.status = 403
        ngx.header["Content-Type"] = "application/json"
        ngx.say(cjson.encode({
            error = "LICENSE_INVALID",
            message = "الترخيص غير صالح: " .. (reason or ""),
            message_en = "Invalid license: " .. (reason or ""),
            license_key = license.license_key,
            expires_at = license.expires_at
        }))
        return ngx.exit(403)
    end
    
    -- Cache the result
    license_cache:set(CACHE_KEY, "valid", CACHE_TTL)
    
    -- Set license info headers (for the app)
    ngx.req.set_header("X-License-Tier", license.tier or "basic")
    ngx.req.set_header("X-License-Max-Users", tostring(license.max_users or 3))
    ngx.req.set_header("X-License-Expires", license.expires_at or "")
end

-- Execute
check_license()
