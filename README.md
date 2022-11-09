# router-benchmark

Benchmark of the most commonly used http routers.

Tested routers:

- [find-my-way (fastify)](https://github.com/delvedor/find-my-way)
- [express](https://www.npmjs.com/package/express)
- [@prostojs/router](https://github.com/prostojs/router)
- [radix3](https://github.com/unjs/radix3)

This benchmarks aims to test only http routers, so the method handling should not be included.

## Results

|Test Name|Express avg op/ms|FindMyWay avg op/ms|ProstoRouter avg op/ms|Radix3 avg op/ms|
|:-|-:|-:|-:|-:|
|Short static|1 792|7 070|6 912|10 326|
|Static with same radix|1 388|4 662|8 537|14 058|
|Dynamic route|739|1 768|1 888|959|
|Mixed static dynamic|685|3 101|3 470|988|
|Long static|637|2 174|8 934|14 000|
|Wildcard|486|2 081|2 065|1 019|
|**All together**|**663**|**2 328**|**2 893**|**1 549**|


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
            ['GET', '/a/b/c/d/e/f/g/h/i/j/k/l/m/n/o/p/q/r/s/t/u/v/w/x'],
        ]
    },
    {
        name: 'wildcard',
        urls: [
            ['GET', '/static/index.html'],
            ['GET', '/static/favicon.ico'],
            ['GET', '/static/some%20file.xml'],
            ['GET', '/static/some%20file%20with%20many%20spaces.xml'],
        ]
    },
    {
        name: 'all together',
        urls: [
            ['GET', '/user'],
            ['GET', '/user/comments'],
            ['GET', '/user/reviews'],
            ['GET', '/user/lookup/username/john'],
            ['GET', '/user/lookup/name/John%20/Doe'],
            ['GET', '/event/abcd1234/comments'],
            ['GET', '/user/very/deeply/nested/route/hello/there/super/long'],
            ['GET', '/a/b/c/d/e/f/g/h/i/j/k/l/m/n/o/p/q/r/s/t/u/v/w/x'],
            ['GET', '/static/index.html'],
            ['GET', '/static/favicon.ico'],
            ['GET', '/static/some%20file.xml'],
            ['GET', '/static/some%20file%20with%20many%20spaces.xml'],
        ]
    }
```
Every test is executed 200 000 times by five tries, the time is taken with `process.hrtime()`, the final result is expressed in operations avg per second.
