# -*- coding: utf-8 -*-
"""Interactive diagnostic. Never pass credentials as command-line arguments."""
import getpass
import json
from pathlib import Path
import subprocess
import sys

if not sys.stdin.isatty():
    sys.exit('Run this script yourself in an interactive terminal.')
root = Path(__file__).resolve().parent.parent
print('Life OS: Supabase direct login check')
print('Use the same account as the app. Password input is hidden and is not saved.')
try:
    email = input('Email: ').strip()
    password = getpass.getpass('Password: ')
    result = subprocess.run(
        ['node', '--env-file=.env.local', 'scripts/check-login.mjs'],
        cwd=root, input=json.dumps({'email': email, 'password': password}),
        text=True, capture_output=True, timeout=30,
    )
    # Child stdout is a fixed diagnostic object. Never print stderr or raw errors.
    report = json.loads(result.stdout)
    print('Result:', report['result'])
    if report.get('code'):
        print('Code:', report['code'])
    if report.get('status') is not None:
        print('HTTP:', report['status'])
except (KeyboardInterrupt, EOFError):
    print('\nCancelled.')
except (subprocess.TimeoutExpired, ValueError, KeyError, OSError):
    print('Could not complete the check. No credentials have been saved.')
