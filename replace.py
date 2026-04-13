import os
import re
import glob

files = glob.glob('/Users/farukhchenda/Desktop/farukh-modules/Apps/Sazda/src/store/*.ts')

storage_block_pattern = re.compile(r'const mmkvStorage = createJSONStorage[^{]+{[^}]+}[\s\S]*?\n\}\)\);\n')

for file in files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. Replace import { ... , createJSONStorage, ... } from 'zustand/middleware';
    # Need to handle various cases 
    content = re.sub(r'import\s+{\s*createJSONStorage([^}]*)}\s*from\s*\'zustand/middleware\';', r"import {\1} from 'zustand/middleware';", content)
    content = re.sub(r'import\s+{\s*}\s*from\s*\'zustand/middleware\';\n?', '', content)
    
    # Also if it's import { createJSONStorage, persist }
    content = re.sub(r'createJSONStorage\s*,\s*', '', content)
    content = re.sub(r',\s*createJSONStorage', '', content)
    
    # 2. Update import { mmkv } from '../services/storage'
    content = re.sub(r'import\s*{\s*mmkv\s*}\s*from\s*\'(.*?)/storage\';', r"import { zustandStorage } from '\1/storage';", content)
    
    # 3. Remove the block
    content = storage_block_pattern.sub('', content)
    
    # 4. Replace usage
    content = content.replace('storage: mmkvStorage', 'storage: zustandStorage')
    
    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)
