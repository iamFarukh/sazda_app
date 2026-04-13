import os
import re
import glob

files = glob.glob('/Users/farukhchenda/Desktop/farukh-modules/Apps/Sazda/src/store/*.ts')

for file in files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Remove the mmkvStorage block
    content = re.sub(r'const mmkvStorage = createJSONStorage.*?\}\)\);\n', '', content, flags=re.DOTALL)
    
    # Remove mmkv import if it is not used directly anymore
    # Oh wait, mmkv is used outside createJSONStorage in some files?
    # No, all stores only needed mmkv for createJSONStorage.
    
    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)
