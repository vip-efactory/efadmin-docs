# 实体属性检查
```
关于属性值检查其实很好理解，就是防止不规范的，不合法甚至是错误的值被保存或更新进数据表中，  
大家见到的很多都是前端进行的数据检查，其实后端也应该对必要的数据进行检查。为什么要如此：  
理由很简单：安全考虑，用户可能并不一定用我们的前端系统进行操作，有可能直接对接口操作，  
如果没有检查就会出现不规范的数据！！
```
----
# 实现原理
    利用Hibernate的注解检查功能，方便地实现属性的约束检查。
- 将检查注解加持到实体属性上，例如：vip.efactory.ejpa.example.entity.Student
- 在请求到来时使用@Valid注解校验或者用工具类手动校验
- 本框架中使用工具类手动校验，返回自己需要的格式及国际化的特征。

# 属性检查核心代码
- 保存和更新时会自动校验属性约束：vip.efactory.ejpa.base.controller.BaseController
```java
/**
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
        ...省略其他代码
    }

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
    ... 省略其他部分的代码
    }
```
    说明：其实检查的关键是ValidateModelUtil工具类的validateModel方法。其中有：Default.class、 Create.class、Update.class分别表示默认校验组、创建校验组、更新校验组，  
接下来我们分别说明：
>默认校验组：有些属性不论是新增还是更新都需要检查的，用此组，默认可以不用写；  
>创建校验组：仅在新增时需要检查的属性，新增后不允许修改的，可以用此组，必须明确写出；  
>更新校验组：仅在更新时才检查的属性，例如主键ID不允许为空，可以用此组，必须明确写出；  
    注意：  默认组为JPA框架自带的，创建组与更新组为ejpa为了实际需要添加的！


# 属性检查的工具类核心实现
```
原理：validateModel方法根据传入的要校验的实体及校验组，找到所有要校验的属性，循环对每一个属性按照注解校验规则进行检查，  
如果检查通过则放行，否则开始处理收件校验信息：   
1、将注解里的message属性值取出来，例如 message= "{student.name} {property.length.in.between}"；  
2、将message值里面的大括号里的国际化key替换成对应的文本值；  
3、因为国家化文本值里面有可能还有占位符，例如：property.length.in.between=属性长度应在{min}-{max}之间  
4、因此需要再次将占位符替换掉,注意此时的占位符其实都是来源于注解指定的自己的属性值，　　
例如:@Length(min = 4, max = 8, message = "{student.name} {property.length.in.between}", groups = {Update.class, Default.class})　　
5、将最终的信息放入Map中进行返回。
```
## 代码实现如下：
```java
@Component
@Slf4j
public class ValidateModelUtil {
    private static ILocaleMsgSourceService localeMessageSourceService;

    //通过下面的方法为静态成员赋值!!!
    @Autowired
    public void setLocaleMessageSourceService(ILocaleMsgSourceService localeMessageSourceService) {
        ValidateModelUtil.localeMessageSourceService = localeMessageSourceService;
    }

    //验证某一个对象,可以指定激活哪个校验组，例如Update.class
    public static Map<String, String> validateModel(Object obj,Class<?>... groups) {

        //用于存储验证后的错误信息
        Map<String, String> errors = new TreeMap<>();
        Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

        //验证某个对象，其实也可以只验证其中的某一个属性的
        Set<ConstraintViolation<Object>> constraintViolations = validator.validate(obj, groups);
        Iterator<ConstraintViolation<Object>> iter = constraintViolations.iterator();

        while (iter.hasNext()) {
            ConstraintViolation<Object> currentObj = iter.next();   //再执行一次就会跳到下一个对象
            String message = currentObj.getMessage();      //校验要显示的错误信息
            String property = currentObj.getPropertyPath().toString();    //错误信息对应的字段名

            // log.info("property：" + property + ",check failed:" + message);

            //处理属性切分,例如：message="AAA{student.age}BBB {property.not.allow.negative}CCCC"
            if (message.contains("{") && message.contains("}")) {  //说明包含占位符{}
                String[] rawKeys = message.split("}");//得到：AAA{student.age、BBB {property.not.allow.negative、CCCC
                // 得到所有的key
                List<String> keys = new ArrayList<>();
                for (String rawKey : rawKeys) {
                    if (rawKey.contains("{")) {
                        String key = rawKey.substring(rawKey.lastIndexOf("{") + 1); //获取key,例如：student.age
                        keys.add(key);
                    }
                }
                // 替换message里的占位符
                for (String key : keys) {
                    String value = localeMessageSourceService.getMessage(key);
                    if (null == value || value.equals(key)) {
                        value = key;
                        log.warn("missing key [{}]", key);
                    }
                    message = message.replace("{" + key + "}", value);
                }

                // 替换message 里国际化信息里的占位符,使用注解自带的属性值占位，例如：{min}-{max}
                if (message.contains("{") && message.contains("}")) {
                    // 得到检查注解里的参数，以便再次替换模板里的占位符
                    Map<String, Object> params = currentObj.getConstraintDescriptor().getAttributes();
                    for (Map.Entry param : params.entrySet()) {
                        message = message.replace("{" + param.getKey() + "}", param.getValue().toString());
                    }
                }

                errors.put(property, message);
            } else {
                //是硬编码的校验信息，直接取过来
                errors.put(property, message);
            }

        }
        return errors;
    }
}
```

