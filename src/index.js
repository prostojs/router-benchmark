import { ExpressInterface } from "./routers/express.js";
import { FindMyWayInterface } from "./routers/find-my-way.js";
import { ProstoRouterInterface } from "./routers/prosto-router.js";
import { routes } from "./routes.js";
import { tests } from "./tests.js";
import { getOpsMs, now, operations } from "./utils.js";
import { table, op } from 'arquero';
import { ProstoRouterWCacheInterface } from "./routers/prosto-router-w-cache.js";
import { Radix3RouterInterface } from "./routers/radix3-router.js";

const routerInterfaces = [
    ExpressInterface,
    FindMyWayInterface,
    ProstoRouterInterface,
    Radix3RouterInterface,
    // ProstoRouterWCacheInterface,
]
const tableRows = {
    'Test Name': [],
}

main()

async function main() {

    const tries = 5

    for (let t = 0; t < tries; t++) {
        console.log('Run #' + (t + 1) + ' of ' + tries + ' ====================')
        run(t)
    }

    console.log(
    table(tableRows)
    .groupby('Test Name')
    .rollup({
        'Express avg op/ms':  d => op.round(op.average(d['Express avg op/ms'])),
        'FindMyWay avg op/ms':  d => op.round(op.average(d['FindMyWay avg op/ms'])),
        'ProstoRouter avg op/ms':  d => op.round(op.average(d['ProstoRouter avg op/ms'])),
        'Radix3 avg op/ms':  d => op.round(op.average(d['Radix3 avg op/ms'])),
        // 'ProstoRouter w/CACHE avg op/ms':  d => op.round(op.average(d['ProstoRouter w/CACHE avg op/ms'])),
    })
    .toMarkdown()
    )
}

function run(t) {

    for (let i = 0; i < routerInterfaces.length; i++) {
        const ri = new routerInterfaces[i]();
        
        ri.init()
        ri.registerRoutes(routes)

        console.log('Testing ' + ri.getName() + '... run #' + (t + 1))

        for (let j = 0; j < tests.length; j++) {
            const { name, urls } = tests[j];
            if (i === 0) {
                tableRows['Test Name'].push(name)
            }
            const row = tableRows[ri.getName() + ' avg op/ms'] = tableRows[ri.getName() + ' avg op/ms'] || []
            // console.log('\t->' + name)
            const count = (operations / urls.length)
            let time = now()
            for (let o = 0; o < count; o++) {
                for (let k = 0; k < urls.length; k++) {
                    const url = urls[k];
                    ri.lookup(...url)
                }
            }
            row.push(getOpsMs(now() - time))
        }
    }
}
