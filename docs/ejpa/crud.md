# 关于CRUD功能

######  今天我们一起来探讨项目中常见常见的增删改查(简称CRUD)，其实但凡有工作经验的朋友都会发现一个特点，系统中几十甚至成百上千的表数据操作，大多数都是基础的CRUD，在JavaEE中，这些看似不同却又都极其相似，因此我们完全可以利用Java中的泛型和反射的特性实现一套基础的CRUD实现模板，让Java中的子类去继承，在子类中如果没有特殊逻辑，可以直接调用父类模板中的实现，如果有自己的逻辑也可以加入自己的逻辑，总之一句话：可以简化代码实现。
---
## CRUD实现位置
- 主要实现在ejpa：vip.efactory.ejpa.base包里；
- 控制器层为：vip.efactory.ejpa.base.controller.BaseController；
```java
/**
 * Description:这是一个基础的控制器基类，包含常见的基本的CRUD的请求的处理，其他特殊的方法通过子类继承实现。
 * T1,是操作的实体类，T2是对应的service接口类继承IBaseService,ID是主键的类型
 *
 * @author dbdu
 */
@SuppressWarnings("all")
@Slf4j
public class BaseController<T1 extends BaseEntity, T2 extends IBaseService, ID> {
    ...省略相关的实现
    
}
```
- 服务层接口为：vip.efactory.ejpa.base.service.IBaseService；
```java
public interface IBaseService<T extends BaseEntity, ID> {
    ...包含大量的模板方法接口
}
```
- 服务层接口实现：vip.efactory.ejpa.base.service.impl.BaseServiceImpl；
```java
@SuppressWarnings("all")
@Slf4j
@Transactional
public class BaseServiceImpl<T extends BaseEntity, ID, BR extends BaseRepository> implements IBaseService<T, ID> {
    ... 此处是模板接口里方法的具体实现。
}
```
- 持久层：vip.efactory.ejpa.base.repository.BaseRepository；
```java
/**
 * Description:项目自定义的一些常用的扩展
 *
 * @author dbdu
 */
@NoRepositoryBean
public interface BaseRepository<T extends BaseEntity, ID> extends JpaRepository<T, ID> {
    ... ejpa框架提供的一些方法，这些方法名符合jpa的规则，会被jpa自动实现。
}
```
- 基础实体：vip.efactory.ejpa.base.entity.BaseEntity
```java
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
    ... 一些通用的基础的字段，其中updateTime更新时间字段会被用来实现检测错误覆盖的功能。
}
```

## 如何使用
1. 让自己的各层分别继承模板的各层并指定需要的泛型类型；
2. 这样就可以在控制层、服务层、持久层调用对应层模板实现的方法。

## 如何继承各层模板
- 继承基础实体BaseEntity，以Employee类为例：
```java
public class Employee extends BaseEntity<Long> implements Serializable {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @NotNull(message = "{Employee.id}{property.not.allow.empty}", groups = Update.class)  // 意味着，updateById更新时id不允许为空
    private Long id;
    
    ...省略其他的代码
}
```
    说明:BaseEntiy指定了主键的泛型类型为Long，就告诉模板以Long型进行实现；
- 继承BaseRepository：
```java
public interface EmployeeRepository extends BaseRepository<Employee, Long>, JpaSpecificationExecutor<Employee> {
    ... 此处可以写一些自己的特殊实现的方法，也可以不写。
}
```
    说明：`BaseRepository<Employee, Long>`告诉模板要进行持久化操作的类是Employee，主键类型是Long型。
- 继承服务层接口IBaseService：
```java
public interface EmployeeService extends IBaseService<Employee, Long> {
    ...自己的方法接口，可以为空。
}
```
- 继承服务层接口实现BaseServiceImpl：
```java
@Service
@Transactional(propagation = Propagation.SUPPORTS, readOnly = true, rollbackFor = Exception.class)
public class EmployeeServiceImpl extends BaseServiceImpl<Employee, Long, EmployeeRepository> implements EmployeeService {
    ...自己的方法接口实现，可以为空。
}
```
    说明：`BaseServiceImpl<Employee, Long, EmployeeRepository>` 告诉模板实体Employee的主键类型是Long，持久层是EmployeeRepository
