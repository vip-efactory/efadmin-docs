# 逻辑删除(软删除)　　
有时候我们在项目中需要对数据进行软删除，并不是真的删除数据只是打上删除标记(因为真删除可能导致重要数据丢失)，并对数据CRUD操作进行删除标记过滤，这样对用户来说数据就好像真的被删除了一样;
这样的好处是被删除的数据还可以从数据库里找回来，让自己有了一次可以后悔的机会．  

# SpringDataJpa实现软删除方式
##在实体中提供删除标记字段  
例如:
```java
    /**
    * 删除标记:0未删除;1已删除,不要使用Boolean,否则默认值不会传到数据库
    */
    @Column(name = "deleted")
    @ApiModelProperty(value = "删除标记:0未删除;1已删除", dataType = "boolean", hidden = true)
    private boolean deleted = false;
```

##在实现上方增加删除和查询过滤的方法
例如:
```java
@SQLDelete(sql = "update tree_tree_book set deleted = 1 where id = ?")     //单个删除
@SQLDeleteAll(sql = "update tree_tree_book set deleted = 1 where id in (?)")  // 批量删除
@Where(clause = "deleted = 0")
```
附一个完整实体的例子：
```java
package vip.efactory.frms.data.domain;

import cn.hutool.core.bean.BeanUtil;
import cn.hutool.core.bean.copier.CopyOptions;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLDeleteAll;
import org.hibernate.annotations.Where;
import vip.efactory.common.base.valid.Update;
import vip.efactory.ejpa.base.entity.BaseEntity;

import javax.persistence.*;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import java.math.BigDecimal;

/**
 * 族谱 实体
 *
 * @author dbdu
 * @date 2020-10-20
 */
@Entity
@Data
@Table(name = "tree_tree_book")
@ApiModel(value = "族谱实体", description = "族谱实体管理")
@SQLDelete(sql = "update tree_tree_book set deleted = 1 where id = ?")
@SQLDeleteAll(sql = "update tree_tree_book set deleted = 1 where id in (?)")
@Where(clause = "deleted = 0")
public class TreeBook extends BaseEntity<Long> {
	private static final long serialVersionUID = 1L;

	/**
	 * pk
	 */
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@NotNull(groups = Update.class)
	@Column(name = "id")
	@ApiModelProperty(value = "pk", dataType = "Long")
	private Long id;

	/**
	 * 族谱名称
	 */
	@Column(name = "name", nullable = false)
	@NotBlank
	@ApiModelProperty(value = "族谱名称", dataType = "String", required = true)
	private String name;

	/**
	 * 作者或者主编
	 */
	@Column(name = "author", nullable = false)
	@NotBlank
	@ApiModelProperty(value = "作者或者主编", dataType = "String", required = true)
	private String author;

	/**
	 * ISBN号
	 */
	@Column(name = "isbn")
	@ApiModelProperty(value = "ISBN号", dataType = "String")
	private String isbn;

	/**
	 * 族谱定价(元)
	 */
	@Column(name = "price")
	@ApiModelProperty(value = "族谱定价(元)", dataType = "BigDecimal")
	private BigDecimal price;

	/**
	 * 出版日期
	 */
	@Column(name = "publish_date")
	@ApiModelProperty(value = "出版日期", dataType = "String")
	private String publishDate;

	/**
	 * 出版商/出版社
	 */
	@Column(name = "publisher")
	@ApiModelProperty(value = "出版商/出版社", dataType = "String")
	private String publisher;

	/**
	 * 族谱版本
	 */
	@Column(name = "version")
	@ApiModelProperty(value = "族谱版本", dataType = "String")
	private String version;

	/**
	 * 已删除标记: 0 未删除; 1 已删除
	 */
	@Column(name = "deleted",columnDefinition = "BIT(1) NULL COMMENT '删除标记:0未删除;1已删除'")
	@ApiModelProperty(value = "已删除标记: 0 未删除; 1 已删除", dataType = "boolean")
	private boolean deleted = false;

	/** 备注 */
	// remark extends from BaseEntity

	/** 创建时间 */
	// createTime extends from BaseEntity

	/** 创建人 */
	// creatorNum extends from BaseEntity

	/** 更新时间 */
	// updateTime extends from BaseEntity

	/**
	 * 更新人
	 */
	// updaterNum extends from BaseEntity
	public void copy(TreeBook source) {
		BeanUtil.copyProperties(source, this, CopyOptions.create().setIgnoreNullValue(true));
	}
}
```
说明:  
细心的朋友可能已经发现，我们在java属性里的boolean属性用的是false/true,而实体上过滤条件里用的却是0或者1,那是因为在MySQL中0可以表示false,1表示true.

##实际Service中使用
```java
// 批量删除               
@Override   
@CacheEvict(allEntries = true)   
@Transactional   
public int deleteAllById(Iterable<Long> ids) {      
    List<TreeBook> treeBooks = br.findAllById(ids);      
    super.deleteAll(treeBooks);                  // 测试会使用定义的删除方法      
    return treeBooks.size();
    // return super.deleteAllById(ids);           // 使用这个方法删除,不会触发2中定义的删除方法,会导致真删除!!   
}

// 单个删除
@Override
public void deleteById(ID var1) {    
    br.deleteById(var1);                          // 测试会使用定义的删除方法
}
```
super部分的代码如下:
```java
public class BaseServiceImpl<T extends BaseEntity, ID, BR extends BaseRepository> extends Observable implements IBaseService<T, ID>, Observer {
    
    // 省略其他的代码 ///
    @PersistenceContext
    protected EntityManager em;
    /**
     * Description:注入需要的Repository接口的代理类
     *
     * @author dbdu
     * @date 18-6-25 下午4:14
     */
    @Autowired
    public BR br;    

    @Override
    public int deleteAllById(Iterable<ID> var1) {
        String hql = "delete from " + clazz.getSimpleName() + " t where t.id in (?1)";
        Query query = em.createQuery(hql);
        query.setParameter(1, var1);
        int result = query.executeUpdate();
        return result;
    }

    @Override
    public void deleteAll() {
        br.deleteAll();
    }

    @Override
    public void deleteById(ID var1) {
        br.deleteById(var1);
    }
}
```
从上看出,deleteAllById方法没有生效过滤条件是因为手动拼写了hql执行了.

###经测试执行批量或单个删除时,终端执行显示的sql是:
```sql
update tree_tree_book set deleted = 1 where id in (1)
```
## 注意
**从上面可知,JPA中并不是所有的删除都会调用实体上定义的方法(尤其是自己手动SQL/HQL实现)!这个一定要注意!  
如果不确定请测试后选择对应的删除方法进行使用!!!**