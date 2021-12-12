# 项目集成对QueryDSL的支持
```
    项目已经集成并配置了QueryDSL的框架，方便使用。
    QueryDSL结合JPA使用的关键是JPAQueryFactory类，这个类实例已经CRUD的service层注入了。
```

## 初始化QueryDSL工厂
具体代码在BaseServiceImpl中，下面是相关的部分：
```java
    @PersistenceContext
    protected EntityManager em;

    // QueryDSL查询工厂实体
    protected JPAQueryFactory queryFactory;

    //实例化QueryDSL的JPAQueryFactory
    @PostConstruct
    public void initFactory() {
        queryFactory = new JPAQueryFactory(em);
    }
```
上面的queryFactory工厂实例在项目运行时就会被初始化，下面给两个使用的简单例子。

## 使用QueryDSL案例：
```java
   /**
     * 获取指定id之后的数据
     *
     * @param ua 当前活动
     * @return UnionActivity
     */
    @Override
    public UnionActivity findNextById(UnionActivity ua) {
        QUnionActivity qua = QUnionActivity.unionActivity;
        return queryFactory.select(qua)
                .from(qua)
                .where(qua.releaseDate.after(ua.getReleaseDate()).and(qua.state.eq(true)).and(qua.cateId.eq(ua.getCateId())))
                .limit(1)
                .orderBy(qua.releaseDate.asc()).fetchOne();

    }

    /**
     * 获取指定id之前的数据
     *
     * @param ua 当前活动
     * @return UnionActivity
     */
    @Override
    public UnionActivity findPreviousById(UnionActivity ua) {
        QUnionActivity qua = QUnionActivity.unionActivity;
        return queryFactory.select(qua)
                .from(qua)
                .where(qua.releaseDate.before(ua.getReleaseDate()).and(qua.state.eq(true)).and(qua.cateId.eq(ua.getCateId())))
                .limit(1)
                .orderBy(qua.releaseDate.desc()).fetchOne();
    }
```
代码说明：
```aidl
看代码里的from、where、limit等方法名是否非常熟悉，其实就是sql里的用法。
QueryDSL框架会对每一个实体，在编译时生成一个以Q开头的实体作为QueryDSL框架使用，例如Student实体会生成一个QStudent实体。
```

## QueryDSL简单说明
1.这个框架非常强大，支持大部分的SQL操作，甚至是连表功能；  
2.因为用法同SQL非常像，避免了手写SQL的低级错误导致开发耗时；  
3.当然强大的同时也是要付出代价的，就是会对每一个实体生成框架使用的以Q开头的实体，而这些是需要占用内存的，如果你的内存充裕这其实不算什么问题。

## QueryDSL官网
以上仅是简单的入门使用说明，三言两语难以尽说，下面是官网的文档地址，各位自己探索吧。   
官网：[https://querydsl.com/](https://querydsl.com/)  
文档：[https://querydsl.com/static/querydsl/5.0.0/reference/html_single/](https://querydsl.com/static/querydsl/5.0.0/reference/html_single/)  
看不来英文的朋友，使用谷歌浏览器打开，右键翻译为中文即可。
