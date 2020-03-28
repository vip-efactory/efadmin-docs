# 高级搜索界面使用
```
特别说明，此处的UI说明部分基于efadmin-ui项目，后端处理引擎是ejpa。
在efadmin-ui项目中，高级搜索被集成进CRUD模块中，因此在有列表的地方基本上就有高级搜索的入口按钮。
```
# 以操作日志搜索进行说明
## 打开操作日志的列表界面
![高级搜索按钮](https://github.com/vip-efactory/efadmin-ui/raw/master/public/adSearch/adSearhBtn.png)
## 点击上图中的高级搜索按钮
![高级搜索主界面](https://github.com/vip-efactory/efadmin-ui/raw/master/public/adSearch/mainUI.png)  
    说明：efadmin-ui中引入了模态框移动的功能，因此，可以拖住高级搜索的标题栏可以进行移动。

### 条件类型说明
- 单个条件
```
只有一个查询条件时，选择此项，而每个查询条件有13中查询方法可供选择。
例如：模糊查询姓名中有敏字的人
```
- 多个条件
```
当有多个查询条件时选择此项，多个查询条件之间的关系可以都满足(AND关系)或者满足其中之一(OR关系)  
例如：查询姓名为王伟且年龄为35岁的记录。查询姓名为王伟或者年龄为35岁的记录。
```
- 有括号组的查询条件
```
有两个组条件，每一组条件在后台其实使用括号包裹的，例如
第一组条件：查询姓名为王伟或者年龄为35岁的记录。
第一组条件：查询身高为160cm且体重为50KG的记录。
第一组和第二组的关系是满足一个即可    那就是组的或关系，类似sql:（name=王伟 || age=35）|| （height=160 && weight=50）
第一组和第二组的关系是都要满足即可    那就是组的与关系，类似SQL是：（name=王伟 || age=35）&& （height=160 && weight=50）
name和age在同一个括号内，即同一个组内；
height和weight在第二个括号内，即都属于另外一个组。
```

### 选择查询字段
![选择要查询的字段](https://github.com/vip-efactory/efadmin-ui/raw/master/public/adSearch/selectField.png)  
有哪些字段可以进行查询，是通过代码配置的，后面会讲到。  
目前支持的后端数据类型有：String、Date、所有数字型、所有浮点型、数字型表示的布尔型，bit型表示的布尔型目前支持的不是很好。

### 选择字段的查询方式，
![字段的查询方法](https://github.com/vip-efactory/efadmin-ui/raw/master/public/adSearch/queryMethod.png)  
目前总共有13种查询方式，分别是：  
全模糊，左模糊，右模糊、等于，不等于、区间范围查询、大于，小于，大于等于，小于等于、空值，非空值、包含查询。  
其中包含查询，例如查询姓名是王伟和李超的记录，值用逗号分隔；
>后续会考虑根据值的类型屏蔽不支持的查询方法。

### 输入查询对应的值
![查询条件的值](https://github.com/vip-efactory/efadmin-ui/raw/master/public/adSearch/fieldValue.png)  
    说明：
 >1. 空值和非空值查询此字段不需要填写；范围查询时，需要输入开始值和结束值。
 >2. 值的格式应是数据库里格式或者json的格式，否则会错误；
 >3. 目前值是自己手写输入，后期会考虑根据值类型使用不同的控件，例如时间选择控件。


### 条件区
![条件区](https://github.com/vip-efactory/efadmin-ui/raw/master/public/adSearch/fieldArea.png)  
选择好条件后单击【加入条件区】按钮，条件就会进入条件区，在条件区里目前可以删除已有条件，但是不支持直接修改。  
如果是单条件查询，此处只允许有一个条件！

### 执行查询
单击主图中的【搜索】按钮就会执行高级搜索，点击【清除所有查询条件】按钮就会清空条件区。  
此高级查询支持分页功能，查询后可以在列表区翻页请求下一页数据。

### 对于多条件查询时
![多条件](https://github.com/vip-efactory/efadmin-ui/raw/master/public/adSearch/mutiField.png)  
参数顺序：是指当多个条件时的优先顺序，值越小越靠前，默认为0；  
满足状况: 是指当前条件是必须要满足还是可满足也可不满足。

### 对于分组查询时
![分组查询](https://github.com/vip-efactory/efadmin-ui/raw/master/public/adSearch/groupField.png)  
所属分组：是指当前条件属于哪个括号组，是默认组还是其他组；
组关系：是指当前分组的逻辑关系是必须要满足还是可满足也可不满足。
>目前仅支持两个括号组，太多组用户来数用点复杂了！
