import { ExpressInterface } from "./routers/express.js";
import { FindMyWayInterface } from "./routers/find-my-way.js";
import { ProstoRouterInterface } from "./routers/prosto-router.js";
import { routes as longRoutes } from "./routes.js";
import { tests as longTests } from "./tests.js";
import { getOpsMs, now, operations } from "./utils.js";
import { Rou3RouterInterface } from "./routers/rou3-router.js";
import { HonoRouterInterface } from "./routers/hono-router.js";
import { generateShortRoutes, generateShortTests } from "./generate-short-routes.js";
import { generateMixedRoutes, generateMixedTests } from "./generate-mixed-routes.js";
import { writeResultFiles, generateBarChart } from "bench-utils";

const routerInterfaces = [
    ExpressInterface,
    FindMyWayInterface,
    ProstoRouterInterface,
    Rou3RouterInterface,
    HonoRouterInterface,
]

main()

async function main() {
    const tries = 2
    const routeCount = longRoutes.length // 22

    // Build variant configs
    const shortRoutes = generateShortRoutes(routeCount)
    const shortTests = generateShortTests(shortRoutes).map(u => ({ method: u[0], url: u[1] }))
    const mixedRoutes = generateMixedRoutes(routeCount)
    const mixedTestUrls = generateMixedTests(mixedRoutes)

    const variants = [
        {
            name: 'short',
            label: 'Short Routes (2–5 segments)',
            description: 'Shallow paths like `/users/:id`, `/posts/:id/comments`.',
            routes: shortRoutes,
            tests: [{ name: 'All together', urls: shortTests.map(r => [r.method, r.url]) }],
        },
        {
            name: 'long',
            label: 'Long Routes (deep enterprise API)',
            description: 'Deep paths like `/api/v1/organizations/:orgId/workspaces/:wsId/projects/:projectId`.',
            routes: longRoutes,
            tests: longTests,
        },
        {
            name: 'mixed',
            label: 'Mixed Routes (short + long)',
            description: 'Half short (2–5 segments) + half long (deep enterprise API) routes.',
            routes: mixedRoutes,
            tests: [{ name: 'All together', urls: mixedTestUrls }],
        },
    ]

    // results[variant][routerName][testName] = [ops/ms values per run]
    const allResults = {}

    for (const variant of variants) {
        console.log('\n' + '█'.repeat(60))
        console.log(`  ${variant.label} — ${variant.routes.length} routes`)
        console.log('█'.repeat(60))

        const results = {}
        allResults[variant.name] = results

        for (let t = 0; t < tries; t++) {
            console.log('Run #' + (t + 1) + ' of ' + tries + ' ====================')
            run(variant.routes, variant.tests, results)
        }

        // Build averaged table: { testName: { 'Router avg op/ms': number, ... } }
        const tableData = {}
        for (const [routerName, testMap] of Object.entries(results)) {
            for (const [testName, values] of Object.entries(testMap)) {
                if (!tableData[testName]) tableData[testName] = {}
                tableData[testName][routerName + ' avg op/ms'] = Math.round(values.reduce((a, b) => a + b, 0) / values.length)
            }
        }

        console.log(`\n## ${variant.label} — Results\n`)
        console.table(tableData)

        // Summary: use "All together" score (matches scale bench methodology)
        const summary = Object.entries(results).map(([routerName, testMap]) => {
            const allTogether = testMap['All together']
            const avg = allTogether
                ? Math.round(allTogether.reduce((a, b) => a + b, 0) / allTogether.length)
                : Math.round(Object.values(testMap).map(v => v.reduce((a, b) => a + b, 0) / v.length).reduce((a, b) => a + b, 0) / Object.keys(testMap).length)
            return { name: routerName, avg }
        }).sort((a, b) => b.avg - a.avg)

        printSummary(summary, 'op/ms', variant.label)
    }

    // Write combined result files
    writeAllResults(allResults, tries, variants)
}

