/**
 * Flash ⚡ PR Review — Main Orchestrator
 *
 * Production-grade PR review bot:
 * - Per-file review with Gemini (not one big diff dump)
 * - Structured JSON output for inline comments
 * - Separate summary comment for the full PR
 * - Smart file prioritization (critical paths first)
 * - Auto-skip binaries, lockfiles, generated code
 * - Retry logic with exponential backoff
 * - Concurrency control (parallel file reviews)
 *
 * Zero external dependencies — uses native Node.js https.
 */

const fs = require('fs')
const https = require('https')
const { buildFileReviewPrompt, buildSummaryPrompt } = require('./prompt')

// ─── Configuration ─────────────────────────────────────────────────

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const MODEL = 'gemini-2.0-flash'
const MAX_DIFF_PER_FILE = 15000        // chars per file diff
const MAX_FILES_TO_REVIEW = 15         // max files per run
const CONCURRENCY = 3                  // parallel Gemini calls
const MAX_RETRIES = 2                  // retry failed API calls
const RETRY_DELAY_MS = 2000            // base delay for exponential backoff
const REQUEST_TIMEOUT_MS = 45000       // per-request timeout

// Files to never review
const SKIP_PATTERNS = [
  /package-lock\.json$/,
  /pnpm-lock\.yaml$/,
  /yarn\.lock$/,
  /\.lock$/,
  /\.svg$/,
  /\.png$/,
  /\.jpg$/,
  /\.jpeg$/,
  /\.gif$/,
  /\.ico$/,
  /\.woff2?$/,
  /\.ttf$/,
  /\.eot$/,
  /node_modules\//,
  /\.next\//,
  /dist\//,
  /\.map$/,
  /\.d\.ts$/,
  /generated/,
  /\.min\.(js|css)$/,
  /supabase\/migrations\//,   // SQL migrations are usually reviewed manually
]

// Files to review with highest priority
const HIGH_PRIORITY = [
  /src\/services\//,
  /src\/app\/api\//,
  /src\/lib\//,
  /src\/inngest\//,
  /src\/hooks\//,
  /middleware\.ts$/,
]

const NORMAL_PRIORITY = [
  /src\/app\//,
  /src\/components\//,
  /src\/store\//,
  /src\/types\//,
]

// ─── Utilities ─────────────────────────────────────────────────────

