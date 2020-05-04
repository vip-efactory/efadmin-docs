# 多租户实现  

## 1.本文主要分析：
**前端efadmin-ui项目，如何安全的传递租户信息给后端;**  
**后端efadmin项目，不同租户如何根据租户信息不同，来使用不同数据库及redis数据库。**

## 2.对于前端的难点在于：
**如何做到每一个非静态资源的请求都必须带上租户信息。**  
### 开发环境：  
在所有的请求头(包括文件上传请求)中，与token信息一起传递给后端。例如：
src/utils/request.js   只显示相关部分的代码如下：
```js
// request拦截器
service.interceptors.request.use(
  config => {
    if (getToken()) {
      config.headers['Authorization'] = getToken() // 让每个请求携带自定义token 请根据实际情况自行修改
    }
    config.headers['Content-Type'] = 'application/json'
    // 携带国际化区域环境参数
    config.headers['locale'] = store.getters.locale
    // 若是开发环境此处可以写死，如果不想使用多租户此处默认为0就可以了。若是线上部署，此处可以不写，由nginx转发时处理是最好的方式！
    config.headers['TENANT_ID'] = getTenant4Dev()
    return config
  },
  error => {
    // Do something with request error
    console.log(error) // for debug
    Promise.reject(error)
  }
)
```
注意看第11行：利用getTenant4Dev()方法获取租户信息，再看看src/utils/auth.js：
```js
// 获取开发环境的租户信息，注意:开发环境指定租户可以方便测试及开发，正式环境通过nginx全局配置并覆盖此配置。
export function getTenant4Dev() {
  // return Cookies.get(TenantKey)
  return 1 // 此处可以手动指定租户的id,此处为１
}
```
除了正常的请求外，前端通常还有文件上传请求也要携带租户信息：
例如：```<el-upload>```组件都需要配置请求头，例如：
```
              <el-upload
                :show-file-list="false"
                :on-success="handleSuccess"
                :on-error="handleError"
                :headers="headers"
                :action="updateAvatarApi"
                class="avatar-uploader"
              >
                <img :src="user.avatar ? baseApi + '/avatar/' + user.avatar : Avatar" title="点击上传头像" class="avatar">
              </el-upload>
```
注意上面的:headers="headers"部分，在js中的部分是：
```js
 return {
      Avatar: Avatar,
      activeName: 'first',
      saveLoading: false,
      headers: {
        'Authorization': getToken(),
        'TENANT_ID': getTenant4Dev()
      },
      ...省略其他代码...
      }
```

另一个问题来了：这个租户信息哪里来的，其实你要是仔细看上面的代码你就会发现租户信息是硬编码写死的。**写死了不是有很多的缺点吗？**  
别急我来和你慢慢解释。记住现在是开发环境，线上环境不是这样实现的。你可能有疑问我为什么不在登录界面让用户选择租户然后保存起来，最后用上面的方法去取租户信息就好了。很多多租户模式也是这么干的！我不同意，原因有二:  
原因一:让租户信息在登录界面让用户可以选择，就已经增加了安全风险，这是我绝对不允许的，避免！  
原因二:efadmin实现的比较彻底的租户数据隔离方式，就连登录的验证码也是存储在各自的redis数据库里的，又因为原因一的问题，所以登录界面不能选择租户还要验证码正常出来。  
综上:**在开发环境中租户信息是写死的，如果需要变更到其他租户，手动更改值即可！** 接下来我们一起看看线上的环境如何实现。

### 线上环境：
#### 选择租户：
上面的开发环境说了，不允许在登录界面枚举所有的租户信息让用户选择登录，既然不能选择那如何区分多租户呢？答案很简单：**不同的租户使用不同的域名！**  
例如：  
租户1用户使用域名t1.ddbin.com访问自己系统;  
租户2用户使用域名t2.ddbin.com访问自己系统;  
...  