## 使用实例
- 实例代码：
```
/**
 * 学生表，用来测试接口是否正常
 * 对于校验注解，没有指定groups属性的，则默认是Default.class组，
 * 控制器里在save方法是使用默认组，
 * updateById,使用Update.class组,更新时允许部分字段为空，但是若有值则校验属性值的合法性
 */
@Setter
@Getter
@Entity
public class Student extends BaseEntity<Long> {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @NotNull(message = "id {property.not.allow.empty}", groups = Update.class)  // 意味着，updateById更新时id不允许为空
    private Long id;

    // 不论新增和更新都应符合要求
    @Length(min = 4, max = 8, message = "{student.name} {property.length.in.between}", groups = {Update.class, Default.class})
    // 意思是，新增时不允许为空，updateById更新时可为空！
    @NotBlank(message = "{student.name} {property.not.allow.empty}")
    private String name;

    @Range(min = 0, max = 2, message = "{student.sex} {property.value.in.range}")
    private Integer sex;    // 0 未知；1 男；2 女

    @PositiveOrZero(message = "{student.age} {property.not.allow.negative}")
    private Integer age;

    /**
     * 爱好,测试不使用国际化文件，直接硬编码返回！
     */
    @NotBlank(message = "爱好属性信息不允许为空")
    private String hobby;

    /**
     * 身高，单位cm，例如:180.6cm
     */
    @Max(value = 300, message = "{student.height}{property.value.should.lt.max}")
    private Double height;

    @Email(message = "{student.email}{property.format.error}")
    private String email;

    @Past(message = "{student.birthday}{property.value.only.past}")
    @JsonFormat(pattern = "yyyy-MM-dd", timezone = "GMT+8")
    @Temporal(TemporalType.DATE)
    private Date birthday;

}
```
- 注解message属性解析
```
    /**
     * 爱好,测试不使用国际化文件，直接硬编码返回！不会因为国际化环境变化而变化，非常不建议这样写！
     */
    @NotBlank(message = "爱好属性信息不允许为空")
    private String hobby;
    
    /**
     * name 字段有非空检查和长度检查，长度范围是4-8位
     * {student.name}和{property.length.in.between}将会取国际化资源文件里的key对应的值！
     */
    @Length(min = 4, max = 8, message = "{student.name} {property.length.in.between}")
    @NotBlank(message = "{student.name} {property.not.allow.empty}")
    private String name;
```
- 注解groups属性解析
```
 没有指定groups属性的，则默认是Default.class组，
 控制器(BaseController)里在save方法是使用默认组和创建组，
 updateById,使用默认组和Update.class组,更新时允许部分字段为空，但是若有值则校验属性值的合法性
```

在messages_zh_CN.properties文件中：
```
student.age=年龄
student.birthday=生日
student.email=邮件地址
student.height=身高
student.hobby=爱好
student.name=姓名
student.sex=性别
```
而{property.not.allow.empty}在common-i18n项目ValidationMessages_zh_CN.properties中：
```
property.not.allow.empty=属性不允许为空!
property.format.error=属性格式不正确!
property.length.in.between=属性长度应在{min}-{max}之间
property.value.should.gt.min=属性值不能小于{value}
property.value.should.lt.max=属性值不能大于{value}
property.not.allow.negative=属性值不允许为负数
property.not.allow.positive=属性值不允许为正数
property.value.only.past=属性值只允许为过去的日期时间
property.value.only.future=属性值只允许为将来的日期时间
property.value.in.range=属性值应在{min}-{max}范围之间
```

## 注意
- 对于校验文件的国际化文件里的占位符变量不能随便写，必须是校验注解自己的属性，因为现在校验注解不支持自己传递占位符参数。


## 额外可参考信息
@Valid注解和@Validated注解的区别：<https://www.cnblogs.com/myinspire/articles/7649027.html>
- @Valid是使用hibernate validation的时候使用
- @Validated 是只用spring  Validator 校验机制使用

- 网上其他网友使用案例：
```java
使用@Validated 注解的方式：
    @Log("新增部门")
    @ApiOperation("新增部门")
    @PostMapping
    @PreAuthorize("@el.check('dept:add')")
    public ResponseEntity<Object> create(@Validated @RequestBody Dept resources){
        if (resources.getId() != null) {
            throw new BadRequestException("A new "+ ENTITY_NAME +" cannot already have an ID");
        }
        return new ResponseEntity<>(deptService.create(resources),HttpStatus.CREATED);
    }

    @Log("修改部门")
    @ApiOperation("修改部门")
    @PutMapping
    @PreAuthorize("@el.check('dept:edit')")
    public ResponseEntity<Object> update(@Validated(Dept.Update.class) @RequestBody Dept resources){
        deptService.update(resources);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }

    
        @RequestMapping(value = "/page/add", method = RequestMethod.POST)
        @ResponseBody
        public ResultData addUrlRule(@Validated(AppConfigGroup.Add.class) AppConfigList appConfigList, BindingResult result, Model model) {
            // 后台校验
            if (ValidateHandler.validate(result, model)) {
                return null;
            }
            appConfigList.setStatus((byte) 1);
            appConfigList.setCreateTime(new Date());
            appConfigList.setModifTime(new Date());
            Double orders = appConfigService.selectOrdersByAppId(appConfigList.getAppId());
            if (orders == null) {
                appConfigList.setOrders((double) 1000);
            } else {
                appConfigList.setOrders(orders + 1000);
            }
            return getResult(appConfigService.insert(appConfigList));
        }
```

使用：@Valid注解的方式，具体参见：<https://www.cnblogs.com/happyflyingpig/p/8022881.html>
```java
    @RequestMapping("/add")
    public String addUser(@Valid @ModelAttribute("userModel") UserModel userModel, BindingResult bindingResult, Model model) {
        if (bindingResult.hasErrors()) {
            FieldError fieldError = bindingResult.getFieldError();
            String validMess = fieldError.getDefaultMessage();
            model.addAttribute("errors", validMess);
            return "error";
        }
        ...
        //用重定向防止页面刷新重复提交
        return "redirect: /user/index";
    }
```
