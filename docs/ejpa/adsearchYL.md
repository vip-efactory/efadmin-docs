# 关于高级搜索的实现原理
```
所谓高级搜索，其实就是利用Java的泛型与反射在基于JPA之上，实现不特定于具体实体的多条件联合查询数据记录的功能模板。这样任何基于这个模板的实体都会具有多条件联合搜索的功能。
```
# 实现思路
```
封装多个条件集合，用来接收前端传来多个条件，后端收到条件集合，进行条件解析并实现。
```
## 封装条件的实体
```java
/**
 * Description: 基础的高级搜索实体,不需要持久化到数据库
 *
 * @author dbdu
 * Created at:2019-03-09 10:57,
 */
@Setter
@Getter
@JsonInclude(value = JsonInclude.Include.NON_NULL)      //null值的属性JSON不输出
@ApiModel(value = "高级搜索条件实体", description = "仅在需要高级搜索的接口中,这个才需要")
public class BaseSearchEntity {

    /**
     * 数据库不存这个字段
     * 所有的搜索条件字段,不允许重复
     */
    @Transient
    @ApiModelProperty(hidden = true)
    private Set<BaseSearchField> conditions;
}

```
## BaseSearchField封装每个查询条件的定义
```java
package vip.efactory.ejpa.base.entity;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Getter;
import lombok.Setter;

/**
 * Description: 需要搜索的字段定义,这里的字段是指实体的属性,
 * 例1:实体属性名称为zhangsan的精确条件,则name值为name,searchType值为1,val值为zhangsan
 * 例2:实体属性年龄在25-35之间的范围条件,则name值为age,searchType值为2,val值为25,val2值为35
 *
 * @author dbdu
 * Created at:2019-03-09 14:37,
 */
@Setter
@ApiModel(value = "条件实体", description = "仅在需要高级搜索的接口中,这个才需要")
public class BaseSearchField {

    /**
     * 字段名，例如，name,password等
     */
    @Getter
    @ApiModelProperty(value = "条件字段名", name = "name", notes = "例如:是name字段或者age字段")
    private String name;

    /**
     * 搜索类型：
     * ０－－模糊查询；
     * １－－精准查询，严格一样
     * ２－－范围查询
     * 更多类型,参见SearchTypeEnum
     */
    @ApiModelProperty(value = "搜索类型", name = "searchType", notes = "例如:0--模糊查询;1--等于查询;2--范围查询;3--不等于查询;4--小于查询;5--小于等于查询;6--大于查询;7--大于等于查询")
    private Integer searchType;

    /**
     * 搜索字段值,暂时用String来接收所有类型的值！
     * 搜索类型为０或１默认取此值，为２范围查询时，此值是开始值
     */
    @ApiModelProperty(value = "字段值或开始值", name = "val", notes = "搜索类型为０或１默认取此值，为２范围查询时，此值是开始值")
    @Getter
    private String val;

    /**
     * 搜索类型为０或１时此值不用，为２范围查询时，此值是结束值
     */
    @ApiModelProperty(value = "结束值", name = "val2", notes = "搜索类型为０或１时此值不用，为２范围查询时，此值是结束值")
    @Getter
    private String val2;

    /**
     * 条件位置顺序，例如都是同级，一级的情况下，这个条件是在前面还是后面。可不写，有则使用，没有则随机排
     */
    @ApiModelProperty(value = "条件位置顺序", name = "order", notes = "条件顺序")
    private Integer order;

    /**
     * 逻辑类型,当前条件是与的关系还是或的关系，0 为或的关系，1为与的关系   若为空，默认为0
     */
    @ApiModelProperty(value = "条件逻辑类型", name = "logicalType", notes = "当前条件是与的关系还是或的关系，0 为或的关系，1为与的关系；若为空，默认为0")
    private Integer logicalType;

    /**
     * 括号组，哪些条件在同一个组里，例如：（a=3 || b=4） && （c=5 || d=7），简单条件时允许为空
     */
    @ApiModelProperty(value = "括号组", name = "bracketsGroup", notes = "哪些条件在同一个组里，例如：（a=3 || b=4） && （c=5 || d=7），简单条件时允许为空")
    @Getter
    private String bracketsGroup;

    /**
     * 组逻辑类型,当前组条件是与的关系还是或的关系，0 为或的关系，1为与的关系   若为空，默认为0
     * 是||（a=3 || b=4）
     * 还是 &&（c=5 || d=7）
     */
    @ApiModelProperty(value = "组逻辑类型", name = "logicalTypeGroup", notes = "当前组条件是与的关系还是或的关系，0 为或的关系，1为与的关系；若为空，默认为0")
    private Integer logicalTypeGroup;

    public Integer getSearchType() {
        return searchType == null ? 0 : searchType;
    }

    public Integer getOrder() {
        return order == null ? 0 : order;
    }

    public Integer getLogicalType() {
        return logicalType == null ? 0 : logicalType;
    }

    public Integer getLogicalTypeGroup() {
        return logicalTypeGroup == null ? 0 : logicalTypeGroup;
    }
}
```
## 每个条件支持的查询方式枚举
```java
package vip.efactory.ejpa.base.enums;

import lombok.Getter;

/**
 * Description: 实体属性的查询条件,例如:age ge 35
 *
 * @author dbdu
 * Created at:2019-03-09 16:06,
 */
@Getter
public enum SearchTypeEnum {
    FUZZY(0, "模糊查询"),
    EQ(1, "等于查询"),
    RANGE(2, "范围查询"),
    NE(3, "不等于查询"),
    LT(4, "小于查询"),
    LE(5, "小于等于查询"),
    GT(6, "大于查询"),
    GE(7, "大于等于查询"),
    IS_NULL(8, "Null值查询"),       // 3.0+
    NOT_NULL(9, "非Null值查询"),    // 3.0+
    LEFT_LIKE(10, "左模糊查询"),    // 3.0+
    RIGHT_LIKE(11, "右模糊查询"),   // 3.0+
    IN(12, "包含查询"),             // 3.4+
    // mbp支持,jpa内置暂不支持not in查询！除非手写hql或sql实现，
    NOT_IN(13, "不包含查询"),
    IS_EMPTY_STRING(14, "是空串"),
    NOT_EMPTY_STRING(15, "非空串"),
    ;

    // 枚举值
    private int value;

    //枚举说明
    private String desc;

    SearchTypeEnum(int value, String desc) {
        this.value = value;
        this.desc = desc;
    }
    ... 省略其他代码...
}
```
## 封装相邻逻辑关系的枚举
```java
package vip.efactory.ejpa.base.enums;

import lombok.Getter;

/**
 * Description: 多个实体属性间的查询条件关系,
 * 例如:有两个查询属性条件,name和age,是两个条件都满足还是只需要满足任意一个即可.
 *
 * @author dbdu
 * Created at:2019-03-09 16:06,
 */
@Getter
public enum ConditionRelationEnum {
    NOT(-1, "非关系--条件取反"),
    OR(0, "或关系--满足任一条件"),
    AND(1, "与关系--所有条件满足");

    // 枚举值
    private int value;

    //枚举说明
    private String desc;

    ConditionRelationEnum(int value, String desc) {
        this.value = value;
        this.desc = desc;
    }

    public static ConditionRelationEnum getByValue(int value) {
        switch (value) {
            case -1:
                return NOT;
            case 0:
                return OR;
            case 1:
                return AND;
            default:
                return OR;
        }
    }
}
```
    说明：虽然代码中有逻辑非，但是目前并没有用到。  