- 继承模板的控制器BaseController
```java
public class EmployeeController extends BaseController<Employee, EmployeeService, Long> {
    ... 自己的对前端暴露的方法。BaseController指定了3个泛型：分别是：实体类型，实体的service层及主键类型。
}
```

## 员工管理在控制器中的代码例子
```java
package vip.efactory.modules.system.rest;

import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import io.swagger.annotations.ApiParam;
import lombok.SneakyThrows;
import org.springframework.beans.BeanUtils;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import vip.efactory.aop.log.Log;
import vip.efactory.ejpa.base.controller.BaseController;
import vip.efactory.ejpa.base.entity.BaseSearchEntity;
import vip.efactory.ejpa.utils.R;
import vip.efactory.modules.mnt.websocket.MsgType;
import vip.efactory.modules.mnt.websocket.SocketMsg;
import vip.efactory.modules.mnt.websocket.WebSocketServer;
import vip.efactory.modules.system.domain.Employee;
import vip.efactory.modules.system.service.EmployeeService;

import java.util.Set;


/**
 * @author dbdu
 * @date 2019-07-21
 */
@Api(tags = "Employee管理")
@RestController
@RequestMapping("api/employee")
public class EmployeeController extends BaseController<Employee, EmployeeService, Long> {

    /**
     * Description: 默认的分页与排序
     *
     * @param page 分页参数对象
     * @return R
     */
    @Log("分页查询Employee")
    @ApiOperation(value = "获取分页数据", notes = "默认每页25条记录,id字段降序")
    @GetMapping("/page")
    @PreAuthorize("@p.check('employee:list')")
    public R getByPage(@PageableDefault(value = 25, sort = {"id"}, direction = Sort.Direction.DESC) Pageable page) {
        return super.getByPage(page);
    }

    /**
     * Description: 高级查询
     *
     * @param entity            含有高级查询条件
     * @param page             分页参数对象
     * @return R
     */
    @Log("分页高级查询Employee")
    @ApiOperation(value = "多条件组合查询,返回分页数据", notes = "默认每页25条记录,id字段降序")
    @PostMapping("/page")
    @PreAuthorize("@p.check('employee:list')")
    public R advancedQuery(@RequestBody Employee entity, @PageableDefault(value = 25, sort = {"id"}, direction = Sort.Direction.DESC) Pageable page) {
        return super.advancedQueryByPage(page, entity);
    }

    /**
     * Description:多字段模糊查询,例如:
     * http://frms.ddbin.com:8080/carton/fuzzy?fields=name,version&q=BB
     *
     * @param page   分页参数对象
     * @param q      模糊查询的值
     * @param fields 要查询的字段
     * @return R
     */
    @Log("多字段模糊查询Employee")
    @ApiOperation(value = "多字段模糊查询,例如:q=abc&fields=name,address,desc", notes = "多个字段模糊匹配")
    @GetMapping("/fuzzy")
    @PreAuthorize("@p.check('employee:list')")
    public R getByPage(@RequestParam String q, @RequestParam String fields, @PageableDefault(value = 25, sort = {"id"}, direction = Sort.Direction.DESC) Pageable page) {
        return super.queryMutiField(q, fields, page);
    }


    /**
     * Description:使用id来获取实体
     *
     * @param id 主键
     * @return R
     */
    @Log("使用Id查询Employee")
    @GetMapping("/{id}")
    @ApiOperation(value = "依据Id来获取对应的记录", notes = "依据Id来获取对应的记录")
    @PreAuthorize("@p.check('employee:list')")
    public R getById(@PathVariable("id") Long id) {
        return super.getById(id);
    }


    /**
     * Description:保存实体
     *
     * @param entity 要保存的对象实体
     * @return R
     */
    @Log("新增Employee")
    @PostMapping
    @ApiOperation(value = "新增Employee", notes = "新增Employee实体")
    @PreAuthorize("@p.check('employee:add')")
    public R save(@RequestBody @ApiParam(name = "entity", value = "Json格式", required = true) Employee entity) {
        return super.save(entity);
    }

    /**
     * Description:更新
     *
     * @param entity 更新对象
     * @return R
     */

    @Log("修改Employee")
    @PreAuthorize("@p.check('employee:edit')")
    @PutMapping
    @ApiOperation(value = "依据Id来更新Employee对应的记录", notes = "依据Id来更新对应的记录,属性值为空则不更新数据表中已有的数据")
    public R updateById(@RequestBody @ApiParam(name = "entity", value = "Json格式", required = true) Employee entity) {
        return super.updateById(entity);
    }

    /**
     * Description: 依据ids集合来批量删除实体
     *
     * @param ids 主键
     * @return R
     */
    @Log("使用Ids删除Employee")
    @PreAuthorize("@p.check('employee:del')")
    @DeleteMapping
    @ApiOperation(value = "依据Ids来删除Employee对应的记录", notes = "依据Ids来删除Employee对应的记录")
    public R deleteByIds(@RequestBody Set<Long> ids) {
        return super.deleteByIds(ids);
    }
}
```
    说明：如果是自己的方法可以通过entityService去调用，entityService在模板中声明泛型后就已经被自动注入了。

