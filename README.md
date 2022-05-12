# router-benchmark

Benchmark of the most commonly used http routers.

Tested routers:

- [find-my-way (fastify)](https://github.com/delvedor/find-my-way)
- [express](https://www.npmjs.com/package/express)
- [@prostojs/router](https://github.com/prostojs/router)

This benchmarks aims to test only http routers, so the method handling should not be included.

## Results
```
┌──────────────────────────┬──────────────────┬────────────────────┬───────────────────────┐
│        Test Name         │ Express avg op/s │ FindMyWay avg op/s │ ProstoRouter avg op/s │
├──────────────────────────┼──────────────────┼────────────────────┼───────────────────────┤
│      'short static'      │     1743397      │      8246369       │        6887158        │
│ 'static with same radix' │     1347875      │      4742362       │        7785178        │
│     'dynamic route'      │      719388      │      1768312       │        1257927        │
│  'mixed static dynamic'  │      698233      │      3359527       │        2190660        │
│      'long static'       │      657112      │      2193211       │        8428374        │
│        'wildcard'        │      501950      │      2841743       │        1663314        │
│      'all together'      │      729731      │      3240736       │        2800958        │
└──────────────────────────┴──────────────────┴────────────────────┴───────────────────────┘

```

## How the benchmark is taken

To emulate a real world situation every router registers the following routes:
```
    { method: 'GET', url: '/user' },
    { method: 'GET', url: '/admin' },
    { method: 'GET', url: '/user/comments' },
    { method: 'GET', url: '/user/avatar' },
    { method: 'GET', url: '/user/rating' },
    { method: 'GET', url: '/user/reviews' },
    { method: 'GET', url: '/user/lookup/username/:username' },
    { method: 'GET', url: '/user/lookup/email/:address' },
    { method: 'GET', url: '/user/lookup/name/:firstName/:lastName' },
    { method: 'GET', url: '/event/:id' },
    { method: 'GET', url: '/event/:id/comments' },
    { method: 'POST', url: '/event/:id/comment' },
    { method: 'GET', url: '/map/:location/events' },
    { method: 'GET', url: '/status' },
    { method: 'GET', url: '/user/very/deeply/nested/route/hello/there/super/long' },
    { method: 'GET', url: '/static/*' }
```
Then the following routes are tested:
```
    {
        name: 'short static',
        urls: [
            ['GET', '/user'],
            ['GET', '/admin'],
        ]
    },
    {
        name: 'static with same radix',
        urls: [
            ['GET', '/user/comments'],
            ['GET', '/user/reviews'],
        ]
    },
    {
        name: 'dynamic route',
        urls: [
            ['GET', '/user/lookup/username/john'],
            ['GET', '/user/lookup/name/John%20/Doe'],
        ]
    },
    {
        name: 'mixed static dynamic',
        urls: [
            ['GET', '/event/abcd1234/comments'],
        ]
    },
    {
        name: 'long static',
        urls: [
            ['GET', '/user/very/deeply/nested/route/hello/there/super/long'],
        ]
    },
    {
        name: 'wildcard',
        urls: [
            ['GET', '/static/index.html'],
            ['GET', '/static/favicon.ico'],
            ['GET', '/static/some%20file.xml'],
        ]
    },
    {
        name: 'all together',
        urls: [
            ['GET', '/user'],
            ['GET', '/user/comments'],
            ['GET', '/user/reviews'],
            ['GET', '/user/lookup/username/john'],
            ['GET', '/event/abcd1234/comments'],
            ['GET', '/user/very/deeply/nested/route/hello/there/super/long'],
            ['GET', '/static/index.html'],
            ['GET', '/user/lookup/name/John/Doe'],
            ['GET', '/static/favicon.ico'],
        ]
    }
```
Every test is executed 200 000 times by five tries, the time is taken with `process.hrtime()`, the final result is expressed in operations avg per second.