## 虽然封装了上面这些，但是如何与每个具体的实体关联的呢？
### 答案在BaseEntity里，一起看看
```java
package vip.efactory.ejpa.base.entity;
... 省略导入的代码
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

//    @Id
//    @GeneratedValue(strategy = GenerationType.IDENTITY)
//    @ApiModelProperty(name = "id", example = "1")
//    private Long id;
    // 将主键的set与get的实现移植到子类这样更具有灵活性
    public abstract ID getId();
    public abstract void setId(ID id);

    /**
     * Description:创建日期,数据库底层实现时间的创建
     */
    @Column(updatable = false, columnDefinition = "datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    @CreatedDate //使用注解实现时间的创建
    @ApiModelProperty(hidden = true)
    private LocalDateTime createTime;

    /**
     * Description:最后更新日期,数据底层实现时间的更新
     */
    @Column(columnDefinition = "datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NULL COMMENT '更新时间'")
    //使用注解实现时间的更新
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    @LastModifiedDate //使用注解实现更新时间的更新
    @ApiModelProperty(hidden = true)
    private LocalDateTime updateTime;


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
BaseEntity继承了BaseSearchEntity实体，而我们的业务实体都是继承BaseEntity的，所以我们的业务实体才能在控制器里通过实体接收高级搜索的条件集。  
此处值得一提的是createTime、updateTime两个属性上的注解@CreatedDate、@LastModifiedDate还有@Column注解的定义数据库底层更新，可能有的人会觉的多余重复了，其实并不是：  
@CreatedDate、@LastModifiedDate 是应用层面处理的时间戳；  
@Column 定义的是数据库层面的时间戳更新，有时直接用工具修改数据记录，此时数据库就会发挥作用了。

### 那么控制器里应该怎么写才能接收到高级搜索条件呢？
```java
/**
 * @author dbdu
 * @date 2019-07-21
 */