## 以下为模板控制层提供的方法说明
#### 分页及排序
```java
    /**
     * Description:实体的分页查询，包括排序等,使用SpringData自己的对象接收分页参数
     *
     * @param page 分页参数对象
     * @return R
     */
    public R getByPage(Pageable page) {
        Page<T1> entities = entityService.findAll(page);
        EPage ePage = new EPage(entities);
        return R.ok().setData(ePage);
    }
```
    说明：jpa默认的分页对象太繁杂了，此处用EPage类进行简化处理，返回一些必要的数据。

#### 通过主键获取记录
```java
    /**
     * Description:根据id获取一个实体的信息
     *
     * @param id 主键
     * @return R
     */
    public R getById(ID id) {
        if (null == id) {
            return R.error(CommDBEnum.KEY_NOT_NULL);
        }
        Optional entity = entityService.findById(id);
        if (entity.isPresent()) {
            return R.ok().setData(entity);
        } else {
            return R.error(CommDBEnum.SELECT_NON_EXISTENT);
        }
    }
```
    说明：首先会检查主键值是否存在，不存在和查不到都会返回国际化的错误信息。国际化部分会有专门的文档进行介绍。

#### 保存记录
```java
    /**
     * Description:保存一个实体，保存之前会做检查
     *
     * @param entity 要保存的实体对象
     * @return R
     */
    public R save(T1 entity) {
        // 实体校验支持传递组规则，不传递则为Default组！
        Map<String, String> errors = ValidateModelUtil.validateModel(entity, Default.class, Create.class);
        if (!errors.isEmpty()) {
            return R.error(CommAPIEnum.PROPERTY_CHECK_FAILED).setData(errors);
        }
        entityService.save(entity);
        R r = R.ok().setData(entity);
        return r;
    }
```
    说明：如果实体上属性上有注解校验约束时，则会被检查！不合法时都会返回对应的国际化错误信息。关于属性值是否合法检查会有专门的文档介绍。

#### 更新记录
```java
    /**
     * 使用id来更新,如果属性空值,则不更新现有的值
     *
     * @param entity
     * @return R
     */
    public R updateById(T1 entity) {
        // 检查实体的属性是否符合校验规则，使用Update组来校验实体，
        Map<String, String> errors = ValidateModelUtil.validateModel(entity, Default.class, Update.class); // 可以传递多个校验组！
        if (!errors.isEmpty()) {
            return R.error(CommAPIEnum.PROPERTY_CHECK_FAILED).setData(errors);
        }
        // 检查数据记录是否已经被删除了，被删除了，则不允许更新
        Optional<T1> entityOptional = entityService.findById(entity.getId());
        if (!entityOptional.isPresent()) {
            return R.error(CommDBEnum.UPDATE_NON_EXISTENT);
        } else {
            // 检查更新时间戳，避免用旧的数据更新数据库里的新数据
            Date updateTime = entity.getUpdateTime();
            Date dbUpdateTime = entityOptional.get().getUpdateTime();
            if (updateTime != null && updateTime.compareTo(dbUpdateTime) != 0) {
                return R.error(CommDBEnum.UPDATE_NEW_BY_OLD_NOT_ALLOWED);
            }
        }
        //检查业务key的存在性，不应该存在重复的业务key,此处不知道业务key是什么属性，可以在在service层实现，重写方法即可！
        if (null != entity.getId()) {
            updateEntity(entityOptional.get(), entity, false, "createTime", "updateTime");
        }
        R r = R.ok().setData(entity);
        return r;
    }
```
    说明：如果实体上属性上有注解校验约束时，则会被检查！不合法时都会返回对应的国际化错误信息。

