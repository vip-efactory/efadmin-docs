# 新增菜单

## 方式一: 使用代码生成相应的菜单
### 1.先利用代码生成生成需要的组件，然后下载压缩包
 会得到类似这样的一个压缩包：2021-03-31 21_14_14-tbl_employee.zip

### 2.解压缩包，得到结构如下：
```
├── efadmin                 这是后端生成文件的目录
└── efadmin-ui              这是前端生成文件的目录
```
进入后端代码的目录:2021-03-31 21_14_14-tbl_employee/efadmin/efadmin-system/src/main

```
├── java
│ └── vip
│     └── efactory
│         └── demo
│             ├── domain
│             │     └── Employee.java
│             ├── repository
│             │     └── EmployeeRepository.java
│             ├── rest
│             │     └── EmployeeController.java
│             └── service
│                 ├── IEmployeeService.java
│                 ├── dto
│                 │     ├── EmployeeDto.java
│                 │     └── EmployeeQueryCriteria.java
│                 ├── impl
│                 │     └── EmployeeServiceImpl.java
│                 └── mapper
│                       └── EmployeeMapper.java
└── resources
    └── i18n
        └── EmployeeMessages.properties         这就是新组件的菜单国际化内容
```
### 3.新组件的国际化菜单内容
Java代码没什么，我们看看EmployeeMessages.properties的内容，其实就是新组件对应的国际化菜单数据
```
# This i18n for Employee`s entity menu: zh_CN, put follow append to {messages_ui.properties,messages_ui_zh_CN.properties}
Menu.1.employee.manage=员工信息
Menu.2.employee.list=员工信息查询
Menu.2.employee.add=员工信息增加
Menu.2.employee.edit=员工信息编辑
Menu.2.employee.delete=员工信息删除

# This i18n for Employee`s entity menu: en_US, put follow append to messages_ui_en_US.properties
Menu.1.employee.manage=Employee
Menu.2.employee.list=Employee Query
Menu.2.employee.add=Employee Add
Menu.2.employee.edit=Employee Edit
Menu.2.employee.delete=Employee Delete
```
上面英文的含义是:  
员工实体菜单的i18n：zh_CN，将以下内容附加到项目的messages_ui.properties和messages_ui_zh_CN.properties文件中  
员工实体菜单的i18n：en_US，将以下内容附加到项目的messages_ui_en_US.properties文件中   
特别说明:   
Menu.1.employee.manage=Employee         其中的1标识是指菜单类型   
Menu.2.employee.list=Employee Query     其中的2标识是指按钮类型   

### 3.新组件的SQL内容
````
dusuanyun@mbp efadmin-ui % tree
└── src
    ├── api
    │   └── employee.js
    └── views
        └── system
            └── employee
                ├── MenuSQL.sql           这是生成的菜单SQL，编辑执行后数据库中就会有此菜单
                ├── i18n.js
                └── index.vue
````
注意MenuSQL.sql里面的数据插入部分
```sql
-- 插入组件的管理菜单权限 --
INSERT INTO `sys_menu` (`i_frame`, `name`, `component`, `pid`, `sort`, `icon`, `path`, `cache`, `hidden`, `component_name`, `permission`, `locale_key`,`type`) VALUES
(b'0', '员工信息管理', 'system/employee/index', 1, 999, 'zujian', 'employee', b'0', b'0', 'Employee', '', 'employee.manage', 1);

-- 插入常见的按钮的权限 --
INSERT INTO `sys_menu` (`i_frame`, `name`, `component`, `pid`, `sort`, `icon`, `path`, `cache`, `hidden`, `component_name`, `permission`, `locale_key`, `type`) VALUES
(b'0', '员工信息查询', '', pId, 1, '', '', b'0', b'0', '', 'employee:list', 'employee.list', 2),
(b'0', '员工信息新增', '', pId, 2, '', '', b'0', b'0', '', 'employee:add', 'employee.add', 2),
(b'0', '员工信息编辑', '', pId, 3, '', '', b'0', b'0', '', 'employee:edit', 'employee.edit', 2),
(b'0', '员工信息删除', '', pId, 4, '', '', b'0', b'0', '', 'employee:del', 'employee.delete', 2);

```
locale_key 字段值要和EmployeeMessages.properties里的内容一致，否则国际化抓取对应的文件时，会不匹配。   
最终的国际化key查找是：Menu. + 菜单类型或者按钮类型(1或者2). + locale_key   


## 方式二: 手动添加菜单
从上面的自动化生成我们知道，如果需要手动增加一条菜单，可以在前端系统的菜单里增加一个菜单(也可以直接在数据库新增一条SQL记录)，然后到数据库里找到这条记录指定它的locale_key字段值。
最后在messages_ui.properties、messages_ui_zh_CN.properties、messages_ui_en_US.properties中写上对应的最终key即可。    
  
