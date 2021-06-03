# embp发布历史

# V1.2.0 升级内容:2021-0603
- 1.新增支持数据库字段的空串及非空串查询条件支持。

# V1.1.0 升级内容:2020-1019
- 重构BaseController;
- 升级Common-base 1.0.0===>1.1.0,移除了jpa的依赖;

# V1.0.0 第一版本:2020-0908
说明：embp就是对MybatisPlus框架的进一步封装，很多功能实现同ejpa4.0.0版本，只有少部分有差异:
- 没有引入QueryDSL依赖及功能;
- 暂时没有引入多租户过滤器的功能;
- 高级搜索支持NOT IN查询(仅后台，界面为了一致不体现)，ejpa默认不支持；

Github源码: https://github.com/vip-efactory/embp  
测试及使用案例:https://github.com/vip-efactory/embp-example
