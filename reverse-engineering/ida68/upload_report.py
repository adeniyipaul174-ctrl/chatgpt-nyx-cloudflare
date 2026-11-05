#!/usr/bin/env python3
"""Upload a JSON IDA report (not binaries) to a privately configured Cloudflare bridge."""
import json
import os
import pathlib
import sys
import urllib.error
import urllib.request


def main():
    if len(sys.argv) != 2:
        raise SystemExit('Usage: python upload_report.py path/to/nyx_ida_report.json')
    base = os.environ.get('NYX_IDA_BRIDGE_URL', '').rstrip('/')
    token = os.environ.get('NYX_IDA_UPLOAD_TOKEN', '')
    if not base.startswith('https://') or not token:
        raise SystemExit('Set NYX_IDA_BRIDGE_URL (HTTPS) and NYX_IDA_UPLOAD_TOKEN securely')
    path = pathlib.Path(sys.argv[1])
    data = path.read_bytes()
    if len(data) > 2 * 1024 * 1024:
        raise SystemExit('Report exceeds 2 MiB; reduce exported functions')
    obj = json.loads(data)
    if obj.get('format') != 'nyx-ida-report-v1':
        raise SystemExit('Not a NyX IDA report')
    request = urllib.request.Request(
        base + '/v1/reports', data=data, method='POST',
        headers={'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            print(response.read().decode('utf-8'))
    except urllib.error.HTTPError as err:
        raise SystemExit('Bridge rejected upload with HTTP %d' % err.code)


if __name__ == '__main__':
    main()
