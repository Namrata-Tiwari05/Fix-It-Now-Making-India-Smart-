import os
import re

replacements = {
    # Wards
    'w1111111-1111-1111-1111-111111111111': 'b1111111-1111-1111-1111-111111111111',
    'w2222222-2222-2222-2222-222222222222': 'b2222222-2222-2222-2222-222222222222',
    'w3333333-3333-3333-3333-333333333333': 'b3333333-3333-3333-3333-333333333333',
    'w4444444-4444-4444-4444-444444444444': 'b4444444-4444-4444-4444-444444444444',
    
    # Officers
    'of111111-1111-1111-1111-111111111111': 'f1111111-1111-1111-1111-111111111111',
    'of222222-2222-2222-2222-222222222222': 'f2222222-2222-2222-2222-222222222222',

    # Pincodes
    'pin-gmc-1': 'e1111111-1111-1111-1111-111111111111',
    'pin-gmc-2': 'e2222222-2222-2222-2222-222222222222',
    'pin-gmc-3': 'e3333333-3333-3333-3333-333333333333',
    'pin-gmc-4': 'e4444444-4444-4444-4444-444444444444',
    'pin-sdmc-1': 'e5555555-5555-5555-5555-555555555555',
    'pin-sdmc-2': 'e6666666-6666-6666-6666-666666666666',
    'pin-sdmc-3': 'e7777777-7777-7777-7777-777777777777',
    'pin-bbmp-1': 'e8888888-8888-8888-8888-888888888888',
    'pin-bbmp-2': 'e9999999-9999-9999-9999-999999999999',
}

files_to_fix = [
    r's:\Fix-It-Now\supabase\fixitnow_complete.sql',
    r's:\Fix-It-Now\server\src\services\db\index.js',
]

for file_path in files_to_fix:
    if os.path.exists(file_path):
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        original_content = content
        for bad, good in replacements.items():
            content = content.replace(bad, good)
            
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Updated {file_path}")
        else:
            print(f"No changes in {file_path}")
    else:
        print(f"Not found: {file_path}")