@Api(tags = "Employee管理")
@RestController
@RequestMapping("api/employee")
public class EmployeeController extends BaseController<Employee, EmployeeService, Long> {
     ...省略了其他接口方法

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
    ...省略了其他接口方法
}
```
   说明：关键是`@RequestBody Employee entity`，因为Employee继承了BaseEntity，因此可以直接用来接收高级搜索的参数。

### 现在我们接收到了高级搜索的条件，接下来看看如何层层解析处理的
从上面的案例代码我们发现其实还是BaseController在处理，其实在BaseController中有两个高级查询的方法：
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
    说明：上面的代码不难理解，其实就是分为分页和不分页的两种情况。  
    entityService.advancedQuery(entity, page)
    entityService.advancedQuery(entity)  
    这两个方法主要用来处理高级搜索功能。

### 追踪高级搜索的entityService.advancedQuery方法的具体实现
需要进入到服务层entityService的实现类vip.efactory.ejpa.base.service.impl.BaseServiceImpl里：
```java
    /**
     * Description: 不分页的高级查询,无条件时,最多返回最新的25条记录
     *
     * @param [entity]
     * @return java.util.List<T>
     * @author dbdu
     * @date 19-7-5 下午12:26
     */
    @Override
    public List<T> advancedQuery(T entity) {
        if (entity.getConditions() != null && entity.getConditions().size() > 0) {
            return br.findAll(getSpecification(entity));
        } else {
            //返回前25条数据！
            return br.findTop25ByOrderByIdDesc();
        }

    }

    /**
     * Description: 高级查询带分页的功能,如果没有查询条件,仅分页返回
     *
     * @param [entity, pageable]
     * @return org.springframework.data.domain.Page<T>
     * @author dbdu
     * @date 19-7-5 下午12:27
     */
    @Override
    public Page<T> advancedQuery(T entity, Pageable pageable) {
        if (entity.getConditions() != null && entity.getConditions().size() > 0) {
            //构造动态查询的条件
            Specification<T> specification = getSpecification(entity);
            return br.findAll(specification, pageable);
        } else {
            return br.findAll(pageable);
        }
    }
```
看了上面的代码，我相信你已经发现，真正处理条件的是 getSpecification(entity)，我们继续追踪：
```java
    /**
     * Description: 根据条件集合构建查询的表达式
     *
     * @param [entity]
     * @return org.springframework.data.jpa.domain.Specification<T>
     * @author dbdu
     * @date 19-7-5 下午12:25
     */
    private Specification<T> getSpecification(T entity) {
        Set<BaseSearchField> conditions = entity.getConditions();
        // 检查条件是否合法,移除非法的条件
        checkPropertyAndValueValidity(entity);
        // 将条件按照各自所在的组进行分组
        Map<String, List<BaseSearchField>> groups = checkHasGroup(conditions);
        // 判断条件是否只有一个默认组，若是一个组，则说明没有组
        if (groups.size() == 1) {
            return handleSingleGroupCondition(groups.get(DEFAULT_GROUP_NAME), entity);
        } else {
            // 有多个组
            return handleGroupsCondition(groups, entity);
        }
    }
```
    说明：检查条件是否合法,移除非法的条件，这个在进一步考虑后续优化为，提供开关，遇到非法条件则终止查询还是继续用剩余条件继续查询，现在默认为** 遇到非法条件移除后继续查询 **
>checkHasGroup(conditions)  对所有的条件进行分组，即同一个括号内的条件集中起来；
>handleSingleGroupCondition(groups.get(DEFAULT_GROUP_NAME) 处理没有额外指定组的默认组里的查询条件；  
>handleGroupsCondition(groups, entity) 有多个括号组的时候进行处理。

### 先看看如何对多条件进行分组的
```java
    /**
     * 检测条件中是否含有分组信息，例如：类似这样的条件：（A=3 || B=4） && （ C= 5 || D=6）
     */
    private Map<String, List<BaseSearchField>> checkHasGroup(Set<BaseSearchField> conditions) {
        Map<String, List<BaseSearchField>> groups = new HashMap<>();
        groups.put(DEFAULT_GROUP_NAME, new ArrayList<BaseSearchField>()); //存放没有明确分组的条件

        // 遍历所有的条件进行分组
        for (BaseSearchField searchField : conditions) {
            String groupName = searchField.getBracketsGroup();

            if (StringUtils.isEmpty(groupName)) { // 条件没有分组信息
                groups.get(DEFAULT_GROUP_NAME).add(searchField);
            } else { // 条件有分组信息
                // 检查groups是否有此分组，有则用，没有则创建
                if (groups.get(groupName) == null) {
                    groups.put(groupName, new ArrayList<BaseSearchField>()); //创建新的分组，
                }
                groups.get(groupName).add(searchField);    // 再将条件放进去
            }
        }

        // 对所有的分组按照 order排序
        for (Map.Entry<String, List<BaseSearchField>> entry : groups.entrySet()) {
            entry.getValue().sort(Comparator.comparingInt(BaseSearchField::getOrder));  // 条件排序,排序后默认是升序
        }

        return groups;
    }
```
上面的的代码只要有Java基础也是不难理解的，其中对所有的分组进行按照order字段排序，因此如何定义了order值，此处就会排序，后面生成的查询条件时就会用到，如果order没有指定则默认为0,如果多个条件order都是0，排序可能就是非预期的。  
因此我们强烈建议：**尽量指定order的值，除非真的不要紧！**

### 接下来再看看只有一个默认组的时候，是如何处理的
```java
    /**
     * 处理同一个组内查询条件的查询条件转换
     */
    private Specification<T> handleSingleGroupCondition(List<BaseSearchField> fields, T entity) {

        return new Specification<T>() {
            @Override
            public Predicate toPredicate(Root<T> root, CriteriaQuery<?> query, CriteriaBuilder cb) {
                return genPredicate4SingleGroup(fields, root, cb, entity);
            }
        };

    }
