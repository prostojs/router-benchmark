import { ExpressInterface } from "./routers/express.js";
import { FindMyWayInterface } from "./routers/find-my-way.js";
import { ProstoRouterInterface } from "./routers/prosto-router.js";
import { routes } from "./routes.js";
import { tests } from "./tests.js";
import { getOpsSec, now, operations } from "./utils.js";
import { table, op } from 'arquero';
import { ProstoRouterWCacheInterface } from "./routers/prosto-router-w-cache.js";

const routerInterfaces = [
    ExpressInterface,
    FindMyWayInterface,
    ProstoRouterInterface,
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

    table(tableRows)
    .groupby('Test Name')
    .rollup({
        'Express avg op/s':  d => op.round(op.average(d['Express avg op/s'])),
        'FindMyWay avg op/s':  d => op.round(op.average(d['FindMyWay avg op/s'])),
        'ProstoRouter avg op/s':  d => op.round(op.average(d['ProstoRouter avg op/s'])),
        // 'ProstoRouter w/CACHE avg op/s':  d => op.round(op.average(d['ProstoRouter w/CACHE avg op/s'])),
    })
    .print()
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
            const row = tableRows[ri.getName() + ' avg op/s'] = tableRows[ri.getName() + ' avg op/s'] || []
            // console.log('\t->' + name)
            const count = (operations / urls.length)
            let time = now()
            for (let o = 0; o < count; o++) {
                for (let k = 0; k < urls.length; k++) {
                    const url = urls[k];
                    ri.lookup(...url)
                }
            }
            row.push(getOpsSec(now() - time))
        }
    }
}
