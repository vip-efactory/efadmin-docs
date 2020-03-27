# 部署项目
本项目可以使用 `tomcat` 或者 `ngnix` 部署，在这里分享下 使用 `nginx` 部署前后端的步骤

## 后端部署

### 1、修改配置文件

按需修改我们的 ```application-prod.yml```
```yaml
#配置数据源
spring:
  datasource:
    druid:
      db-type: com.alibaba.druid.pool.DruidDataSource
      driverClassName: net.sf.log4jdbc.sql.jdbcapi.DriverSpy
      url: jdbc:log4jdbc:mysql://localhost:3306/db_efadmin?serverTimezone=Asia/Shanghai&characterEncoding=utf8&useSSL=false
      username: root
      password: 123456

      # 初始化配置
      initial-size: 3
      # 最小连接数
      min-idle: 3
      # 最大连接数
      max-active: 15
      # 获取连接超时时间
      max-wait: 5000
      # 连接有效性检测时间
      time-between-eviction-runs-millis: 90000
      # 最大空闲时间
      min-evictable-idle-time-millis: 1800000
      test-while-idle: true
      test-on-borrow: false
      test-on-return: false
      validation-query: select 1
      # 配置监控统计拦截的filters
      filters: stat

      stat-view-servlet:
        url-pattern: /druid/*
        reset-enable: false
        login-username: admin
        login-password: 123456

      web-stat-filter:
        url-pattern: /*
        exclusions: "*.js,*.gif,*.jpg,*.bmp,*.png,*.css,*.ico,/druid/*"

  #配置 Jpa
  jpa:
    hibernate:
      # 生产环境设置成 none，避免程序运行时自动更新数据库结构
      ddl-auto: none

#jwt
jwt:
  header: Authorization
  # 令牌前缀
  token-start-with: Bearer
  # 必须使用最少88位的Base64对该令牌进行编码
  base64-secret: ZmQ0ZGI5NjQ0MDQwY2I4MjMxY2Y3ZmI3MjdhN2ZmMjNhODViOTg1ZGE0NTBjMGM4NDA5NzYxMjdjOWMwYWRmZTBlZjlhNGY3ZTg4Y2U3YTE1ODVkZDU5Y2Y3OGYwZWE1NzUzNWQ2YjFjZDc0NGMxZWU2MmQ3MjY1NzJmNTE0MzI=
  # 令牌过期时间 此处单位/毫秒 ，默认2小时，可在此网站生成 https://www.convertworld.com/zh-hans/time/milliseconds.html
  token-validity-in-seconds: 7200000
  # 在线用户key
  online-key: online-token
  # 验证码
  code-key: code-key

#是否允许生成代码，生产环境设置为false
generator:
  enabled: false

#如果生产环境要开启swagger，需要配置请求地址
#springfox:
#  documentation:
#    swagger:
#      v2:
#        host: # 接口域名或外网ip

#是否开启 swagger-ui
swagger:
  enabled: false

# 文件存储路径
file:
  path: /home/efadmin/file/
  avatar: /home/efadmin/avatar/
  # 文件大小 /M
  maxSize: 100
  avatarMaxSize: 5
```
### 2、打包项目

我们需要将项目打包并且上传到服务器
- 第一步，在项目的根目录运行命令打包：
 ```
 mvn clean install -DskipTests
 将install 换为package也可以
 ```
 这样在efadmin-system项目的target下就会生成类似这样的jar包：efadmin-system-2.0.0.jar
 这样在efadmin-monitor项目的target下就会生成类似这样的jar包：efadmin-monitor-1.0.0.jar

- 第二步将jar包上传到服务器上的指定目录  
  -- 类unix的系统上  
  在终端里可以使用scp命令将jar包复制到远端服务器上:
  ```
   scp -v efadmin-system-2.0.0.jar root@efadmin.ddbin.com:/root/efadmin
  ```
  -- 在Windows上  
  若安装了git工具，会自带git bash，在git bash里也可以使用scp命令  
  也可以使用XShell等图形化工具


### 3、编写启动脚本

