# 用户操作跟踪

## 在实际的项目中我们可能有这种需求:
- 自动记录数据的创建时间及最后更新时间；
- 自动记录数据的创建者及最后更新者。

## 在JPA中很早就提供了这种功能JPA Audit
在springdatajpa中，支持在字段或者方法上进行注解@CreatedDate，@CreatedBy，@LastModifiedDate，@LastModifiedBy，从字面意思可以很清楚的了解，这几个注解的用处。
- @CreatedDate 表示该字段为创建时间时间字段，在这个实体被insert的时候，会设置值
- @CreatedBy 表示该字段为创建人，在这个实体被insert的时候，会设置值
- @LastModifiedDate、@LastModifiedBy同理。

## 如何进行使用呢？
1. 首先申明实体类，需要在实体类上加上注解@EntityListeners(AuditingEntityListener.class)；
2. 其次在application启动类中加上注解EnableJpaAuditing；
3. 同时在需要的实体字段上加上@CreatedDate、@CreatedBy、@LastModifiedDate、@LastModifiedBy等注解。
4. 在jpa.save方法被调用的时候，时间字段会自动设置并插入数据库，但是@CreatedBy和@LastModifiedBy并没有赋值，因为需要实现AuditorAware接口来返回你需要插入的值。

## 看看efadmin项目中是如何使用的
### 基础实体类BaseEntity
```java
package vip.efactory.ejpa.base.entity;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import javax.persistence.*;
import java.io.Serializable;
import java.util.Date;

/**
 * "@EntityListeners(AuditingEntityListener.class)" 是用于监听实体类添加或者删除操作的
 *  ID 为主键的泛型，子类继承需要指定ID的类型，这样将ID实现放在子类中，具有更广的适用性
 */
@Getter
@Setter
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
@ApiModel(value = "基础实体", description = "所有数据表的通用部分")
public abstract class BaseEntity<ID> extends BaseSearchEntity implements Serializable {
    private static final long serialVersionUID = 1L;
    
    // 将主键的set与get的实现移植到子类这样更具有灵活性
    public abstract ID getId();
    public abstract void setId(ID id);

    /**
     * Description:创建日期,数据库底层实现时间的创建
     */
    @Column(updatable = false, columnDefinition = "datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    @Temporal(TemporalType.TIMESTAMP)
    @CreatedDate //使用注解实现时间的创建
    @ApiModelProperty(hidden = true)
    private Date createTime;

    /**
     * Description:最后更新日期,数据底层实现时间的更新
     */
    @Column(columnDefinition = "datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NULL COMMENT '更新时间'")
    //使用注解实现时间的更新
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    @Temporal(TemporalType.TIMESTAMP)
    @LastModifiedDate //使用注解实现更新时间的更新
    @ApiModelProperty(hidden = true)
    private Date updateTime;
    
    /**
     * Description:创建人编号
     */
    @Column(length = 32, columnDefinition = "varchar(32) COMMENT '创建人'")
    @CreatedBy
    @ApiModelProperty(hidden = true)
    private String creatorNum;

    /**
     * Description:更新人编号或者姓名,//不使用id，如果人员被删除，看到一个数字是无意义的。
     * 修改人
     */
    @Column(length = 32, columnDefinition = "varchar(32) COMMENT '更新人'")
    @LastModifiedBy
    @ApiModelProperty(hidden = true)
    private String updaterNum;

    /**
     * Description:备注
     */
    @Column(name = "remark", length = 1024, columnDefinition = "varchar(1024) COMMENT '备注'")
    private String remark;
}

```
    说明：
    > 在上述代码中我们发现BaseEntity实体上有注解`@EntityListeners(AuditingEntityListener.class)`，注释已经说的很清楚了;
    > createTime和updateTime属性上分别JPA的时间戳更新注解，creatorNum和updaterNum属性跟踪操作用户的注解，功能均由JPA提供;
    > createTime和updateTime属性上另外分别还有：  
    @Column(updatable = false, columnDefinition = "datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'")
    @Column(columnDefinition = "datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NULL COMMENT '更新时间'")
    这个两个注解也定义了时间戳相关的处理，不过这是数据库层面的，@CreatedDate和@LastModifiedDate是应用层面的，如果没有通过应用而是直接更新数据库则@Column定义数据库层面的就会生效。

### 让JPA记录操作人先要让它知道谁是操作人
```java
package vip.efactory.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.AuditorAware;
import vip.efactory.utils.SecurityUtils;

import java.util.Optional;

/**
 * Description: 这是当前用户的监听器,用来更新用户操作时,记录到创建人或者更新人的字段
 * String 存储用户名或者工号等,不建议存储用户id,一旦这个用户被删,将无从查起!
 *
 * @author dbdu
 */
@Configuration
@Slf4j
public class UserIDAuditorBean implements AuditorAware<String> {
    @Override
    public Optional<String> getCurrentAuditor() {
        // 此处是可以用户名或者工号,默认值为System
        String username = "System";
        try {
            username = SecurityUtils.getUsername();
        } catch (Exception e) {
            log.info(e.getMessage());
        }
        return Optional.ofNullable(username);

    }
}
```
    说明:如果没有当前用户，默认为System，例如：定时任务自动执行某些操作，是没有用户的，可以默认为System！

### 打开开关使其生效
```java
package vip.efactory;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.web.embedded.tomcat.TomcatServletWebServerFactory;
import org.springframework.boot.web.servlet.server.ServletWebServerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import vip.efactory.annotation.AnonymousAccess;
import vip.efactory.utils.SpringContextHolder;

@EnableAsync
@EnableJpaAuditing
@RestController
@SpringBootApplication
@EnableTransactionManagement
public class AppRun {
    // 省略部分代码
}
```
    说明：在启动类上加持@EnableJpaAuditing注解即可启用此功能！



本文参考：  
<https://www.cnblogs.com/520playboy/p/7552141.html>