```
处理单个组内具体条件的生成，下面代码有点多，如果看一遍吃力，可以多看几遍。
```java
/**
 * 处理单个组内的条件生成
 */
 private Predicate genPredicate4SingleGroup(List<BaseSearchField> fields, Root<T> root, CriteriaBuilder cb, T entity) {
         Predicate finalPredicat = null;
         int count = fields.size();
         Predicate fieldP = null;
         for (int i = 0; i < count; i++) {
             BaseSearchField field = fields.get(i);
             // 得到条件的搜索类型，若为空默认模糊搜索
             int searchType = field.getSearchType() == null ? 0 : field.getSearchType();
             String key = field.getName();
             String startVal = field.getVal();      // 开始值
             String endVal = field.getVal2();    // 结束值
             // 处理查询值的类型转换
             String fieldType = getPropType(key, entity); //直接通过当前实体或者父类来获取属性的类型
             switch (searchType) {                   // cb支持更多的方法,此处仅使用常用的!
                 case 1:     //  EQ(1, "等于查询"),
                     if (numberTypeList.contains(fieldType)) {
                         fieldP = cb.equal(root.get(key), convertType4PropertyValue(fieldType, startVal));
                     } else if (dateTypeList.contains(fieldType)) {
                         if (fieldType.equalsIgnoreCase("Date")) {
                             fieldP = cb.equal(root.<Date>get(key), DateTimeUtil.getDateFromString(startVal));
                         } else if (fieldType.equalsIgnoreCase("LocalDateTime")) {
                             fieldP = cb.equal(root.<LocalDateTime>get(key), DateTimeUtil.getLocalDateTimeFromString(startVal));
                         } else if (fieldType.equalsIgnoreCase("LocalDate")) {
                             fieldP = cb.equal(root.<LocalDate>get(key), DateTimeUtil.getLocalDateFromString(startVal));
                         } else if (fieldType.equalsIgnoreCase("LocalTime")) {
                             fieldP = cb.equal(root.<LocalTime>get(key), DateTimeUtil.getLocalTimeFromString(startVal));
                         }
                     } else {
                         fieldP = cb.equal(root.get(key).as(String.class), startVal);
                     }
                     break;
                 case 2:     //  RANGE(2, "范围查询"),  如果结束值大于开始值，则交换位置避免查不到数据
                     if (numberTypeList.contains(fieldType)) {
                         fieldP = getPredicate4NumberBetweenConditiong(root, cb, key, fieldType, startVal, endVal);
                     } else if (dateTypeList.contains(fieldType)) {
                         if (fieldType.equalsIgnoreCase("Date")) {
                             Date start = DateTimeUtil.getDateFromString(startVal);
                             Date end = DateTimeUtil.getDateFromString(endVal);
                             fieldP = end.compareTo(start) > 0 ? cb.between(root.<Date>get(key), start, end) : cb.between(root.<Date>get(key), end, start);
                         } else if (fieldType.equalsIgnoreCase("LocalDateTime")) {
                             LocalDateTime start = DateTimeUtil.getLocalDateTimeFromString(startVal);
                             LocalDateTime end = DateTimeUtil.getLocalDateTimeFromString(endVal);
                             fieldP = end.compareTo(start) > 0 ? cb.between(root.<LocalDateTime>get(key), start, end) : cb.between(root.<LocalDateTime>get(key), end, start);
                         } else if (fieldType.equalsIgnoreCase("LocalDate")) {
                             LocalDate start = DateTimeUtil.getLocalDateFromString(startVal);
                             LocalDate end = DateTimeUtil.getLocalDateFromString(endVal);
                             fieldP = end.compareTo(start) > 0 ? cb.between(root.<LocalDate>get(key), start, end) : cb.between(root.<LocalDate>get(key), end, start);
                         } else if (fieldType.equalsIgnoreCase("LocalTime")) {
                             LocalTime start = DateTimeUtil.getLocalTimeFromString(startVal);
                             LocalTime end = DateTimeUtil.getLocalTimeFromString(endVal);
                             fieldP = end.compareTo(start) > 0 ? cb.between(root.<LocalTime>get(key), start, end) : cb.between(root.<LocalTime>get(key), end, start);
                         }
                     } else {
                         fieldP = cb.between(root.get(key).as(String.class), startVal, endVal);
                     }
                     break;
                 case 3:     //  NE(3, "不等于查询"),
                     if (numberTypeList.contains(fieldType)) {
                         fieldP = cb.notEqual(root.get(key), convertType4PropertyValue(fieldType, startVal));
                     } else if (dateTypeList.contains(fieldType)) {
                         if (fieldType.equalsIgnoreCase("Date")) {
                             Date start = DateTimeUtil.getDateFromString(startVal);
                             fieldP = cb.notEqual(root.<Date>get(key), start);
                         } else if (fieldType.equalsIgnoreCase("LocalDateTime")) {
                             LocalDateTime start = DateTimeUtil.getLocalDateTimeFromString(startVal);
                             fieldP = cb.notEqual(root.<LocalDateTime>get(key), start);
                         } else if (fieldType.equalsIgnoreCase("LocalDate")) {
                             LocalDate start = DateTimeUtil.getLocalDateFromString(startVal);
                             fieldP = cb.notEqual(root.<LocalDate>get(key), start);
                         } else if (fieldType.equalsIgnoreCase("LocalTime")) {
                             LocalTime start = DateTimeUtil.getLocalTimeFromString(startVal);
                             fieldP = cb.notEqual(root.<LocalTime>get(key), start);
                         }
                     } else {
                         fieldP = cb.notEqual(root.get(key), startVal);
                     }
                     break;
                 case 4:     //  LT(4, "小于查询"),
                     if (numberTypeList.contains(fieldType)) {
                         // fieldP = cb.lessThan(root.get(key), convertType4PropertyValue(fieldType, startVal));
                         fieldP = cb.lt(root.get(key), convertType4PropertyValue(fieldType, startVal));
                     } else if (dateTypeList.contains(fieldType)) {
                         if (fieldType.equalsIgnoreCase("Date")) {
                             Date start = DateTimeUtil.getDateFromString(startVal);
                             fieldP = cb.lessThan(root.<Date>get(key), start);
                         } else if (fieldType.equalsIgnoreCase("LocalDateTime")) {
                             LocalDateTime start = DateTimeUtil.getLocalDateTimeFromString(startVal);
                             fieldP = cb.lessThan(root.<LocalDateTime>get(key), start);
                         } else if (fieldType.equalsIgnoreCase("LocalDate")) {
                             LocalDate start = DateTimeUtil.getLocalDateFromString(startVal);
                             fieldP = cb.lessThan(root.<LocalDate>get(key), start);
                         } else if (fieldType.equalsIgnoreCase("LocalTime")) {
                             LocalTime start = DateTimeUtil.getLocalTimeFromString(startVal);
                             fieldP = cb.lessThan(root.<LocalTime>get(key), start);
                         }
                     } else {
                         fieldP = cb.lessThan(root.get(key).as(String.class), startVal);
                     }
                     break;
                 case 5:     //  LE(5, "小于等于查询"),
                     if (numberTypeList.contains(fieldType)) {
                         // fieldP = cb.lessThanOrEqualTo(root.get(key), convertType4PropertyValue(fieldType, startVal));
                         fieldP = cb.le(root.get(key), convertType4PropertyValue(fieldType, startVal));
                     } else if (dateTypeList.contains(fieldType)) {
                         if (fieldType.equalsIgnoreCase("Date")) {
                             Date start = DateTimeUtil.getDateFromString(startVal);
                             fieldP = cb.lessThanOrEqualTo(root.<Date>get(key), start);
                         } else if (fieldType.equalsIgnoreCase("LocalDateTime")) {
                             LocalDateTime start = DateTimeUtil.getLocalDateTimeFromString(startVal);
                             fieldP = cb.lessThanOrEqualTo(root.<LocalDateTime>get(key), start);
                         } else if (fieldType.equalsIgnoreCase("LocalDate")) {
                             LocalDate start = DateTimeUtil.getLocalDateFromString(startVal);
                             fieldP = cb.lessThanOrEqualTo(root.<LocalDate>get(key), start);
                         } else if (fieldType.equalsIgnoreCase("LocalTime")) {
                             LocalTime start = DateTimeUtil.getLocalTimeFromString(startVal);
                             fieldP = cb.lessThanOrEqualTo(root.<LocalTime>get(key), start);
                         }
                     } else {
                         fieldP = cb.lessThanOrEqualTo(root.get(key).as(String.class), startVal);
                     }
                     break;
                 case 6:     //  GT(6, "大于查询"),
                     if (numberTypeList.contains(fieldType)) {
                         // fieldP = cb.greaterThan(root.get(key), convertType4PropertyValue(fieldType, startVal));
                         fieldP = cb.gt(root.get(key), convertType4PropertyValue(fieldType, startVal));
                     } else if (dateTypeList.contains(fieldType)) {
                         if (fieldType.equalsIgnoreCase("Date")) {
                             Date start = DateTimeUtil.getDateFromString(startVal);
                             fieldP = cb.greaterThan(root.<Date>get(key), start);
                         } else if (fieldType.equalsIgnoreCase("LocalDateTime")) {
                             LocalDateTime start = DateTimeUtil.getLocalDateTimeFromString(startVal);
                             fieldP = cb.greaterThan(root.<LocalDateTime>get(key), start);
                         } else if (fieldType.equalsIgnoreCase("LocalDate")) {
                             LocalDate start = DateTimeUtil.getLocalDateFromString(startVal);
                             fieldP = cb.greaterThan(root.<LocalDate>get(key), start);
                         } else if (fieldType.equalsIgnoreCase("LocalTime")) {
                             LocalTime start = DateTimeUtil.getLocalTimeFromString(startVal);
                             fieldP = cb.greaterThan(root.<LocalTime>get(key), start);
                         }
                     } else {
                         fieldP = cb.greaterThan(root.get(key).as(String.class), startVal);
                     }
                     break;
                 case 7:     //  GE(7, "大于等于查询");
                     if (numberTypeList.contains(fieldType)) {
                         // fieldP = cb.greaterThanOrEqualTo(root.get(key), convertType4PropertyValue(fieldType, startVal));
                         fieldP = cb.ge(root.get(key), convertType4PropertyValue(fieldType, startVal));
                     } else if (dateTypeList.contains(fieldType)) {
                         if (fieldType.equalsIgnoreCase("Date")) {
                             Date start = DateTimeUtil.getDateFromString(startVal);
                             fieldP = cb.greaterThanOrEqualTo(root.<Date>get(key), start);
                         } else if (fieldType.equalsIgnoreCase("LocalDateTime")) {
                             LocalDateTime start = DateTimeUtil.getLocalDateTimeFromString(startVal);
                             fieldP = cb.greaterThanOrEqualTo(root.<LocalDateTime>get(key), start);
                         } else if (fieldType.equalsIgnoreCase("LocalDate")) {
                             LocalDate start = DateTimeUtil.getLocalDateFromString(startVal);
                             fieldP = cb.greaterThanOrEqualTo(root.<LocalDate>get(key), start);
                         } else if (fieldType.equalsIgnoreCase("LocalTime")) {
                             LocalTime start = DateTimeUtil.getLocalTimeFromString(startVal);
                             fieldP = cb.greaterThanOrEqualTo(root.<LocalTime>get(key), start);
                         }
                     } else {
                         fieldP = cb.greaterThanOrEqualTo(root.get(key).as(String.class), startVal);
                     }
                     break;
                 case 8:     // IS_NULL(8, "Null值查询"),
                     fieldP = cb.isNull(root.get(key));
                     break;
                 case 9:     // NOT_NULL(9, "非Null值查询")
                     fieldP = cb.isNotNull(root.get(key));
                     break;
                 case 10:     // LEFT_LIKE(10, "左模糊查询"),
                     fieldP = cb.like(root.get(key).as(String.class), "%" + startVal);
                     break;
                 case 11:     // RIGHT_LIKE(11, "右模糊查询")
                     fieldP = cb.like(root.get(key).as(String.class), startVal + "%");
                     break;
                 case 12:     // IN(12, "包含查询"),   // 3.4+
                     // 切分属性值为集合
                     String[] values = startVal.split(",|;|、|，|；"); // 支持的分隔符：中英文的逗号分号，和中文的顿号！
                     List<String> valueList = Arrays.asList(values);
                     // 日期类型特殊处理
                     if (dateTypeList.contains(fieldType)) {
                         if (fieldType.equalsIgnoreCase("Date")) {
                             List<Date> valueDateList = new ArrayList<>();
                             valueList.forEach(v -> {
                                 valueDateList.add(DateTimeUtil.getDateFromString(v));
                             });
                             Expression<Date> exp = root.<Date>get(key);
                             fieldP = exp.in(valueDateList);
                         } else if (fieldType.equalsIgnoreCase("LocalDateTime")) {
                             List<LocalDateTime> valueDateList = new ArrayList<>();
                             valueList.forEach(v -> {
                                 valueDateList.add(DateTimeUtil.getLocalDateTimeFromString(v));
                             });
                             Expression<LocalDateTime> exp = root.<LocalDateTime>get(key);
                             fieldP = exp.in(valueDateList);
                         } else if (fieldType.equalsIgnoreCase("LocalDate")) {
                             List<LocalDate> valueDateList = new ArrayList<>();
                             valueList.forEach(v -> {
                                 valueDateList.add(DateTimeUtil.getLocalDateFromString(v));
                             });
                             Expression<LocalDate> exp = root.<LocalDate>get(key);
                             fieldP = exp.in(valueDateList);
                         } else if (fieldType.equalsIgnoreCase("LocalTime")) {
                             List<LocalTime> valueDateList = new ArrayList<>();
                             valueList.forEach(v -> {
                                 valueDateList.add(DateTimeUtil.getLocalTimeFromString(v));
                             });
                             Expression<LocalTime> exp = root.<LocalTime>get(key);
                             fieldP = exp.in(valueDateList);
                         }
                     } else {
                         Expression exp = root.get(key);
                         fieldP = exp.in(valueList);
                     }
                     break;
                case 13:     // NOT_IN(13, "不包含查询"),   // 不支持，啥也不做,embp支持
                    break;
                case 14:     // IS_EMPTY_STRING(14, "空串查询"),
                    fieldP = cb.equal(root.get(key), "");
                    break;
                case 15:     // NOT_EMPTY_STRING(15, "非空串查询")
                    fieldP = cb.notEqual(root.get(key), "");
                    break;
                 default:
                     // 0 或其他情况,则为模糊查询,FUZZY(0, "模糊查询"),
                     fieldP = cb.like(root.get(key).as(String.class), "%" + startVal + "%");
             }
 
             if (i == 0) { // 第一个直接赋值
                 finalPredicat = fieldP;
             } else {
                 // 获取当前条件的逻辑类型,即和上一个条件之间的关系，是或还是与
                 Integer logicalType = field.getLogicalType();
                 if (logicalType == ConditionRelationEnum.AND.getValue()) {
                     finalPredicat = cb.and(finalPredicat, fieldP);
                 } else { // 其他为 logicalType == ConditionRelationEnum.OR.getValue()
                     finalPredicat = cb.or(finalPredicat, fieldP);
                 }
             }
         }
 
         return finalPredicat;
     }