function log(emoji, msg) {
  console.log(`${emoji} ${msg}`)
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ─── Diff Parser ───────────────────────────────────────────────────

/**
 * Split a unified diff into per-file chunks with metadata
 */
function parseDiff(rawDiff) {
  const files = []
  const lines = rawDiff.split('\n')
  let currentFile = null
  let currentLines = []

  for (const line of lines) {
    if (line.startsWith('diff --git')) {
      if (currentFile) {
        files.push({ file: currentFile, content: currentLines.join('\n') })
      }
      const match = line.match(/b\/(.+)$/)
      currentFile = match ? match[1] : null
      currentLines = [line]
    } else {
      currentLines.push(line)
    }
  }

  if (currentFile) {
    files.push({ file: currentFile, content: currentLines.join('\n') })
  }

  return files
}

/**
 * Filter and prioritize files for review
 */
function filterAndPrioritize(files) {
  // Filter out skippable files
  const reviewable = files.filter(
    (f) => f.file && !SKIP_PATTERNS.some((p) => p.test(f.file))
  )

  // Sort: high priority first, then normal, then rest
  return reviewable.sort((a, b) => {
    const aHigh = HIGH_PRIORITY.some((p) => p.test(a.file))
    const bHigh = HIGH_PRIORITY.some((p) => p.test(b.file))
    if (aHigh && !bHigh) return -1
    if (!aHigh && bHigh) return 1

    const aNormal = NORMAL_PRIORITY.some((p) => p.test(a.file))
    const bNormal = NORMAL_PRIORITY.some((p) => p.test(b.file))
    if (aNormal && !bNormal) return -1
    if (!aNormal && bNormal) return 1

    return 0
  })
}

// ─── Gemini API ────────────────────────────────────────────────────

/**
 * Call Gemini with retry and exponential backoff
 */
async function callGemini(prompt, retries = MAX_RETRIES) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`
  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.2,     // Low temp for consistent, precise reviews
      maxOutputTokens: 4096,
    },
  })

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await httpPost(url, body)
      return result
    } catch (err) {
      if (attempt < retries) {
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt)
        log('🔄', `Retry ${attempt + 1}/${retries} in ${delay}ms: ${err.message}`)
        await sleep(delay)
      } else {
        throw err
      }
    }
  }
}

/**
 * Native HTTPS POST (zero dependencies)
 */
function httpPost(url, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          if (json.error) {
            reject(new Error(`Gemini API: ${json.error.message} (${json.error.code})`))
            return
          }
          const text = json.candidates?.[0]?.content?.parts?.[0]?.text
          if (!text) {
            reject(new Error('Empty response from Gemini'))
            return
          }
          resolve(text)
        } catch (e) {
          reject(new Error(`Parse error: ${e.message}`))
        }
      })
    })

    req.on('error', reject)
    req.setTimeout(REQUEST_TIMEOUT_MS, () => {
      req.destroy()
      reject(new Error(`Request timeout (${REQUEST_TIMEOUT_MS / 1000}s)`))
    })

    req.write(body)
    req.end()
  })
}

// ─── JSON Parser (robust) ──────────────────────────────────────────

/**
 * Parse JSON from Gemini response (handles markdown code blocks, trailing commas)
 */
function parseReviewJSON(text) {
  // Strip markdown code block wrapping if present
  let cleaned = text.trim()
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?\s*```\s*$/i, '')
  cleaned = cleaned.trim()

  // Handle trailing commas (common LLM mistake)
  cleaned = cleaned.replace(/,\s*([}\]])/g, '$1')

  try {
    const parsed = JSON.parse(cleaned)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item) =>
        item &&
        typeof item.line === 'number' &&
        typeof item.body === 'string' &&
        item.line > 0
    )
  } catch (e) {
    log('⚠️', `Failed to parse JSON review: ${e.message}`)
    log('⚠️', `Raw response (first 200 chars): ${text.slice(0, 200)}`)
    return []
  }
}

// ─── Concurrency Control ───────────────────────────────────────────

/**
 * Run async tasks with concurrency limit
 */
async function parallelLimit(tasks, limit) {
  const results = []
  const executing = new Set()

  for (const task of tasks) {
    const p = task().then((result) => {
      executing.delete(p)
      return result
    })
    executing.add(p)
    results.push(p)

    if (executing.size >= limit) {
      await Promise.race(executing)
    }
  }

  return Promise.allSettled(results)
}

// ─── Main ──────────────────────────────────────────────────────────

