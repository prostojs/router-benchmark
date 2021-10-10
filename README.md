# router-benchmark

Benchmark of the most commonly used http routers.

Tested routers:

- [find-my-way (fastify)](https://github.com/delvedor/find-my-way)
- [express](https://www.npmjs.com/package/express)
- [prosto-router](https://github.com/prostojs/prosto-router)

This benchmarks aims to test only http routers, so the method handling should be included.

## Results
```
┌────────────────────────┬────────────────┬──────────────────┬─────────────────────┐
│       Test Name        │Express avg op/s│FindMyWay avg op/s│ProstoRouter avg op/s│
├────────────────────────┼────────────────┼──────────────────┼─────────────────────┤
│     'short static'     │    1 912 325   │     8 646 156    │       7 333 618     │
│'static with same radix'│    1 593 926   │     4 403 402    │       7 732 660     │
│    'dynamic route'     │    1 002 050   │     1 876 701    │       2 381 475     │
│ 'mixed static dynamic' │      828 871   │     2 950 338    │       2 793 158     │
│     'long static'      │      850 917   │     6 289 962    │       6 252 294     │
│       'wildcard'       │      580 003   │     3 001 243    │       2 546 844     │
│     'all together'     │      150 905   │       599 649    │         649 285     │
└────────────────────────┴────────────────┴──────────────────┴─────────────────────┘
```

## How the benchmark is taken

To emulate a real world situation every router registers the following routes:
```
{ method: 'GET', url: '/user' },
{ method: 'GET', url: '/user/comments' },
{ method: 'GET', url: '/user/avatar' },
{ method: 'GET', url: '/user/lookup/username/:username' },
{ method: 'GET', url: '/user/lookup/email/:address' },
{ method: 'GET', url: '/event/:id' },
{ method: 'GET', url: '/event/:id/comments' },
{ method: 'POST', url: '/event/:id/comment' },
{ method: 'GET', url: '/map/:location/events' },
{ method: 'GET', url: '/status' },
{ method: 'GET', url: '/very/deeply/nested/route/hello/there' },
{ method: 'GET', url: '/static/*' }
```
Then the following routes are tested:
```
short static: { method: 'GET', url: '/user' }
static with same radix: { method: 'GET', url: '/user/comments' }
dynamic route: { method: 'GET', url: '/user/lookup/username/john' }
mixed static dynamic: { method: 'GET', url: '/event/abcd1234/comments' },
long static: { method: 'GET', url: '/very/deeply/nested/route/hello/there' },
wildcard: { method: 'GET', url: '/static/index.html' }
all together: all the above at the same time
```
Every test is executed 100 000 times by five tries, the time is taken with `process.hrtime()`, the final result is expressed in operations avg per second.
