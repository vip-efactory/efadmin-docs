module.exports = {
    // 插件
    plugins: {
        // 'vuepress-plugin-comment': {    // 不踏实，不敢用
        //     choosen: 'valine',
        //     // options选项中的所有参数，会传给Valine的配置
        //     options: {
        //         el: '#valine-vuepress-comment',
        //         appId: 'slnTcOTAPQVydGNesVApRUcg-gzGzoHsz',
        //         appKey: 'Aeusc62FpStk4K4yVAiFonnU'
        //     }
        // },
        '@vuepress/back-to-top': {}
    },
    // 头部
    head: [
        ['meta', { name: 'viewport', content: 'width=device-width,initial-scale=1,user-scalable=no' }],
        ['link', { rel: 'icon', href: '/logo/small.png' }],
        // 访问统计
        ['script', {}, `
        var _hmt = _hmt || [];
        (function() {
            var hm = document.createElement("script");
            hm.src =  "https://hm.baidu.com/hm.js?d4a6b3d1d9a221923e86ec9302f6d995";
            var s = document.getElementsByTagName("script")[0];
            s.parentNode.insertBefore(hm, s);
        })();
      `]
    ],
    // 网站标题及描述
    title: 'EF-ADMIN',
    description: '一个简单且易上手的Spring boot后台管理框架,支持CRUD，高级搜索，国际化，多租户等功能...',
    // 主题配置
    themeConfig: {
        // 提取markdown中h2 和 h3 标题，显示在侧边栏上。
        sidebarDepth: 2,
        // 文档更新时间
        lastUpdated: '更新时间',
        // logo
        logo: '/logo/small.png',
        nav: [
            { text: '指南', link: '/guide/'},
            { text: 'EJPA', link: '/ejpa/'},
            { text: 'EMBP', link: '/embp/'},
            { text: '捐赠', link: '/donation/'},
            { text: 'v2.x', link: '/version/V2.x/'},
            { text: '体验', link: 'http://efadmin.ddbin.com'},
            // { text: '博客', link: 'https://www.ydyno.com/'},
            // 下拉列表
            {
                text: '项目地址',
                items: [
                    {
                        text: '前端',
                        link: 'https://github.com/vip-efactory/efadmin-ui'
                    },
                    {
                        text: '后端',
                        link: 'https://github.com/vip-efactory/efadmin'
                    }
                ]
            }
        ],
        sidebar: {
            '/guide/': [
                {
                    title: '指南',
                    collapsable: false,
                    children: [
                        '/guide/',
                        '/guide/kslj',
                        '/guide/ksks',
                        '/guide/hdsc',
                        '/guide/qdsc',
                        '/guide/xmbs',
                        '/guide/bdict',
                        '/guide/fakeDelete',
                        '/guide/userAudit',
                        '/guide/dzh',
                        '/guide/dzhfx'

                    ]
                },
                {
                    title: '其它',
                    collapsable: false,
                    children: [
                        '/guide/cjwt',
                        '/guide/rjrz',
                        '/guide/gxdm',
                        '/guide/bqsm'
                    ]
                }
            ],
            '/ejpa/': [
                {
                    title: 'ejpa指南',
                    collapsable: false,
                    children: [
                        // '/ejpa/',
                        '/ejpa/crud',
                        '/ejpa/propertychk',
                        '/ejpa/i18n',
                        '/ejpa/adsearchQD',
                        '/ejpa/adsearchTest',
                        '/ejpa/adsearchYL',
                        '/ejpa/cacheCoherency',
                    ]
                },
                {
                    title: 'ejpa版本历史',
                    collapsable: false,
                    children: [
                        '/ejpa/version'
                    ]
                }
            ],
            '/embp/': [
                {
                    title: 'embp版本历史',
                    collapsable: false,
                    children: [
                        '/embp/version'
                    ]
                }
            ],
            '/donation/': [
                '/donation/',

            ],
            '/version/': [
                'V2.x',
            ]
        },
        // 假如你的文档仓库和项目本身不在一个仓库：
        docsRepo: 'vip-efactory/efadmin-docs',
        // 假如文档不是放在仓库的根目录下：
        docsDir: 'docs',
        // 默认是 false, 设置为 true 来启用
        editLinks: true,
        // 默认为 "Edit this page"
        editLinkText: '在 GitHub 上编辑此页！'
    }
}