特别说明：  
并不是不同租户域名都要以ddbin.com结尾，以类似其他的比如zkgd.com也是可以的，不过efadmin系统是采用上面的ddbin.com域名的方式。  
如果采用其他不同的域名，就需要有对应的SSL证书给https使用，稍微麻烦一点。
#### Nginx配置：
解决了上面的租户选择问题，再来看看nginx代理转发请求时是如何让后端知道是哪个租户的？关键配置如下：  
```
location ~* ^/(auth|api|avatar|file|webSocket|swagger|v2|csrf|webjars|druid) {
  ## 若nginx安装在Docker里不能使用127.0.0.1，应使用宿主机的IP地址
  proxy_pass http://172.16.241.85:8000;
  #proxy_set_header Host $http_host;
  ## 设定变量默认值为0,即管理租户
  set $tid 0;
  if ( $http_origin ~* (^https://t1.ddbin.com) ) {
    set $tid 1;
  }
  if ( $http_origin ~* (^https://t2.ddbin.com) ) {
    set $tid 2;
  }
  proxy_set_header TENANT_ID $tid;
  proxy_connect_timeout 150s;
  proxy_send_timeout 150s;
  proxy_read_timeout 150s;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "Upgrade";
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-Proto $scheme;
  proxy_set_header X-Forwarded-Port $server_port;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```
说明：上面的
```
  ## 设定变量默认值为0,即管理租户
  set $tid 0;
  if ( $http_origin ~* (^https://t1.ddbin.com) ) {
    set $tid 1;
  }
  if ( $http_origin ~* (^https://t2.ddbin.com) ) {
    set $tid 2;
  }
  proxy_set_header TENANT_ID $tid;
```
这部分代码其实是不难理解的，其实就是**根据不同的租户域名统一设定不同的租户id信息。** 我似乎听到有的朋友在叫嚷了：**这样写不是太烂了吗？要是有20个租户呢？那么多if多丑陋啊！**  
那位朋友你别急，此处仅是演示实现功能而已，若是真正用在项目中固定租户数量是可以的，如果要动态支持新加租户肯定不是这样的写法。要不然每增加一个租户都要来改配置文件也是不可取的，那如何做呢？==当然是不同租户不同的配置文件，然后用include匹配引入啊，这样就保证了灵活性。==  
又有朋友有疑问了，**刚才在开发环境硬编码的租户信息呢？**  
==被覆盖了，就算前端携带租户信息，在此处也会被重新赋值给覆盖掉，所以你不用担心开发环境的硬编码租户信息会导致线上的混乱。==  
更多详细信息参看前端源码：https://github.com/vip-efactory/efadmin-ui

解决了前端租户信息传递的问题，我们再来看看后端如何进行实现。
## 3.后端就是两个关键问题：
> 第一：如何全局有效的拦截获取租户信息而不遗漏;  
> 第二：如何根据租户信息选择对应的数据源及Redis数据库。

## 4.拦截实现的选择：
到底是选择Spring框架的拦截器实现还是原生过滤器方式的实现，其实原则只有一个那就是，**所有的非静态资源请求都必须能拦截到租户信息。**  
### 方式一：Spring拦截器的实现：
```java
package vip.efactory.ejpa.tenant.identifier;
...省略包导入...
/**
 * 租户信息拦截器，如果获取不到就使用默认的租户，目前有两种方式实现，本例还有过滤器的实现！
 */
@Slf4j
public class MultiTenantInterceptor extends HandlerInterceptorAdapter {

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        String tenantId = request.getHeader(TenantConstants.TENANT_ID);
        if (!StringUtils.isEmpty(tenantId)) {
            TenantHolder.setTenantId(Long.parseLong(tenantId));
        } else {
            TenantHolder.setTenantId(TenantConstants.DEFAULT_TENANT_ID);
            // 此处不进行抛出异常，为了兼容非多租户模式，没有就默认为租户0L
            log.info("当前请求中没有租户信息，使用默认的租户ID为:{}", TenantConstants.DEFAULT_TENANT_ID);
        }
        return true;
    }

    @Override
    public void postHandle(HttpServletRequest request, HttpServletResponse response, Object handler, ModelAndView modelAndView) {
        TenantHolder.remove();
    }

}
```
### 方式二：过滤器的实现：
```java
package vip.efactory.ejpa.tenant.identifier;
...省略包导入...
/**
 * 利用过滤器的方式,拦截获取请求中的租户信息，
 * 注意此过滤器的执行优先级要求极高，因为租户信息是非常重要的关键信息，必须最先拿到！！
 */
@Slf4j
@Order(Ordered.HIGHEST_PRECEDENCE)
public class TenantHolderFilter extends GenericFilterBean {

    /**
     * 从请求头中获取指定的租户信息
     */
    @Override
    @SneakyThrows
    public void doFilter(ServletRequest servletRequest, ServletResponse servletResponse, FilterChain filterChain) {
        HttpServletRequest request = (HttpServletRequest) servletRequest;
        HttpServletResponse response = (HttpServletResponse) servletResponse;
        // 获取请求头中的TENANT_ID的值
        String tenantId = request.getHeader(TenantConstants.TENANT_ID);

        if (!StringUtils.isEmpty(tenantId)) {
            TenantHolder.setTenantId(Long.parseLong(tenantId));
        } else {
            TenantHolder.setTenantId(TenantConstants.DEFAULT_TENANT_ID);
            log.info("当前请求中没有租户信息，使用默认的租户ID为:{}", TenantConstants.DEFAULT_TENANT_ID);
        }

        filterChain.doFilter(request, response);
        // 请求结束，移除租户信息
        TenantHolder.remove();
    }
}
```
相关的源码在：https://github.com/vip-efactory/ejpa/tree/master/src/main/java/vip/efactory/ejpa/tenant  
https://github.com/vip-efactory/ejpa/blob/master/src/main/java/vip/efactory/ejpa/config/TenantConfig.java

