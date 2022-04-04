# 介绍
<center><h1>EF-ADMIN 后台管理系统</h1></center>
<center><p>EF-ADMIN最初是基于EL-ADMIN项目演化而来的项目，目前绝大多数特征和EL—ADMIN是一致的</p></center>
<center><p>EF-ADMIN基于 Spring Boot 2.5.6 、 Spring Boot Jpa| -ejpa、 JWT、Spring Security、Redis、Vue的前后端分离的后台管理系统，同时因为EF-ADMIN使用了ejpa框架，因此具有模板式的CRUD接口以及多条件高级搜索及国际化等功能。</p></center>
<center>

[![star](https://github.com/vip-efactory/efadmin/badge/star.svg?theme=white)](https://github.com/vip-efactory/efadmin)
[![GitHub stars](https://img.shields.io/github/stars/vip-efactory/efadmin.svg?style=social&label=Stars)](https://github.com/vip-efactory/efadmin)
[![GitHub forks](https://img.shields.io/github/forks/vip-efactory/efadmin.svg?style=social&label=Fork)](https://github.com/vip-efactory/efadmin)

</center>

::: tip  
本人经历Mybatis及MybatisPlus项目比较多，也体会到很多不便捷之处，所以更偏爱SpringDataJPA这一套框架，为此还专门封装了一套ejpa的框架，  
ejpa框架：  
有一套基础的CRUD的实现；  
常见的高频操作的接口；  
利用泛型及反射实现的多条件高级搜索功能；  
接口国际化功能；  
Entity属性校验功能；  
...  
:::

### 在线体验-管理多租户
可以管理其他租户的数据源
<https://efadmin.ddbin.com:1443/>  
用户名密码：root/123456
### 租户1
<https://t1.ddbin.com:1443/>  
用户名密码：admin1/123456
### 租户2
<https://t2.ddbin.com:1443/>  
用户名密码：admin2/123456
### 注意:
- A.两个租户的https证书使用的是efadmin.ddbin.com域名的，所以访问时，谷歌浏览器会说证书无效，信任即可!
- B.因阿里云服务器宽带仅1M,即理论最大128K/s文件传输速度,因此登录可能会慢一些，请知悉。

### 项目源码

|        | 后端源码                                                                            | 前端源码                                                                                  |
|:-------|:-----------------------------------------------------------------------------------|:-----------------------------------------------------------------------------------------|
| Github | [https://github.com/vip-efactory/efadmin](https://github.com/vip-efactory/efadmin) | [https://github.com/vip-efactory/efadmin-ui](https://github.com/vip-efactory/efadmin-ui) |

### 反馈交流
如果在使用中遇到什么问题可以在 github上提
[issues](https://github.com/vip-efactory/efadmin/issues) ，或者给发送邮件
1797890817@qq.com

也可以加入项目讨论群： 601693868
