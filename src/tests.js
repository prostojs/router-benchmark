export const tests = [
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
]