#!/usr/bin/env node

/**
 * Patches @dynamic-labs/sdk-react-core to fix the "Tried to getClient when it was still null" crash.
 *
 * The bug: useDynamicClient() uses useState(getDynamicClient()) as initial state.
 * getDynamicClient() throws if the client hasn't been set yet by DynamicContextProvider.
 * In React 19 / Next.js 15, this throws during the initial render before the provider
 * has finished its async initialization.
 *
 * The fix: Change useDynamicClient() to use useState(null) and sync via useEffect,
 * so it gracefully handles the uninitialized state instead of crashing.
 */

const fs = require('fs')
const path = require('path')

const filesToPatch = [
  'node_modules/@dynamic-labs/sdk-react-core/src/lib/client/client.js',
  'node_modules/@dynamic-labs/sdk-react-core/src/lib/client/client.cjs',
]

for (const relPath of filesToPatch) {
  const filePath = path.resolve(__dirname, '..', relPath)

  if (!fs.existsSync(filePath)) {
    console.log(`[patch-dynamic] Skipping ${relPath} (not found)`)
    continue
  }

  let content = fs.readFileSync(filePath, 'utf8')

  // Patch: replace useState(getDynamicClient()) with useState(dynamicClient)
  // This avoids the throw when dynamicClient is null during first render
  if (content.includes('useState(getDynamicClient())')) {
    content = content.replace('useState(getDynamicClient())', 'useState(dynamicClient)')
    fs.writeFileSync(filePath, content, 'utf8')
    console.log(`[patch-dynamic] ✅ Patched ${relPath}`)
  } else {
    console.log(`[patch-dynamic] ⏭️  Already patched or different version: ${relPath}`)
  }
}

console.log('[patch-dynamic] Done.')