```
   说明：仔细阅读代码你会发现，之所以代码看起来多，主要是因为对13中查询方式分别进行处理的，而每种查询方式还涉及到不同的数据类型的处理。
> 从上面的源代码中相信你，不难发现支持的数据类型是：
> String、Date、数字型及浮点型。布尔型暂时没有明确支持。

#### 那么对于数值型类型和日期到底支持哪些呢？
```java
    // 常见的数字类型
    private static List<String> numberTypeList;
    // 常见日期时间类型
    private static List<String> dateTypeList;
    static { // 静态初始化以便提高性能
        numberTypeList = new ArrayList<>();  //保存常见的数字类型，以便避免逐个枚举类型处理
        numberTypeList.add("byte");
        numberTypeList.add("Byte");
        numberTypeList.add("short");
        numberTypeList.add("Short");
        numberTypeList.add("int");
        numberTypeList.add("Integer");
        numberTypeList.add("Long");
        numberTypeList.add("long");
        numberTypeList.add("float");
        numberTypeList.add("Float");
        numberTypeList.add("double");
        numberTypeList.add("Double");
        numberTypeList.add("BigInteger");
        numberTypeList.add("BigDecimal");
        // numberTypeList.add("AtomicInteger"); // 注释掉就说明JPA目前还不支持这些类型，类型来源于JDK
        // numberTypeList.add("AtomicLong");
        // numberTypeList.add("DoubleAccumulator");
        // numberTypeList.add("DoubleAdder");
        // numberTypeList.add("LongAccumulator");
        // numberTypeList.add("LongAdder");

        // 保存常见的日期时间类型
        dateTypeList = new ArrayList<>();
        dateTypeList.add("Date");
        dateTypeList.add("LocalDateTime");
        dateTypeList.add("LocalTime");
        dateTypeList.add("LocalDate");
    }
      // 将查询条件的值转换为对应类型的值
    private Number convertType4PropertyValue(String type, String value) {
        if ("Byte".equalsIgnoreCase(type)) {
            return Byte.valueOf(value);
        } else if ("Short".equalsIgnoreCase(type)) {
            return Short.valueOf(value);
        } else if ("int".equals(type) || "Integer".equals(type)) {
            return Integer.valueOf(value);
        } else if ("Long".equalsIgnoreCase(type)) {
            return Long.valueOf(value);
        } else if ("Float".equalsIgnoreCase(type)) {
            return Float.valueOf(value);
        } else if ("Double".equalsIgnoreCase(type)) {
            return Double.valueOf(value);
        } else if ("BigInteger".equalsIgnoreCase(type)) {
            return new BigInteger(value);
        } else if ("BigDecimal".equalsIgnoreCase(type)) {
            return new BigDecimal(value);
        } else {
            return null;
        }
    }

    /**
     * 专门用于处理Number子类的区间查询条件的生成，此处之所以枚举类型，是因为内置的不支持这种的泛型！
     *
     * @param root
     * @param cb
     * @param key
     * @param fieldType
     * @param startVal
     * @param endVal
     * @return
     */
    private Predicate getPredicate4NumberBetweenConditiong(Root<T> root, CriteriaBuilder cb, String key, String fieldType, String startVal, String endVal) {
        if ("Byte".equalsIgnoreCase(fieldType)) {
            Byte start = Byte.valueOf(startVal);
            Byte end = Byte.valueOf(endVal);
            return end >= start ? cb.between(root.<Byte>get(key), start, end) : cb.between(root.<Byte>get(key), end, start);
        } else if ("Short".equalsIgnoreCase(fieldType)) {
            Short start = Short.valueOf(startVal);
            Short end = Short.valueOf(endVal);
            return end >= start ? cb.between(root.<Short>get(key), start, end) : cb.between(root.<Short>get(key), end, start);
        } else if ("int".equals(fieldType) || "Integer".equals(fieldType)) {
            Integer start = Integer.valueOf(startVal);
            Integer end = Integer.valueOf(endVal);
            return end >= start ? cb.between(root.<Integer>get(key), start, end) : cb.between(root.<Integer>get(key), end, start);
        } else if ("Long".equalsIgnoreCase(fieldType)) {
            Long start = Long.valueOf(startVal);
            Long end = Long.valueOf(endVal);
            return end >= start ? cb.between(root.<Long>get(key), start, end) : cb.between(root.<Long>get(key), end, start);
        } else if ("Float".equalsIgnoreCase(fieldType)) {
            Float start = Float.valueOf(startVal);
            Float end = Float.valueOf(endVal);
            return end >= start ? cb.between(root.<Float>get(key), start, end) : cb.between(root.<Float>get(key), end, start);
        } else if ("Double".equalsIgnoreCase(fieldType)) {
            Double start = Double.valueOf(startVal);
            Double end = Double.valueOf(endVal);
            return end >= start ? cb.between(root.<Double>get(key), start, end) : cb.between(root.<Double>get(key), end, start);
        } else if ("BigInteger".equalsIgnoreCase(fieldType)) {
            BigInteger start = new BigInteger(startVal);
            BigInteger end = new BigInteger(endVal);
            return end.compareTo(start) > 0 ? cb.between(root.<BigInteger>get(key), start, end) : cb.between(root.<BigInteger>get(key), end, start);
        } else if ("BigDecimal".equalsIgnoreCase(fieldType)) {
            BigDecimal start = new BigDecimal(startVal);
            BigDecimal end = new BigDecimal(endVal);
            return end.compareTo(start) > 0 ? cb.between(root.<BigDecimal>get(key), start, end) : cb.between(root.<BigDecimal>get(key), end, start);
        } else {
            return null;
        }
    }