编写脚步操作 ```java``` 服务

(1) **启动脚本** ```startEFAdmin.sh ```<br>
```
[root@izbp15hwdrnw2ao efadmin]# cat startEFAdmin.sh 
#!/bin/bash
#这里可替换为你自己的执行程序，其他代码无需更改
APP_NAME=efadmin-system-2.0.0.jar
MONITOR_NAME=efadmin-monitor-1.0.0.jar

rm -f nohup.out
 
appPid=$(ps -ef | grep $APP_NAME  | grep -v grep | awk '{ print $2 }')
monitorPid=$(ps -ef | grep $MONITOR_NAME  | grep -v grep | awk '{ print $2 }')

if [ "${appPid}" != "" ]; then	
		kill -9 ${appPid}
		echo "进程pid:${appPid}已结束！"
fi
 
if [ "${monitorPid}" != "" ]; then	
		kill -9 ${monitorPid}
		echo "进程pid:${monitorPid}已结束！"
fi
nohup java -jar $APP_NAME --spring.profiles.active=prod &>>nohup.out &
nohup java -jar $MONITOR_NAME --spring.profiles.active=prod &>>nohup.out &

sleep 3

tail -f nohup.out
```
(2) **执行启动脚本** ```startEFAdmin.sh ```<br>
```
# 启动后端java服务
./startEFAdmin.sh
```
### 4、配置 ```ngnix```

我们可以使用 ```ngnix``` 代理 ```java```服务，添加配置
附一份完整的未经优化的配置可运行的样例：
```
user  nginx;
worker_processes  1;

error_log  /var/log/nginx/error.log warn;
pid        /var/run/nginx.pid;

events {
    worker_connections  1024;
}

http {
    client_max_body_size  501m;
    server {
      listen 80;
      server_name efadmin-ui;
      root  /usr/share/nginx/html/;
      # 避免刷新访问出现404的问题
      location / {
         try_files $uri $uri/ @router;
         index index.html;
      }
      location @router {
        rewrite ^.*$ /index.html last;
      }
      # 以auth|api|avatar开头的请求发送到后端服务上
      location ~* ^/(auth|api|avatar) {
        proxy_pass http://172.16.241.85:8000;
        #proxy_set_header Host $http_host;
        proxy_connect_timeout 150s;
        proxy_send_timeout 150s;
        proxy_read_timeout 150s;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      }
     }

    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                      '$status $body_bytes_sent "$http_referer" '
                      '"$http_user_agent" "$http_x_forwarded_for"';

    access_log  /var/log/nginx/access.log  main;

    sendfile        on;
    #tcp_nopush     on;
    keepalive_timeout  650;
    #gzip  on;
    include /etc/nginx/conf.d/*.conf;
}
```

## 前端部署
### 1、修改接口地址
.env.production文件接口修改，以下为同机部署的接口样例
```
ENV = 'production'

# 接口地址，注意协议，如果你没有配置 ssl，需要将 https 改为 http
VUE_APP_BASE_API  = 'http://efadmin.ddbin.com'
# 如果接口是 http 形式， wss 需要改为 ws
VUE_APP_WS_API = 'ws://efadmin.ddbin.com'
```

::: tip 注意：``` 如果是IP需设置外网IP``` :::
### 2、打包项目
不管是将项目部署到 ```ngnix``` 还是其他服务器，都需要先将项目打包
 ```
 npm run build
```
### 3、上传文件
打包完成后会在根目录生成 ```dist```
文件夹，我们需要将他里面的所有文件上传到服务器上的nginx的web根目录：/usr/share/nginx/html，

重载 ```nginx``` 配置后，访问你的域名或者IP地址即可

## 注意事项
```
1.如果前后端部署在同一台机器上，则不需要对外暴露后端的端口，内部nginx转发即可
2.如果前后端部署没有问题，但是不可访问，需要检查本机的防火墙、selinux等配置是否影响了，如果是阿里云服务器还要在阿里的防火墙上开放对应的端口。
3.如果是docker版的nginx，一定要确认在docker容器里目标域名是否可以解析访问！
```



