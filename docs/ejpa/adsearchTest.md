# 高级搜索接口测试

# 请求的方法类型：
- 因为高级查询需要携带很多的参数，故所有的请求都是POST方法！

# 单个条件高级搜索：
- 支持13种常见的操作，具体参见：vip.efactory.ejpa.base.enums.SearchTypeEnum
```
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
    IN(12, "包含查询"),             // 3.4+ ,内置暂不支持not in查询！除非手写hql或sql实现
    ;
    ...
}
```

# 多个条件：
- 所有默认或关系：A=4 || B=7 || C > 8       // 1.0+
- 所有条件与关系：A=4 && B=7 && C > 8       // 1.0+

- 与或混合关系：                            // 3.0+
    - A=4 && B=7 || C > 8
- 半混合关系：(含有括号组)                  // 3.0+
    - A=4 && B =7 && (C =9 || C =11)
    - A=4 || B =7 || (C =9 && D =11)
- 全混合关系：(含有括号组)                  // 3.0+
    - (A = 4 || B = 7) && (C =9 || C =11 )
    - (A = 4 && B = 7) || (C =9 && D =11 )

# 关于条件定义说明
- 具体参见：vip.efactory.ejpa.base.entity.BaseSearchField，说明说明如下：
```
    name： 搜索字段名，例如:是name字段或者age字段查询，非空必填

    searchType：搜索类型，例如:0--模糊查询;1--等于查询;2--范围查询;3--不等于查询;4--小于查询;5--小于等于查询;6--大于查询;7--大于等于查询... 非空必填

    val：字段值或开始值，范围查询时为开始值，NULL或NOT NULL查询时可为空；

    val2:结束值，仅在范围查询时需要；其他情况可为空

    order：条件位置顺序，条件在前面还是在后面，有则使用！可为空。

    logicalType：条件逻辑类型，当前条件与其他条件之间的或与关系。

    bracketsGroup：括号组名，哪些条件在同一个组里，例如：（a=3 || b=4） && （c=5 || d=7），a条件和b条件就属于同一个组，应具有相同的组名，组名除默认外可任意命名。

    logicalTypeGroup：组逻辑类型，组逻辑类型,当前组条件是与的关系还是或的关系，0为或的关系，1为与的关系，若为空，默认为0，即：
    是||（a=3 || b=4）
    还是 &&（c=5 || d=7）的关系
    注意，同一个组内的本字段值必须相同！
```



# 关于默认值的说明：
```
  searchType：  条件的搜索类型，若为空则为0，默认为模糊搜索方式；
  order：       条件的位置顺序，若为空则为0，默认为第一位；
  logicalType： 条件与其他条件的逻辑关系，若为空则为0，默认为或的关系；
  logicalTypeGroup：组括号与其他组括号的逻辑关系，若为空则为0，默认为或的关系；
  bracketsGroup：括号组的名称，若为空则默认为：DEFAULT_NO_GROUP，自己的组名要避免和默认组相同，除非你不指定组。
  
```

