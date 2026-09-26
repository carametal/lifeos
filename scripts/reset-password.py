# -*- coding: utf-8 -*-
"""User-operated admin password reset; no secrets in argv, environment or files."""
import getpass
import json
from pathlib import Path
import subprocess
import sys
import warnings

warnings.simplefilter('error', getpass.GetPassWarning)
if not sys.stdin.isatty():
    sys.exit('Run this command yourself in an interactive terminal.')
root = Path(__file__).resolve().parent.parent
command = ['node', '--env-file=.env.local', 'scripts/reset-password.mjs']
try:
    preflight = subprocess.run(command + ['--project'], cwd=root, capture_output=True, text=True, timeout=10)
    project = json.loads(preflight.stdout)['project']
    print('Supabase project:', project)
    print('Existing user password reset. The account and its data will be retained.')
    user_id = input('User UID (Authentication > Users): ').strip()
    email = input('Account email: ').strip()
    key = getpass.getpass('Secret key (sb_secret_..., hidden): ').strip()
    password = getpass.getpass('New password (12+ characters, hidden): ')
    confirm_password = getpass.getpass('New password again: ')
    if password != confirm_password:
        sys.exit('Passwords do not match. Nothing was sent.')
    if len(password) < 12 or len(password.encode('utf-8')) > 72:
        sys.exit('Use at least 12 characters and at most 72 UTF-8 bytes. Nothing was sent.')
    print('Target:', email, '/', user_id)
    confirmation = input('Type RESET to change this password: ')
    if confirmation != 'RESET':
        sys.exit('Cancelled. Nothing was sent.')
    result = subprocess.run(command, cwd=root, capture_output=True, text=True, timeout=30,
        input=json.dumps({'project': project, 'userId': user_id, 'email': email, 'key': key,
                         'password': password, 'confirmation': confirmation}))
    key = password = confirm_password = ''
    report = json.loads(result.stdout)
    print('Result:', report['result'])
    if report.get('code'):
        print('Code:', report['code'])
except (KeyboardInterrupt, EOFError):
    print('\nInterrupted. If already submitted, try the new password before retrying.')
except (getpass.GetPassWarning, subprocess.TimeoutExpired, ValueError, KeyError, OSError):
    print('Could not complete the check. If already submitted, try the new password before retrying.')
