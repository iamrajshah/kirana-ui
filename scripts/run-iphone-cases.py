#!/usr/bin/env python3
"""Run explicit physical-phone cases and reject silent selector omissions/skips.
Credentials stay in the caller's private xctestrun, never in this script.
"""
import argparse
import json
from pathlib import Path
import re
import subprocess
import sys

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--cases', required=True, help='Comma-separated two-digit test numbers')
parser.add_argument('--xctestrun', type=Path, required=True)
parser.add_argument('--device', required=True, help='Explicit authorized QA phone UDID')
parser.add_argument('--result', type=Path, required=True)
parser.add_argument('--log', type=Path, required=True)
parser.add_argument('--list-only', action='store_true')
args = parser.parse_args()
source = Path(__file__).resolve().parent.parent / 'ios/App/KiranaFlowUITests/KiranaFlowUITests.swift'
methods = re.findall(r'func\s+(test\d+[A-Za-z0-9_]*)\s*\(', source.read_text())
selected = []
for number in args.cases.split(','):
    if not re.fullmatch(r'\d{2}', number):
        parser.error('Each case must be a two-digit number')
    matches = [name for name in methods if re.match(r'test' + number + r'(?=\D)', name)]
    if len(matches) != 1:
        parser.error(f'Case {number} matches {len(matches)} source methods')
    if matches[0] in selected:
        parser.error(f'Duplicate case {number}')
    selected.extend(matches)
print(f'Validated {len(selected)} exact methods: ' + ', '.join(selected), flush=True)
if args.list_only:
    sys.exit(0)
if not args.xctestrun.is_file() or args.result.exists():
    parser.error('Use an existing private xctestrun and a new result bundle path')
args.log.parent.mkdir(parents=True, exist_ok=True)
command = ['xcodebuild', 'test-without-building', '-xctestrun', str(args.xctestrun),
           '-destination', f'platform=iOS,id={args.device},arch=arm64',
           '-parallel-testing-enabled', 'NO', '-resultBundlePath', str(args.result)]
command += [f'-only-testing:KiranaFlowUITests/KiranaFlowUITests/{method}' for method in selected]
with args.log.open('w') as log:
    outcome = subprocess.run(command, stdout=log, stderr=subprocess.STDOUT)
if outcome.returncode:
    sys.exit(outcome.returncode)
receipt = subprocess.run(['xcrun', 'xcresulttool', 'get', 'test-results', 'summary',
                          '--path', str(args.result)], capture_output=True, text=True, check=True)
summary = json.loads(receipt.stdout)
counts = {key: summary.get(key, 0) for key in ('passedTests', 'failedTests', 'skippedTests')}
print(json.dumps(counts), flush=True)
if counts['passedTests'] != len(selected) or counts['failedTests'] or counts['skippedTests']:
    sys.exit('Regression incomplete: selected case count differs from passing, unskipped results')
