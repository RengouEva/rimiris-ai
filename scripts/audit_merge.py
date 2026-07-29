#!/usr/bin/env python3
"""Merge cover + body PDF, add metadata, run QA checks."""
import os
import sys
from pypdf import PdfWriter, PdfReader

COVER = '/home/z/my-project/scripts/audit_cover.pdf'
BODY  = '/home/z/my-project/scripts/audit_body.pdf'
OUT   = '/home/z/my-project/download/Rimiris_AI_Audit_Securite_2026-07-30.pdf'

def main():
    if not os.path.exists(COVER):
        print(f'ERROR: cover missing: {COVER}')
        sys.exit(1)
    if not os.path.exists(BODY):
        print(f'ERROR: body missing: {BODY}')
        sys.exit(1)

    writer = PdfWriter()
    # Cover (first page)
    cover_reader = PdfReader(COVER)
    for page in cover_reader.pages:
        writer.add_page(page)
    # Body
    body_reader = PdfReader(BODY)
    for page in body_reader.pages:
        writer.add_page(page)

    # Metadata
    writer.add_metadata({
        '/Title':    'Audit de securite — Rimiris AI',
        '/Author':   'Super Z · Z.ai Security Review',
        '/Subject':  'Rapport d audit de securite complet — 30 juillet 2026',
        '/Creator':  'Z.ai PDF Skill — Report pipeline',
        '/Producer': 'ReportLab + Playwright (cover)',
        '/Keywords': 'audit, securite, OWASP, CVSS, Next.js, Rimiris, SSRF, XSS, CSRF, LLM',
    })

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'wb') as f:
        writer.write(f)

    size_kb = os.path.getsize(OUT) / 1024
    pages = len(writer.pages)
    print(f'OK final PDF written: {OUT}')
    print(f'   Size: {size_kb:.1f} KB')
    print(f'   Pages: {pages}')

if __name__ == '__main__':
    main()