```

### 看完了单个分组处理，再来看看多个分组时handleGroupsCondition(groups, entity)是如何处理的
```java
    /**
     * 处理多个分组条件的，条件查询构造
     */
    private Specification<T> handleGroupsCondition(Map<String, List<BaseSearchField>> groups, T entity) {
        return new Specification<T>() {
            @Override
            public Predicate toPredicate(Root<T> root, CriteriaQuery<?> query, CriteriaBuilder cb) {
                // 先处理默认组
                Predicate defaultGroupP = genPredicate4SingleGroup(groups.get(DEFAULT_GROUP_NAME), root, cb, entity);
                // 处理其他组
                for (Map.Entry<String, List<BaseSearchField>> entry : groups.entrySet()) {
                    if (DEFAULT_GROUP_NAME.equalsIgnoreCase(entry.getKey())) {
                        continue;
                    }

                    Predicate tmpGroupP = genPredicate4SingleGroup(entry.getValue(), root, cb, entity);
                    if (tmpGroupP == null) { // 若也为空则没有必要继续进行了！
                        continue;
                    }

                    // 从组内的一个条件里找到组的逻辑关系
                    if (defaultGroupP == null) { // 当默认组条件为空时，defaultGroupP为null，不处理会导致空指针异常！
                        defaultGroupP = tmpGroupP;
                    } else {
                        Integer logicalTypeGroup = entry.getValue().get(0).getLogicalTypeGroup();
                        if (logicalTypeGroup == ConditionRelationEnum.AND.getValue()) {
                            defaultGroupP = cb.and(defaultGroupP, tmpGroupP);
                        } else {
                            defaultGroupP = cb.or(defaultGroupP, tmpGroupP);
                        }
                    }
                }

                return defaultGroupP;
            }
        };
    }
