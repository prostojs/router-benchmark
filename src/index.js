import { ExpressInterface } from "./routers/express.js";
import { FindMyWayInterface } from "./routers/find-my-way.js";
import { ProstoRouterInterface } from "./routers/prosto-router.js";
import { routes } from "./routes.js";
import { tests } from "./tests.js";
import { getOpsSec, now, operations } from "./utils.js";
import { table, op, not } from 'arquero';

const routerInterfaces = [
    ExpressInterface,
    FindMyWayInterface,
    ProstoRouterInterface,
]

const tableRows = {
    'Test Name': [],
}

for (let t = 0; t < 5; t++) {
    console.log('Run #' + (t + 1) + ' ====================')
    main(t)
}
table(tableRows)
    .groupby('Test Name')
    .rollup({
        'Express avg op/s':  d => op.round(op.average(d['Express avg op/s'])),
        'FindMyWay avg op/s':  d => op.round(op.average(d['FindMyWay avg op/s'])),
        'ProstoRouter avg op/s':  d => op.round(op.average(d['ProstoRouter avg op/s'])),
    })
    .print(10)

function main(t) {

    for (let i = 0; i < routerInterfaces.length; i++) {
        const ri = new routerInterfaces[i]();
        
        ri.init()
        ri.registerRoutes(routes)

        console.log('Testing ' + ri.getName() + '... run #' + t)

        for (let j = 0; j < tests.length; j++) {
            const { name, urls } = tests[j];
            if (i === 0) {
                tableRows['Test Name'].push(name)
            }
            const row = tableRows[ri.getName() + ' avg op/s'] = tableRows[ri.getName() + ' avg op/s'] || []
            // console.log('\t->' + name)
            let time = now()
            const count = (operations / urls.length)
            for (let o = 0; o < count; o++) {
                for (let k = 0; k < urls.length; k++) {
                    const url = urls[k];
                    ri.lookup(...url)
                }
            }
            // print(name + ':', time)
            row.push(getOpsSec(now() - time))
        }

    }
}
