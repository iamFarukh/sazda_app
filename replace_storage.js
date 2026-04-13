const fs = require('fs');
const glob = require('glob');

const files = glob.sync('/Users/farukhchenda/Desktop/farukh-modules/Apps/Sazda/src/store/*.ts');

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');

  // Replace createJSONStorage import
  content = content.replace(/import\s+{\s*createJSONStorage([^}]*)}\s*from\s*'zustand\/middleware';/, "import { $1 } from 'zustand/middleware';");
  
  // Clean up if the import becomes empty
  content = content.replace(/import\s+{\s*}\s*from\s*'zustand\/middleware';\n/, "");

  // Update mmkv import to include zustandStorage
  content = content.replace(/import\s*{\s*mmkv\s*}\s*from\s*'(.*?)\/storage';/, "import { zustandStorage } from '$1/storage';");

  // Remove the block defining mmkvStorage
  const storageBlockRegex = /const mmkvStorage = createJSONStorage[^{]+{[^}]+}[\s\S]*?\n\}\)\);\n/g;
  content = content.replace(storageBlockRegex, '');

  content = content.replace(/storage:\s*mmkvStorage/g, "storage: zustandStorage");

  fs.writeFileSync(file, content, 'utf8');
}
