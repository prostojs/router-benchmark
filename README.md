# router-benchmark

Benchmark of the most commonly used http routers.

Tested routers:

- [find-my-way (fastify)](https://github.com/delvedor/find-my-way)
- [express](https://www.npmjs.com/package/express)
- [prosto-router](https://github.com/prostojs/prosto-router)

This benchmarks aims to test only http routers, so the method handling should not be included.

## Results
```
┌──────────────────────────┬──────────────────┬────────────────────┬───────────────────────┐
│        Test Name         │ Express avg op/s │ FindMyWay avg op/s │ ProstoRouter avg op/s │
├──────────────────────────┼──────────────────┼────────────────────┼───────────────────────┤
│      'short static'      │     2 038 705    │      9 845 863     │       12 033 033      │
│ 'static with same radix' │     1 429 513    │      4 648 899     │       16 516 231      │
│     'dynamic route'      │       752 883    │      1 763 378     │        2 035 768      │
│  'mixed static dynamic'  │       746 858    │      3 374 320     │        3 982 142      │
│      'long static'       │       728 834    │      3 900 218     │       15 066 149      │
│        'wildcard'        │       531 119    │      2 947 204     │        2 508 523      │
│      'all together'      │       790 766    │      3 186 281     │        5 036 080      │
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
