import os
import re
import glob

files = glob.glob('/Users/farukhchenda/Desktop/farukh-modules/Apps/Sazda/src/store/*.ts')

for file in files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    content = content.replace('import {, persist }', 'import { persist }')
    content = content.replace('import { persist, }', 'import { persist }')
    
    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)