```
    说明：上面的这个代码主要是处理每个括号组之间的逻辑关系，而对于同一个括号组内的条件还是调用了上面的genPredicate4SingleGroup方法处理的.
> 看了上面的源码，其实可以知道，分组和组逻辑信息都是从组内第一个条件里获取的，因此对于同一个组内，组名和组逻辑的值必须一致，否则容易出错。这也是一个需要非常注意的点！！

### 至此其实源码分析主要结束了，不过我们还可以来看看ejpa是如何检查查询条件是否合法的？
```java
 /**
     * Description:检查属性名和属性值的合法性,不合法的属性和值都会被移除
     *
     * @param [entity]
     * @return void
     * @author dbdu
     * @date 19-7-5 下午12:31
     */
    private void checkPropertyAndValueValidity(T entity) {
        Set<BaseSearchField> conditions = entity.getConditions();
        if (conditions == null || conditions.size() == 0) {
            return;
        }

        // 检查属性名是否合法 非法
        Set<BaseSearchField> illegalConditions = new HashSet<>();        //存放非法的查询条件
        Map<String, String> properties = (Map<String, String>) MapUtil.objectToMap1(entity);
        Set<String> keys = properties.keySet();
        // 如果条件的字段名称与属性名不符，则移除，不作为选择条件；
        conditions.forEach(condition -> {
            if (!keys.contains(condition.getName())) {
                illegalConditions.add(condition);
            }
        });
        // 移除非法的条件
        conditions.removeAll(illegalConditions);

        //继续检查条件的值是否有非法敏感的关键字
        conditions.forEach(condition -> {
            String value1 = condition.getVal();
            if (SQLFilter.sqlInject(value1)) {
                illegalConditions.add(condition);
            }

            // 如果是范围需要检查两个值是否合法
            int searchType = condition.getSearchType() == null ? 0 : condition.getSearchType(); // searchType 用户可以不写,不写默认为0,模糊查询
            if (SearchTypeEnum.RANGE.getValue() == searchType) {
                String value2 = condition.getVal2();
                if (SQLFilter.sqlInject(value2)) {
                    illegalConditions.add(condition);
                }
            }
        });

        // 移除非法条件
        conditions.removeAll(illegalConditions);
    }
```
　　　说明：从源码实现不难看出，凡是查询条件名称不是属性特有的，或者查询值非法的条件都会被移除！！　　　
> 更多细节，参见vip.efactory.ejpa.base.service.impl.BaseServiceImpl源码实现。
　　　

### 结束了
> 到此源码分析结束了，如果有更好的建议欢迎反馈改进；　　　

> 当前高级查询有一个已知问题是不能连表条件查询，后续版本会考虑支持连表查询。　　

> 实现思路是:先测试JPA是否支持级联的属性查询，例如：user.role.name这种格式，如果支持就可以在检查非法条件时放行这种属性，在高级搜索UI中支持选择这种属性条件即可。