**afadmin采用的方式二过滤器方式的来拦截租户信息，方式一测试发现会有请求拦截遗漏的问题。**

## 5.租户信息存储
在拦截到租户信息后，将租户信息保存在TenantHolder中，这样在需要时可以获取！TenantHolder内容如下：  
```java
package vip.efactory.ejpa.tenant.identifier;

import com.alibaba.ttl.TransmittableThreadLocal;
import lombok.experimental.UtilityClass;

/**
 * 当前请求的租户持有者，
 */
@UtilityClass
public class TenantHolder {
    // 使用阿里的实现
    private final ThreadLocal<Long> LOCAL_TENANT = new TransmittableThreadLocal<>();

    /**
     * 保存租户的ID
     */
    public void setTenantId(Long tenantId) {
        LOCAL_TENANT.set(tenantId);
    }

    /**
     * 获取租户信息
     */
    public Long getTenantId() {
        return LOCAL_TENANT.get() == null ? TenantConstants.DEFAULT_TENANT_ID : LOCAL_TENANT.get();
//        return LOCAL_TENANT.get();
    }

    /**
     * 删除租户信息，通常用不到
     */
    public void remove() {
        LOCAL_TENANT.remove();
    }
}
```

## 6.动态Redis数据库
获取了租户信息后，就可以处理连接了,让redis根据租户不同来选择不同的数据库：
vip/efactory/config/cache/XRedisConnectionFactory.java  
```java
/**
 * JedisConnectionFactory 复制修改而来
 */
@Slf4j
public class XRedisConnectionFactory extends JedisConnectionFactory {
    ...省略其他代码...
    /**
     * 重写的方法
     * 返回redis数据库的索引，例如：0,1,2,3..等
     *
     * @return the database index.
     */
    @Override
    public int getDatabase() {
        int dbIndex;
        if (TenantHolder.getTenantId().longValue() == TenantConstants.DEFAULT_TENANT_ID.longValue()) {
            dbIndex = super.getDatabase();
        } else {
            dbIndex = TenantHolder.getTenantId().intValue();
        }
        log.debug("XRedisConnectionFactory 选择的redis数据库是{}", dbIndex);
        return dbIndex;
    }
}
```
从上面我们很容易看出重写了getDatabase()方法，并根据租户的不同返回了不同的Redis数据库的索引！  
创建好XRedisConnectionFactory后，我们来配置让其生效：
efadmin-common/src/main/java/vip/efactory/config/RedisConfig.java  
```java
@Slf4j
@Configuration
@EnableCaching
@ConditionalOnClass(RedisOperations.class)
@EnableConfigurationProperties(RedisProperties.class)
public class RedisConfig extends CachingConfigurerSupport {

    @Autowired
    private Environment env;
    /**
     * 我自己暂时没有redis的集群配置，此处集群配置仅供参考
     *
     * @return
     */
    private RedisClusterConfiguration getClusterConfiguration() {
        Map<String, Object> source = new HashMap<String, Object>();
        String clusterNodes = env.getProperty("spring.redis.cluster.nodes");
        source.put("spring.redis.cluster.nodes", clusterNodes);
        String clusterPassword = env.getProperty("spring.redis.cluster.password");
        source.put("spring.redis.cluster.password", clusterPassword);
        return new RedisClusterConfiguration(new MapPropertySource("RedisClusterConfiguration", source));
    }

    /**
     * 在redis的连接工厂内部动态选择redis数据库，是实现不同租户对应不同redis数据库的关键,@Bean注解不能省略，省略将导致缓存等注解失效！
     *
     * @return JedisConnectionFactory
     */
    @Bean
    public JedisConnectionFactory jedisConnectionFactory() {
        XRedisConnectionFactory redisConnectionFactory = null;
        String clusterEnable = env.getProperty("spring.redis.cluster.enable");
        // 有三种模式：Standalone、Sentinel and Cluster,此处不区分这么细
        // 集群配置
        if (clusterEnable != null && clusterEnable.equals("true")) {
            redisConnectionFactory = new XRedisConnectionFactory(getClusterConfiguration());
            // Sentinel和Cluster模式还可以配置连接池，此处略去
        } else {
            // 非集群配置,还有类似RedisSentinelConfiguration
            RedisStandaloneConfiguration standaloneConfiguration = new RedisStandaloneConfiguration();
            String host = env.getProperty("spring.redis.host");
            String port = env.getProperty("spring.redis.port");
            String password = env.getProperty("spring.redis.password");
            standaloneConfiguration.setHostName(host);
            standaloneConfiguration.setPort(Integer.parseInt(port));
            standaloneConfiguration.setPassword(password);
            standaloneConfiguration.setDatabase(TenantHolder.getTenantId().intValue());
            JedisClientConfiguration jedisClientConfiguration = JedisClientConfiguration.defaultConfiguration();
            redisConnectionFactory = new XRedisConnectionFactory(standaloneConfiguration, jedisClientConfiguration);
        }

        redisConnectionFactory.afterPropertiesSet();
        return redisConnectionFactory;
    }
    ...省略了其他代码...
}
```
这部分的实现代码主要在：https://github.com/vip-efactory/efadmin/tree/master/efadmin-common/src/main/java/vip/efactory/config