async function run() {
  log('⚡', 'Flash PR Review starting...')

  // ── Validate env ──
  if (!GEMINI_API_KEY) {
    log('❌', 'GEMINI_API_KEY not set')
    fs.writeFileSync(
      'review-output.md',
      '### ⚡ Flash Review\n\n❌ Review failed: `GEMINI_API_KEY` secret not configured.\n\nAdd it in **Repo → Settings → Secrets → Actions**.'
    )
    return
  }

  // ── Read diff ──
  if (!fs.existsSync('pr.diff')) {
    log('❌', 'pr.diff not found')
    process.exit(1)
  }

  const rawDiff = fs.readFileSync('pr.diff', 'utf8')
  if (rawDiff.trim().length === 0) {
    fs.writeFileSync('review-output.md', '### ⚡ Flash Review\n\n✅ No changes detected.')
    return
  }

  // ── Parse and prioritize files ──
  const allFiles = parseDiff(rawDiff)
  const reviewFiles = filterAndPrioritize(allFiles)
  const filesToReview = reviewFiles.slice(0, MAX_FILES_TO_REVIEW)
  const skippedCount = allFiles.length - filesToReview.length

  log('📄', `${allFiles.length} files in diff, ${filesToReview.length} to review, ${skippedCount} skipped`)

  // ── Read PR metadata ──
  let prMeta = { title: '', author: '', filesChanged: filesToReview.length }
  try {
    if (fs.existsSync('pr-context.json')) {
      prMeta = { ...prMeta, ...JSON.parse(fs.readFileSync('pr-context.json', 'utf8')) }
    }
  } catch (e) {
    log('⚠️', `Could not read PR context: ${e.message}`)
  }

  // ── Review each file ──
  const allFindings = []
  const allInlineComments = []
  let reviewedCount = 0
  let errorCount = 0

  const tasks = filesToReview.map((file) => () => reviewFile(file))

  async function reviewFile(file) {
    const fileDiff = file.content.length > MAX_DIFF_PER_FILE
      ? file.content.slice(0, MAX_DIFF_PER_FILE) + '\n[... diff truncated]'
      : file.content

    log('🔍', `Reviewing: ${file.file}`)

    try {
      const prompt = buildFileReviewPrompt(file.file, fileDiff)
      const response = await callGemini(prompt)
      const comments = parseReviewJSON(response)

      reviewedCount++

      if (comments.length > 0) {
        log('💬', `  → ${comments.length} finding(s) in ${file.file}`)

        allFindings.push({ file: file.file, comments })

        // Build inline comments for GitHub
        for (const c of comments) {
          allInlineComments.push({
            path: file.file,
            line: c.line,
            body: `⚡ **Flash Review**\n\n${c.body}`,
            severity: c.severity || 'suggestion',
          })
        }
      } else {
        log('✅', `  → Clean: ${file.file}`)
      }
    } catch (err) {
      errorCount++
      log('❌', `  → Failed: ${file.file}: ${err.message}`)
    }
  }

  await parallelLimit(tasks, CONCURRENCY)

  log('📊', `Reviewed ${reviewedCount} files, ${errorCount} errors, ${allInlineComments.length} total findings`)

  // ── Generate summary ──
  let summaryMd

  if (allFindings.length === 0 && errorCount === 0) {
    // Clean PR — simple message
    summaryMd = `### ⚡ Flash Review

| Metric | Value |
|---|---|
| **Files Reviewed** | ${reviewedCount} |
| **Risk Level** | 🟢 Low |
| **Issues Found** | None |

✅ This PR looks clean. No security issues, bugs, or significant improvements found.

---

<sub>⚡ Powered by Flash Review</sub>`
  } else {
    // Generate AI summary from findings
    try {
      prMeta.filesChanged = reviewedCount
      const summaryPrompt = buildSummaryPrompt(prMeta, allFindings)
      summaryMd = await callGemini(summaryPrompt)
    } catch (err) {
      log('⚠️', `Summary generation failed: ${err.message}`)
      // Fallback: build a basic summary manually
      const criticalCount = allInlineComments.filter((c) => c.severity === 'critical').length
      const warningCount = allInlineComments.filter((c) => c.severity === 'warning').length
      const suggestionCount = allInlineComments.filter((c) => c.severity === 'suggestion').length

      summaryMd = `### ⚡ Flash Review

| Metric | Value |
|---|---|
| **Files Reviewed** | ${reviewedCount} |
| **Risk Level** | ${criticalCount > 0 ? '🔴 High' : warningCount > 0 ? '🟡 Medium' : '🟢 Low'} |
| **Issues Found** | 🚨 ${criticalCount} Critical · ⚠️ ${warningCount} Warnings · 💡 ${suggestionCount} Suggestions |

See inline comments for details.

---

<sub>⚡ Powered by Flash Review</sub>`
    }
  }

  if (errorCount > 0) {
    summaryMd += `\n\n> ⚠️ **Note:** ${errorCount} file(s) could not be reviewed due to API errors.`
  }

  // ── Write outputs ──
  fs.writeFileSync('review-output.md', summaryMd)
  fs.writeFileSync('inline-comments.json', JSON.stringify(allInlineComments, null, 2))

  log('✅', 'Review complete!')
  log('📝', `Summary → review-output.md`)
  log('💬', `Inline comments → inline-comments.json (${allInlineComments.length} comments)`)
}

run().catch((err) => {
  log('💥', `Unhandled error: ${err.message}`)
  fs.writeFileSync(
    'review-output.md',
    `### ⚡ Flash Review\n\n❌ Review failed unexpectedly: ${err.message}\n\nRe-run the workflow to retry.`
  )
  process.exit(1)
})