# 单条件搜索案例：
## 1.最简单的NULL和NOT NULL查询
```
 NULL条件： 查询email字段值为null的记录
{
    "conditions": [
        {
            "name":"email",
            "searchType": 8
        }
        ]
}
终端生成SQL条件：where student0_.email is null ...
 NOT NULL条件：查询email字段值不为null的记录
{
    "conditions": [
        {
            "name":"email",
            "searchType": 9
        }
        ]
}
终端生成SQL条件：where student0_.email is not null ...

```
以下为测试图片：
![image](https://gitee.com/vip-efactory/ejpa-example/raw/master/src/main/resources/static/usage/advQuery/%E5%8D%95%E6%9D%A1%E4%BB%B6%E6%9F%A5%E8%AF%A2/1-ISNULL-Query.png)
![image](https://gitee.com/vip-efactory/ejpa-example/raw/master/src/main/resources/static/usage/advQuery/%E5%8D%95%E6%9D%A1%E4%BB%B6%E6%9F%A5%E8%AF%A2/1-NOTNULL-Query.png)

## 2.模糊查询，左模糊，右模糊
```
全模糊查询：只要包含即可：
{
    "conditions": [
        {
            "name":"name",
            "searchType": 0,
            "val": "my"
        }
        ]
}

左模糊查询：--以XXX结尾的
{
    "conditions": [
        {
            "name":"name",
            "searchType": 10,
            "val":"chuo"
        }
        ]
}

右模糊查询：--以XXX开头的
{
    "conditions": [
        {
            "name":"name",
            "searchType": 11,
            "val": "joy"
        }
        ]
}
终端SQL条件都是【student0_.name like ?】，都是？问号自身的值却是不同的，实现如下：
// 0 或其他情况,则为模糊查询,FUZZY(0, "模糊查询"),
    fieldP = cb.like(root.get(key), "%" + val + "%");
// LEFT_LIKE(10, "左模糊查询"),
    fieldP = cb.like(root.get(key), "%" + val);
// RIGHT_LIKE(11, "右模糊查询")
    fieldP = cb.like(root.get(key), val + "%");
```
以下为测试图片：
全模糊查询：
![image](https://gitee.com/vip-efactory/ejpa-example/raw/master/src/main/resources/static/usage/advQuery/%E5%8D%95%E6%9D%A1%E4%BB%B6%E6%9F%A5%E8%AF%A2/2-Fuzzy-Query.png)
左模糊查询：
![image](https://gitee.com/vip-efactory/ejpa-example/raw/master/src/main/resources/static/usage/advQuery/%E5%8D%95%E6%9D%A1%E4%BB%B6%E6%9F%A5%E8%AF%A2/2-LeftFuzzy-Query.png)
右模糊查询：
![image](https://gitee.com/vip-efactory/ejpa-example/raw/master/src/main/resources/static/usage/advQuery/%E5%8D%95%E6%9D%A1%E4%BB%B6%E6%9F%A5%E8%AF%A2/2-RightFuzzy-Query.png)

## 3.等于查询、不等于查询
```
= 查询
{
    "conditions": [
        {
            "name":"age",
            "searchType": 1,
            "val": "45"
        }
        ]
}
终端打印的SQL条件：where student0_.age=45

!= 查询
{
    "conditions": [
        {
            "name":"age",
            "searchType": 3,
            "val": "30"
        }
        ]
}
终端打印的SQL条件：where student0_.age<>30

```
以下为测试图片：
= 查询：
![image](https://gitee.com/vip-efactory/ejpa-example/raw/master/src/main/resources/static/usage/advQuery/%E5%8D%95%E6%9D%A1%E4%BB%B6%E6%9F%A5%E8%AF%A2/3-EqualQuery.png)
!= 查询
![image](https://gitee.com/vip-efactory/ejpa-example/raw/master/src/main/resources/static/usage/advQuery/%E5%8D%95%E6%9D%A1%E4%BB%B6%E6%9F%A5%E8%AF%A2/3-NotEqualQuery.png)

## 4.区间范围查询
```
{
    "conditions": [
        {
            "name":"age",
            "searchType": 2,
            "val": "32",
            "val2":"36"
        }
        ]
}
终端打印的SQL条件：where student0_.age between 32 and 36 
```
测试图片：
![image](https://gitee.com/vip-efactory/ejpa-example/raw/master/src/main/resources/static/usage/advQuery/%E5%8D%95%E6%9D%A1%E4%BB%B6%E6%9F%A5%E8%AF%A2/4-BetweenQuery.png)

## 5.小于、小于等于、大于、大于等于
```
小于条件：
{
    "conditions": [
        {
            "name":"age",
            "searchType": 4,
            "val": "34"
        }
        ]
}
终端打印的SQL条件： where student0_.age<34

小于等于条件：
{
    "conditions": [
        {
            "name":"age",
            "searchType": 5,
            "val": "30"
        }
        ]
}
终端打印的SQL条件：student0_.age<=30

大于条件：
{
    "conditions": [
        {
            "name":"age",
            "searchType": 6,
            "val": "34"
        }
        ]
}
终端打印的SQL条件：where student0_.age>34

大于等于条件：
{
    "conditions": [
        {
            "name":"age",
            "searchType": 7,
            "val": "34"
        }
        ]
}
终端打印的SQL条件：where student0_.age>=34
```
测试图片：
小于条件：
![image](https://gitee.com/vip-efactory/ejpa-example/raw/master/src/main/resources/static/usage/advQuery/%E5%8D%95%E6%9D%A1%E4%BB%B6%E6%9F%A5%E8%AF%A2/5-LT-Query.png)
小于等于条件：
![image](https://gitee.com/vip-efactory/ejpa-example/raw/master/src/main/resources/static/usage/advQuery/%E5%8D%95%E6%9D%A1%E4%BB%B6%E6%9F%A5%E8%AF%A2/5-LE-Query.png)
大于条件：
![image](https://gitee.com/vip-efactory/ejpa-example/raw/master/src/main/resources/static/usage/advQuery/%E5%8D%95%E6%9D%A1%E4%BB%B6%E6%9F%A5%E8%AF%A2/5-GT-Query.png)
大于等于条件：
![image](https://gitee.com/vip-efactory/ejpa-example/raw/master/src/main/resources/static/usage/advQuery/%E5%8D%95%E6%9D%A1%E4%BB%B6%E6%9F%A5%E8%AF%A2/5-GE-Query.png)

# 多条件搜索案例：
## 多条件不包含括号组
### 所有条件均为OR关系，即所有条件只要有一个即可
    ```
    {
    "conditions": [
    	 {
            "name":"name",
            "searchType": 0,
            "val": "chuo"
        },
        {
            "name":"age",
            "searchType": 1,
            "val": "45"
        }
        ]
    }
    终端打印的SQL条件：where student0_.name like ? or student0_.age=45
    给name条件指定位置顺序：
    {
    "conditions": [
    	 {
            "name":"name",
            "searchType": 0,
            "val": "chuo",
            "order":"2"
        },
        {
            "name":"age",
            "searchType": 1,
            "val": "45"
        }
        ]
    }
    终端打印的SQL条件：where student0_.age=45 or student0_.name like ?
    可见name条件在age条件后面了！
    ```

### 所有条件均为AND关系，即所有条件都要满足
    ```
    {
    "conditions": [
    	 {
            "name":"name",
            "searchType": 0,
            "val": "chuo",
            "logicalType":1
        },
        {
            "name":"age",
            "searchType": 1,
            "val": "45",
            "logicalType":1
        }
        ]
    }
    终端打印的SQL条件：where student0_.age=45 and (student0_.name like ?)
    ```
    说明：上面两种应是最常见的方式。其实可以通过指定order和logicalType的值，实现很复杂的关系。例如：A =2 && B=3 || C=4 && D=5，当然这样的条件有没有效就是另外一回事了。

## 多条件包含括号组
### 包含一个组
     ```
     分组AND关系：
     {
    "conditions": [
    	 {
            "name":"name",
            "searchType": 0,
            "val": "chuo",
            "logicalType":1
        },
        {
            "name":"age",
            "searchType": 1,
            "val": "45",
            "bracketsGroup":"AAA",
            "logicalTypeGroup":1
        },
         {
            "name":"id",
            "searchType": 1,
            "val": "3",
            "bracketsGroup":"AAA",
            "logicalTypeGroup":1
        }
        ]
    }
    终端打印的SQL条件 ：where (student0_.name like ?) and (student0_.id=3 or student0_.age=45) 
    
    分组OR关系：
    {
    "conditions": [
    	 {
            "name":"name",
            "searchType": 0,
            "val": "chuo",
            "logicalType":1
        },
        {
            "name":"age",
            "searchType": 1,
            "val": "45",
            "bracketsGroup":"AAA",
            "logicalTypeGroup":0
        },
         {
            "name":"id",
            "searchType": 1,
            "val": "3",
            "bracketsGroup":"AAA",
            "logicalTypeGroup":0
        }
        ]
    }
    终端打印的SQL条件 ：where student0_.name like ? or student0_.id=3 or student0_.age=45
     从此处看出，如果都是or的关系，就算有分组信息，最终实现也会被优化掉！
     ```

### 包含两个组
    ```
    {
    "conditions": [
        {
            "name":"age",
            "searchType": 1,
            "val": "45",
            "logicalTypeGroup":1
        },
         {
            "name":"id",
            "searchType": 1,
            "val": "3",
            "logicalTypeGroup":1
        },
          {
            "name":"sex",
            "searchType": 1,
            "val": "1",
            "bracketsGroup":"BBB",
            "logicalTypeGroup":1
        },
           {
            "name":"email",
            "searchType": 8,
            "bracketsGroup":"BBB",
            "logicalTypeGroup":1
        }
        ]
    }
     终端打印的SQL条件 ：where (student0_.id=3 or student0_.age=45) and (student0_.email is null or student0_.sex=1)
     说明：前2个条件没有指定组，则是默认组！
     
     
    明确指定两个组的组名：
    {
    "conditions": [
        {
            "name":"age",
            "searchType": 1,
            "val": "45",
            "bracketsGroup":"AAA",
            "logicalTypeGroup":1
        },
         {
            "name":"id",
            "searchType": 1,
            "val": "3",
            "bracketsGroup":"AAA",
            "logicalTypeGroup":1
        },
          {
            "name":"sex",
            "searchType": 1,
            "val": "1",
            "bracketsGroup":"BBB",
            "logicalTypeGroup":1
        },
           {
            "name":"email",
            "searchType": 8,
            "bracketsGroup":"BBB",
            "logicalTypeGroup":1
        }
        ]
    }
     终端打印的SQL条件：where (student0_.id=3 or student0_.age=45) and (student0_.sex=1 or student0_.email is null)
    
    ```
    
    其他说明： 理论上可以支持多分组，但是两个分组已经可以满足大多数的场景，若后面有需要，可以增加组顺序groupOrder属性来加强！

# 前端使用实例
 可以参见系统中已有的一些模块,例如操作日志模块
 src/views/monitor/log/index.vue中67行定义了高级搜索支持的字段:
```js
const adSearchFields = [{ fieldName: 'username', labelName: i18n.t('log.username'), type: 'text' },
 { fieldName: 'requestIp', labelName: i18n.t('log.requestIp'), type: 'text' },
 { fieldName: 'address', labelName: i18n.t('log.address'), type: 'text' },
 { fieldName: 'description', labelName: i18n.t('log.description'), type: 'text' },
 { fieldName: 'browser', labelName: i18n.t('log.browser'), type: 'text' },
 { fieldName: 'time', labelName: i18n.t('log.time'), type: 'number' },
 { fieldName: 'createTime', labelName: i18n.t('be.createTime'), type: 'date' }] // 需要高级搜索的字段
```
## 使用说明
adSearchFields 常量就是一个包含对象的数组,数组中对象的属性有:
```
fieldName: 字段名, 用户选择时看不见,仅在条件区可见,必须有 
labelName: 显示名, 选择时可以看到的名称,必须有
type: 当前字段类型,根据不同的类型使用不同的输入组件,以提高用户体验,支持text,number,date,datetime,dict. 可选,默认为text
dicts: 字典明细,可选,仅当type为dict时,这个属性则必须有;
```
dicts的结构说明:案例参见src/views/system/user/index.vue  
dicts: [{ label: '启用(Active)', value: 1 }, { label: '停用(Disable)', value: 0 }]
```
label: 下拉选择时看到的名字
value: 名字对应的值
```

## 其他说明
目前字典dicts是通过上面写入实现的,这种优点是灵活,就算不是字典也可以用这种方式传入,缺点是系统的字典无法直接传入使用,如果您有更好的想法欢迎加群告知.