## 7.动态数据库实现
虽说基于JPA的独立数据库模式的多租户实现简单一些，但是，有稍微有点繁琐;
与数据源有关的三个底层文件在：https://github.com/vip-efactory/ejpa/tree/master/src/main/java/vip/efactory/ejpa/tenant/database  
负责数据库选择的是MultiTenantConnectionProviderImpl：  
```java
/**
 * 这个类是Hibernate框架拦截sql语句并在执行sql语句之前更换数据源提供的类
 */
public class MultiTenantConnectionProviderImpl extends AbstractDataSourceBasedMultiTenantConnectionProviderImpl {

    /**
     * 在没有提供tenantId的情况下返回默认数据源
     */
    @Override
    protected DataSource selectAnyDataSource() {
        return TenantDataSourceProvider.getTenantDataSource(TenantConstants.DEFAULT_TENANT_ID.toString());
    }

    /**
     * 提供了tenantId的话就根据ID来返回数据源
     */
    @Override
    protected DataSource selectDataSource(String tenantIdentifier) {
        return TenantDataSourceProvider.getTenantDataSource(tenantIdentifier);
    }
}
```
获取当前线程中的租户信息，如果没有则取默认租户。
```java
/**
 * 这个类是由Hibernate提供的用于识别tenantId的类，当每次执行sql语句被拦截就会调用这个类中的方法来获取tenantId
 */
public class MultiTenantIdentifierResolver implements CurrentTenantIdentifierResolver {

    // 获取tenantId的逻辑在这个方法里面写
    @Override
    public String resolveCurrentTenantIdentifier() {
        if (!"".equals(TenantHolder.getTenantId().toString())) {
            return TenantHolder.getTenantId().toString();
        }
        return TenantConstants.DEFAULT_TENANT_ID.toString();
    }

    @Override
    public boolean validateExistingCurrentSessions() {
        return true;
    }
}
```
保存所有租户的数据源容器，提供数据源增删改查的功能：  
```java
/**
 * 租户数据源提供者
 */
@Slf4j
@AllArgsConstructor
public class TenantDataSourceProvider {
    // 使用一个map来存储我们租户和对应的数据源，租户和数据源的信息就是从我们的tenant表中读出来
    private static Map<String, DataSource> dataSourceMap = new HashMap<>();

    // 根据传进来的tenantId决定返回的数据源
    public static DataSource getTenantDataSource(String tenantId) {
        if (dataSourceMap.containsKey(tenantId)) {
            log.info("Get Tenant {} DataSource", tenantId);
            return dataSourceMap.get(tenantId);
        } else {
            log.info("Get Default Tenant DataSource.");
            return dataSourceMap.get(TenantConstants.DEFAULT_TENANT_ID.toString());
        }
    }

    // 初始化的时候用于添加数据源的方法
    public static void addDataSource(String tenantId, DataSource dataSource) {
        dataSourceMap.put(tenantId, dataSource);
    }

    // 初始化的时候用于添加数据源的方法
    public static void addDataSource(TenantEntity tenantEntity) {
        DataSourceBuilder dataSourceBuilder = DataSourceBuilder.create();
        dataSourceBuilder.url(tenantEntity.getJdbcUrl());
        dataSourceBuilder.username(tenantEntity.getDbUsername());
        dataSourceBuilder.password(tenantEntity.getDbPassword());
        dataSourceBuilder.driverClassName(tenantEntity.getDriverClassName());
        dataSourceMap.put(tenantEntity.getId().toString(), dataSourceBuilder.build());
    }

    // 根据传进来的tenantId来删除指定的数据源
    public static void removeDataSource(String tenantId) {
        if (dataSourceMap.containsKey(tenantId)) {
            log.info("Remove Tenant {} DataSource", tenantId);
            dataSourceMap.remove(tenantId);
        }
    }

    // 刷新指定租户的数据源
    public static void refreshDataSource(TenantEntity tenantEntity) {
        log.info("Refresh Tenant {} DataSource", tenantEntity.getId());
        addDataSource(tenantEntity);
    }
}
```
上面的三个文件都在ejpa的框架内，接下来我们看看在efadmin中还需要哪些配置。
源码在:efadmin-system/src/main/java/vip/efactory/config/tenant  
持久化层的配置类:  
```java
@AllArgsConstructor
@Configuration
@EnableConfigurationProperties({ JpaProperties.class })
@EnableTransactionManagement
@EnableJpaRepositories(basePackages = {"vip.efactory"})
// @EnableTransactionManagement(proxyTargetClass = true)
// @EnableJpaRepositories(basePackages = {"vip.efactory" }, transactionManagerRef = "txManager")
public class MultiTenantJpaConfiguration {

    private JpaProperties jpaProperties; // yml文件中的jpa配置
    private DataSource dataSource; // druid默认数据源

    /**
     * 初始化默认租户的数据源
     */
    @PostConstruct
    public void initDefaultDataSources() {
        // 先初始化租户表所在的数据源，然后从租户表中读取其他租户的数据源然后再进行初始化,详见：DataSourceBeanPostProcessor类
        TenantDataSourceProvider.addDataSource(TenantConstants.DEFAULT_TENANT_ID.toString(), dataSource); // 放入数据源集合中
    }

    @Bean
    public MultiTenantConnectionProvider multiTenantConnectionProvider() {
        return new MultiTenantConnectionProviderImpl();
    }

    @Bean
    public CurrentTenantIdentifierResolver currentTenantIdentifierResolver() {
        return new MultiTenantIdentifierResolver();
    }

    @Bean
    public LocalContainerEntityManagerFactoryBean entityManagerFactoryBean(
            MultiTenantConnectionProvider multiTenantConnectionProvider,
            CurrentTenantIdentifierResolver currentTenantIdentifierResolver) {

        Map<String, Object> hibernateProps = new LinkedHashMap<>();
        hibernateProps.putAll(this.jpaProperties.getProperties());
        hibernateProps.put(Environment.MULTI_TENANT, MultiTenancyStrategy.DATABASE); // 使用基于独立数据库的多租户模式
        hibernateProps.put(Environment.PHYSICAL_NAMING_STRATEGY,
                "org.springframework.boot.orm.jpa.hibernate.SpringPhysicalNamingStrategy"); // 属性及column命名策略
        hibernateProps.put(Environment.MULTI_TENANT_CONNECTION_PROVIDER, multiTenantConnectionProvider);
        hibernateProps.put(Environment.MULTI_TENANT_IDENTIFIER_RESOLVER, currentTenantIdentifierResolver);
        hibernateProps.put(Environment.HBM2DDL_AUTO, Action.UPDATE); // 自动更新表结构,仅默认数据源有效且控制台会报警告可以不用管！
        // hibernateProps.put(Environment.SHOW_SQL, true); // 显示SQL,如果需要可以打开
        // hibernateProps.put(Environment.FORMAT_SQL, true); // 格式化SQL,如果需要可以打开

        // No dataSource is set to resulting entityManagerFactoryBean
        LocalContainerEntityManagerFactoryBean result = new LocalContainerEntityManagerFactoryBean();

        // result.setPackagesToScan(new String[] { Tenant.class.getPackage().getName() });
        result.setPackagesToScan("vip.efactory");
        result.setJpaVendorAdapter(new HibernateJpaVendorAdapter());
        result.setJpaPropertyMap(hibernateProps);

        return result;
    }

    @Bean
    @Primary // 注意我们自己定义的bean，最好都加此注解，防止与自动配置的重复而不知道如何选择
    public EntityManagerFactory entityManagerFactory(LocalContainerEntityManagerFactoryBean entityManagerFactoryBean) {
        return entityManagerFactoryBean.getObject();
    }

    @Bean(name = "transactionManager")
    @Primary // 注意我们自己定义的bean，最好都加此注解，防止与自动配置的重复而不知道如何选择
    public PlatformTransactionManager txManager(EntityManagerFactory entityManagerFactory) {
        SessionFactory sessionFactory = entityManagerFactory.unwrap(SessionFactory.class);
        // 此处在SpringDataJpa中不使用hibernate的事务管理，否则可能导致log持久层save方法不写数据库的问题
        // HibernateTransactionManager result = new HibernateTransactionManager();
        // result.setAutodetectDataSource(false); // 不自动检测数据源
        // result.setSessionFactory(sessionFactory);
        // result.setRollbackOnCommitFailure(true);
        // return result;

        JpaTransactionManager txManager = new JpaTransactionManager();
        txManager.setEntityManagerFactory(entityManagerFactory);
        return txManager;

    }
}
```
初始化默认管理租户的数据源之后，就可以初始化保存在数据库里的其他租户的数据源：  
```java
/**
 * 此处这么写是为了破解循环引用,MultiTenantJpaConfiguration与ITenantService相互依赖
 */
@AllArgsConstructor
@Component
@Slf4j
public class DataSourceBeanPostProcessor {
    private DruidDataSource druidDataSource;  //自动配置创建的druid数据源
    private ITenantService tenantService;

    @PostConstruct
    public void init() {
        // 获取数据库里所有的租户信息
        log.info("多租户的数据源初始化开始...");
        List<Tenant> tenantList = tenantService.findAllByStatusEquals(ITenantService.TENANT_ENABLE);
        // 初始化所有租户的数据源
        if (tenantList != null && tenantList.size() > 0) {
            tenantList.forEach(tenant -> {
                try {
                    DruidDataSource newDataSource = druidDataSource.cloneDruidDataSource();  // 克隆已有的数据源进行修改
                    // 设定新的数据源的重要参数
                    newDataSource.setUsername(tenant.getDbUsername());
                    newDataSource.setPassword(tenant.getDbPassword());
                    newDataSource.setUrl(tenant.getJdbcUrl());
                    newDataSource.setDriverClassName(tenant.getDriverClassName());  // 其实也可以默认
                    newDataSource.init(); // 初始化数据源
                    TenantDataSourceProvider.addDataSource(tenant.getId().toString(), newDataSource);  // 放入数据源集合中
                    log.info("租户{}的数据源初始化完成！", tenant.getId());
                    // throw new SQLException("测试抛异常");
                } catch (SQLException throwables) {
                    log.error("租户{}的数据源初始化失败！异常内容:{}", tenant.getId(), throwables.getMessage());
                    throwables.printStackTrace();
                    // 致命错误，继续运行可能导致数据错乱，退出系统
                    log.error("多租户模式下项目启动遇到了数据源初始化错误，为数据安全考虑，系统即将退出！");
                    System.exit(1);
                }

            // 下面是jdbc连接池数据源的配置
            // DataSource dataSource = DataSourceBuilder.create()
            //        .url(tenant.getJdbcUrl())
            //        .username(tenant.getDbUsername())
            //        .password(tenant.getDbPassword())
            //        .driverClassName(tenant.getDriverClassName())
            //        .build();
            // TenantDataSourceProvider.addDataSource(tenant.getId().toString(), dataSource);  // 放入数据源集合中
            // log.info("租户{}的数据源初始化完成！", tenant.getId());
            });
        }
        log.info("多租户的数据源初始化结束");
    }

}
```
上面的代码逻辑也很简单，就是把阿里巴巴的数据源克隆后修改为其他租户的数据源，然后放入租户数据源容器中即可。

至此原理分析基本上结束了，**因为redis及数据库是多租户模式下的两个非常重要的方面，所以花费较大篇幅进行介绍。**
涉及的更多细节可以参阅源码：https://github.com/vip-efactory/efadmin

**额外说明：**    
> A.Redis数据库默认有16个数据库0-15的索引号。所以如果有超过16个租户，你需要考虑更改redis的配置以便支持更多。  
> B.如果您使用此项目不需要多租户模式，前端可以默认租户id为0即可。