#### 通过单个主键删除记录
```java
    /**
     * Description:使用id删除指定的实体
     *
     * @param id 使用主键id
     * @return java.lang.Object
     */
    public R deleteById(ID id) {
        if (null == id) {
            return R.error(CommDBEnum.KEY_NOT_NULL);
        }
        //进行关联性检查,调用对应的方法
        // 在删除前用id到数据库查询一次,不执行空删除，不检查就可能会在数据库层面报错，尽量不让用户见到看不懂的信息
        Optional entity = entityService.findById(id);
        if (!entity.isPresent()) {
            return R.error(CommDBEnum.DELETE_NON_EXISTENT);
        }
        try {
            this.entityService.deleteById(id); // 关联关系可以在service层重写实现
        } catch (Exception e) {
            return R.error(e.getMessage());
        }
        return R.ok();
    }
```
    说明：此处异常捕捉如果有见到更多具体的异常可以优化针对性返回信息给用户。

#### 通过批量主键进行删除
```java
    /**
     * Description:使用id的Set集合来删除指定的实体，不使用数组防止存在重复的数据
     *
     * @param entityIds 使用主键Set集合
     * @return java.lang.Object
     */
    public R deleteByIds(Set<ID> entityIds) {
        if (CollectionUtils.isEmpty(entityIds)) {
            return R.ok();
        }
        try {
            this.entityService.deleteAllById(entityIds); // 关联关系可以在service层重写实现
        } catch (Exception e) {
            return R.error(e.getMessage());
        }
        return R.ok();
    }
```
    说明：基于性能考虑，批量删除不再对每一个主键进行检查，仍然捕捉异常。


#### 多字段模糊查询含有的内容
多字段模糊查询,例如:q=abc&fields=name,address,desc,意思是查询在name,address,desc三个字段中包含abc的记录。
http://localhost:8080/student/fuzzy?fields=name,version&q=BB
- 不分页

```java
    /**
     * Description: 同一个值,在多个字段中模糊查询,不分页
     *
     * @param q      模糊查询的值
     * @param fields 例如:"name,address,desc",对这三个字段进行模糊匹配
     * @return R
     */
    public R queryMutiField(String q, String fields) {
        // 构造高级查询条件
        T1 be = buildQueryConditions(q, fields);

        List<T1> entities = entityService.advancedQuery(be);
        return R.ok().setData(entities);
    }
```
- 分页

```java
    /**
     * Description:同一个值,在多个字段中模糊查询,分页
     *
     * @param q      模糊查询的值
     * @param fields 例如:"name,address,desc",对这三个字段进行模糊匹配
     * @param page   分页参数对象
     * @return R
     */
    public R queryMutiField(String q, String fields, Pageable page) {
        // 构造高级查询条件
        T1 be = buildQueryConditions(q, fields);
        Page<T1> entities = entityService.advancedQuery(be, page);
        EPage ePage = new EPage(entities);
        return R.ok().setData(ePage);
    }
```
#### 通过实体的id检查实体是否存在
```java
    /**
     * Description:检查操作的idd对应实体是否存在，因为多人操作，可能被其他人删除了！
     *
     * @param entityId 实体主键id
     * @return Boolean
     */
    public Boolean chkEntityIdExist(ID entityId) {
        return null != entityId && entityService.existsById(entityId);
    }
```

#### 高级搜索分页与不分页的方法
```java
    /**
     * Description: 高级查询加分页功能
     *
     * @param page   分页参数对象
     * @param entity 包含高级查询条件的实体
     * @return R
     */
    public R advancedQueryByPage(Pageable page, T1 entity) {
        Page<T1> entities = entityService.advancedQuery(entity, page);
        EPage ePage = new EPage(entities);
        return R.ok().setData(ePage);
    }
    /**
     * Description: 高级查询不分页
     *
     * @param entity 包含高级查询条件的实体
     * @return R
     */
    public R advancedQuery(T1 entity) {
        List<T1> entities = entityService.advancedQuery(entity);
        return R.ok().setData(entities);
    }
```
    说明：关于高级搜索的原理及实现，会有专门的文档进行说明。

>更多具体的实现，参见：vip.efactory.ejpa.base.controller.BaseController类


注意：  
因为继承BaseController会默认已经注入了Service层，如果不想使用父类的实现，可以使用entityService对象调用服务层的方法！
