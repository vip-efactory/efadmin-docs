# embp初衷
- 其实我个人更喜欢SpringDataJpa的这一套持久层框架，所以embp项目早就创建了没有进一步开发。
- 但是发现国内很多人更偏爱Mybatis框架，因此对embp的开发得以继续下来。其实embp和ejpa的很多功能是一致的，不过是换了一套框架实现而已。

# embp框架原理
- 其实就是基于MybatisPlus框架的再封装，同时提供一些常用操作的模板以便使用。
- 从Controller-->Service-->-->Entity,都有相应的模板代码.

# 框架特性(v1.0.0+)
- 基本的CRUD模板，即增删改查操作，此处的查是指正常的分页、排序及id查询；
- 较复杂的多条件的高级查询；
- 提供对持久化实体属性操作检查功能及校验注解的默认信息自动国际化跟随；
- 提供接口的国际化功能；
- 自动跟踪记录的：创建时间、更新时间、创建人、更新人;
- 实现组件联动缓存的一致性维护;
- 更具体文档说明见：/docs下文件

# 相关项目说明
- 国际化实现：https://github.com/vip-efactory/common-i18n
    - 通用国际化功能实现，被embp框架依赖。
- 通用基础实现：https://github.com/vip-efactory/common-base
    - 通用基础信息实现，被embp或ejpa框架共同依赖。
- embp框架项目：https://github.com/vip-efactory/embp
    - embp的主体实现
- embp框架Starter：https://github.com/vip-efactory/embp-spring-boot-starter
    - 封装了embp需要的所有依赖
- embp案例项目：https://github.com/vip-efactory/embp-example
    - embp的使用案例，以及功能是否正常的测试项目

# 如何使用
- 1.引入已发布的starter依赖：

```
    <properties>
        <java.version>1.8</java.version>
        <embp.version>1.0.0</embp.version>
    </properties>
    <dependency>
        <groupId>vip.efactory</groupId>
        <artifactId>embp-spring-boot-starter</artifactId>
        <version>${embp.version}</version>
        <type>pom</type>
    </dependency>
```

- 2.编写application主文件
```
ackage vip.efactory.embp.example;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
public class EjpaExampleApplication {

    public static void main(String[] args) {
        SpringApplication.run(EjpaExampleApplication.class, args);
    }

}
```
- 3.用IDEA运行项目即可

- 更详细使用方式，请参考案例项目：https://github.com/vip-efactory/embp-example

# 测试案例图片
- 测试案例参见：resources/static/usege

# 如何贡献代码
- 克隆代码
    - git clone https://github.com/vip-efactory/common-i18n.git
    - git clone https://github.com/vip-efactory/common-base.git
    - git clone https://github.com/vip-efactory/embp.git
    - git clone https://github.com/vip-efactory/embp-example.git
- Maven编译出本地安装包
    - 在common-i18n项目根目录执行：mvn clean install
    - 在common-base项目根目录执行：mvn clean install
    - 在embp项目根目录执行：mvn clean install
    - 在embp-example项目根目录执行：mvn clean install
- 运行样例项目
    - 在本地的MySQL数据库中创建：db_embp_example,相关的表会在项目运行时自动创建
    - 编译后直接在IDEA中运行embp-example项目即可；
- 若更改common-i18n或embp项目的源码，需要删除本地maven仓库的jar，否则冲突。
    - 清除方式：
        - A.找到本机maven仓库目录，例如我的是：/media/dbdu/BK/m2/repository;
        - B.删除vip目录下的所有文件；
        - C.重新Maven编译出本地安装包即可
- 修改源码增加新特性
- 在github上提交pull请求

# 相关说明：
- 关于校验文件的占位符
    - 实现校验国际化信息里的占位符处理：占位符支持注解的属性占位例如{min}-{max}，不支持{0}-{1}这样的占位，因为校验注解不支持传参，只能使用已有的属性信息当参数。
- 关于案例项目中创建人和更新人为空的问题，是因为没有加持登录功能，所以系统抓不到这两个字段的信息。此功能的效果在efadmin项目中有体现出来。

# 注意
- 请不要直接使用embp项目的master分支代码,在开发中可能非常不稳定,可以使用Maven中央仓库里已发布的starter!

