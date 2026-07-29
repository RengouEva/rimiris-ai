#!/usr/bin/env python3
"""Validate Rimiris .env files: checks structure, secret lengths, duplicates,
and that every process.env.VAR referenced in src/ has a value somewhere."""
import os
import re
import sys
from pathlib import Path
from collections import defaultdict

PROJECT = Path('/home/z/my-project')
ENV_FILES = [PROJECT / '.env', PROJECT / '.env.local']

# 1) Parse env files
def parse_env(p):
    data = {}
    if not p.exists():
        return data, []
    errs = []
    for n, line in enumerate(p.read_text().splitlines(), 1):
        s = line.strip()
        if not s or s.startswith('#'):
            continue
        if '=' not in s:
            errs.append(f"{p.name}:{n}: no '=' in line")
            continue
        k, v = s.split('=', 1)
        k = k.strip()
        v = v.strip().strip('"').strip("'")
        data[k] = v
    return data, errs

env = {}
errors = []
for f in ENV_FILES:
    d, e = parse_env(f)
    env.update(d)
    errors.extend(e)

print("=" * 70)
print(" ENV FILE VALIDATION — Rimiris AI")
print("=" * 70)

# 2) Required vars
REQUIRED = [
    'DATABASE_URL',
    'RIMIRIS_SESSION_SECRET',
    'RIMIRIS_ENCRYPTION_KEY',
    'RIMIRIS_PAYMENT_SECRET',
    'SESSION_SECRET',
    'ENCRYPTION_KEY',
    'PAYMENT_SECRET',
    'NEXT_PUBLIC_SITE_URL',
    'LLM_PROVIDER',
]
print("\n[1] Required variables")
all_ok = True
for k in REQUIRED:
    v = env.get(k, '')
    status = 'OK' if v else 'MISSING'
    if not v:
        all_ok = False
    print(f"  {status:7} {k} = {v[:20] + '...' if len(v) > 20 else v}")

# 3) Secret length check (should be 64 hex chars)
HEX64 = re.compile(r'^[0-9a-f]{64}$')
SECRETS = [
    'RIMIRIS_SESSION_SECRET',
    'RIMIRIS_ENCRYPTION_KEY',
    'RIMIRIS_PAYMENT_SECRET',
    'SESSION_SECRET',
    'ENCRYPTION_KEY',
    'PAYMENT_SECRET',
]
print("\n[2] Secret strength (must be 64 hex chars)")
for k in SECRETS:
    v = env.get(k, '')
    if HEX64.match(v):
        print(f"  OK      {k} = {v[:12]}...{v[-8:]} (64 hex)")
    else:
        all_ok = False
        print(f"  WEAK    {k} = {v[:20]}... ({len(v)} chars, expected 64 hex)")

# 4) No duplicates across secrets
print("\n[3] Secret uniqueness (no two secrets should match)")
seen = {}
dup = False
for k in SECRETS:
    v = env.get(k, '')
    if v in seen:
        all_ok = False
        dup = True
        print(f"  DUP     {k} == {seen[v]} (both = {v[:12]}...)")
    else:
        seen[v] = k
if not dup:
    print("  OK      all 6 secrets are distinct")

# 5) DATABASE_URL format
print("\n[4] DATABASE_URL format")
db = env.get('DATABASE_URL', '')
m = re.match(r'^mysql://([^:]+):([^@]+)@([^:]+):(\d+)/(\S+)$', db)
if m:
    user, pw, host, port, name = m.groups()
    pw_strength = 'STRONG' if len(pw) >= 16 else ('OK' if len(pw) >= 8 else 'WEAK')
    print(f"  OK      format valid")
    print(f"          user={user}  host={host}:{port}  db={name}")
    print(f"          password length={len(pw)} ({pw_strength})")
    if 'rimiris_password' in pw:
        all_ok = False
        print(f"  ⚠️      placeholder password detected — replace with real creds")
    if host in ('127.0.0.1', 'localhost'):
        print(f"  NOTE    host is local — fine for dev, replace for prod")
else:
    all_ok = False
    print(f"  BAD     {db}")

# 6) LLM_PROVIDER
print("\n[5] LLM provider")
llm = env.get('LLM_PROVIDER', '')
if llm in ('zai', 'openai', 'anthropic', 'mistral', 'openrouter', 'local'):
    print(f"  OK      LLM_PROVIDER={llm}")
else:
    all_ok = False
    print(f"  BAD     LLM_PROVIDER={llm} (expected one of zai/openai/anthropic/mistral/openrouter/local)")

# 7) NEXT_PUBLIC_SITE_URL
print("\n[6] Public site URL")
url = env.get('NEXT_PUBLIC_SITE_URL', '')
if url.startswith(('http://', 'https://')):
    print(f"  OK      {url}")
else:
    all_ok = False
    print(f"  BAD     {url} (must start with http:// or https://)")

# 8) Cross-check with src/ — what env vars does the code expect?
print("\n[7] Code references (process.env.X in src/)")
src_dir = PROJECT / 'src'
code_vars = set()
for f in src_dir.rglob('*.ts'):
    try:
        txt = f.read_text()
    except Exception:
        continue
    for m in re.finditer(r'process\.env\.([A-Z_][A-Z0-9_]*)', txt):
        code_vars.add(m.group(1))

# Skip NODE_ENV (always set by Next.js)
code_vars.discard('NODE_ENV')

missing_in_env = sorted([v for v in code_vars if v not in env])
extra_in_env = sorted([v for v in env if v not in code_vars and v not in REQUIRED])

print(f"  {len(code_vars)} env vars referenced in src/")
for v in sorted(code_vars):
    in_env = '✓' if v in env else '✗'
    print(f"    {in_env} {v}")

if missing_in_env:
    print(f"\n  ⚠️  Referenced in code but NOT set in .env:")
    for v in missing_in_env:
        print(f"      - {v} (optional — only needed if LLM_PROVIDER or feature requires it)")
if extra_in_env:
    print(f"\n  ℹ️  Set in .env but not referenced in src/ (may be used by config files):")
    for v in extra_in_env:
        print(f"      - {v}")

# 9) Files syntax
print("\n[8] File syntax errors")
if errors:
    for e in errors:
        print(f"  {e}")
else:
    print("  OK      no syntax errors in .env / .env.local")

# 10) Summary
print("\n" + "=" * 70)
if all_ok and not missing_in_env:
    print(" ✅  ENV VALID — ready for dev / build / start")
    sys.exit(0)
else:
    print(" ⚠️  ENV HAS ISSUES — see above")
    print("     (missing optional vars are OK if feature isn't used)")
    sys.exit(1 if not all_ok else 0)
