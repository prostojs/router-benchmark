export const tests = [
    {
        name: 'short static',
        urls: [['GET', '/user']]
    },
    {
        name: 'static with same radix',
        urls: [['GET', '/user/comments']]
    },
    {
        name: 'dynamic route',
        urls: [['GET', '/user/lookup/username/john']]
    },
    {
        name: 'mixed static dynamic',
        urls: [['GET', '/event/abcd1234/comments']]
    },
    {
        name: 'long static',
        urls: [['GET', '/very/deeply/nested/route/hello/there']]
    },
    {
        name: 'wildcard',
        urls: [['GET', '/static/index.html']]
    },
    {
        name: 'all together',
        urls: [
            ['GET', '/user'],
            ['GET', '/user/comments'],
            ['GET', '/user/lookup/username/john'],
            ['GET', '/event/abcd1234/comments'],
            ['GET', '/very/deeply/nested/route/hello/there'],
            ['GET', '/static/index.html'],
        ]
    }
]