function writeAllResults(allResults, tries, variants) {
    const pkgDir = new URL('..', import.meta.url).pathname
    const svgCharts = {}

    let md = `# Router Benchmark Results\n\n`
    md += `Three route-shape variants tested at ${variants[0].routes.length} routes each.\n\n`
    md += `- **${operations}** operations per test\n`
    md += `- **${tries}** runs averaged\n`
    md += `- Generated: ${new Date().toISOString()}\n\n`
    md += `---\n\n`

    const jsonVariants = {}

    for (const variant of variants) {
        const results = allResults[variant.name]
        const routerNames = Object.keys(results)

        // Build averaged table
        const tableData = {}
        for (const [routerName, testMap] of Object.entries(results)) {
            for (const [testName, values] of Object.entries(testMap)) {
                if (!tableData[testName]) tableData[testName] = {}
                tableData[testName][routerName] = Math.round(values.reduce((a, b) => a + b, 0) / values.length)
            }
        }

        // Summary: use "All together" score (matches scale bench methodology)
        const summary = Object.entries(results).map(([routerName, testMap]) => {
            const allTogether = testMap['All together']
            const avg = allTogether
                ? Math.round(allTogether.reduce((a, b) => a + b, 0) / allTogether.length)
                : Math.round(Object.values(testMap).map(v => v.reduce((a, b) => a + b, 0) / v.length).reduce((a, b) => a + b, 0) / Object.keys(testMap).length)
            return { name: routerName, avg }
        }).sort((a, b) => b.avg - a.avg)

        const fastest = summary[0]

        // SVG bar chart
        const chartFilename = `results-${variant.name}-chart.svg`
        svgCharts[chartFilename] = generateBarChart(
            summary.map(s => ({ name: s.name, value: s.avg })),
            { title: `${variant.label} — ${variant.routes.length} routes (avg op/ms)`, unit: 'op/ms' },
        )

        // Markdown section
        md += `## ${variant.label}\n\n`
        md += `${variant.description}\n\n`
        md += `![${variant.label}](results/${chartFilename})\n\n`
        md += `### Summary\n\n`
        md += `| Router | avg op/ms | speed |\n`
        md += `|--------|----------|-------|\n`
        for (const entry of summary) {
            const speed = entry === fastest ? 'fastest' : `${(fastest.avg / entry.avg).toFixed(1)}x slower`
            md += `| ${entry.name} | ${entry.avg} | ${speed} |\n`
        }
        md += `\n`

        // Per-test table (only if more than one test)
        if (Object.keys(tableData).length > 1) {
            md += `### Per-Test Results\n\n`
            md += `| Test | ${routerNames.map(n => n + ' op/ms').join(' | ')} |\n`
            md += `|------|${routerNames.map(() => '---------').join('|')}|\n`
            for (const [testName, row] of Object.entries(tableData)) {
                const vals = routerNames.map(n => row[n] ?? '-')
                md += `| ${testName} | ${vals.join(' | ')} |\n`
            }
            md += '\n'
        }

        md += `---\n\n`

        jsonVariants[variant.name] = {
            routeCount: variant.routes.length,
            perTest: tableData,
            summary: Object.fromEntries(summary.map(s => [s.name, s.avg])),
        }
    }

    const jsonData = {
        timestamp: new Date().toISOString(),
        operations,
        tries,
        variants: jsonVariants,
    }

    writeResultFiles(pkgDir, jsonData, md, {
        resultsDir: 'results',
        svgCharts,
    })
}

function printSummary(sorted, unit, label) {
    const fastest = sorted[0]
    console.log(`\n## Summary — ${label}\n`)
    const summaryTable = {}
    for (const entry of sorted) {
        const ratio = fastest.avg / entry.avg
        summaryTable[entry.name] = {
            [`avg ${unit}`]: entry.avg,
            'speed': entry === fastest ? 'fastest' : `${ratio.toFixed(1)}x slower`,
        }
    }
    console.table(summaryTable)

    // Pairwise comparisons
    console.log('')
    for (let i = 0; i < sorted.length; i++) {
        for (let j = i + 1; j < sorted.length; j++) {
            const ratio = (sorted[i].avg / sorted[j].avg).toFixed(1)
            console.log(`  ${sorted[i].name} is ${ratio}x faster than ${sorted[j].name}`)
        }
    }
    console.log('')
}

function run(routes, tests, results) {
    for (let i = 0; i < routerInterfaces.length; i++) {
        const ri = new routerInterfaces[i]();

        ri.init()
        ri.registerRoutes(routes)

        const name = ri.getName()
        if (!results[name]) results[name] = {}

        console.log('Testing ' + name + '...')

        for (let j = 0; j < tests.length; j++) {
            const { name: testName, urls } = tests[j];
            if (!results[name][testName]) results[name][testName] = []

            const count = (operations / urls.length)
            let sink  // prevent dead-code elimination
            let time = now()
            for (let o = 0; o < count; o++) {
                for (let k = 0; k < urls.length; k++) {
                    sink = ri.lookup(...urls[k])
                }
            }
            void sink
            results[name][testName].push(getOpsMs(now() - time))
        }
    }
}
