# 利用观察者模式实现多表联合查询的结果缓存的一致性

## 场景说明:
在现实生活中，经常有关联表查询的需求，如果不进行数据缓存，频繁查询数据库对数据库压力很大，如果缓存了又可能导致缓存不一致。  
例如：有A/B/C三个表，A依赖B，B依赖C，前端页面上可能会要求显示ABC三张表里的字段信息，如果此时在A表中进行关联查询，并且结果缓存了，那么对B和C的新增修改及删除都可能导致
A表中缓存的数据与数据库中不一致了。

## 解决思路：
因为A表依赖BC表，只要BC表数据变更，就更新A的缓存或者清除A的缓存。

## 实现原理：
ABC的service层实现，都是观察者和被观察者角色，A观察BC，
C更新了数据，则通知B和A各自更新自己的缓存，B更新了数据，则通知A更新或清除A的缓存。

## 重要说明:
本文虽说是观察者模式，其实和真正的观察者模式还是有些区别的，但是其实核心还是观察者的思想原理。

## 代码实现如下：
    有两套实现ejpa和embp的，类似的，本文以embp的实现进行说明！
- embp:   1.0.0+  
- ejpa:   4.0.0+  

### 基础的观察者及被观察者模型：
- 继承BaseObservable，说明自己可以被别人观察，因此需要实现注册观察者及通知观察者的方法;
- 实现BaseObserver说明自己也可以观察别人，别人更新了则需要更新自己的缓存！
```java
/**
 * Description: 尝试基于观察者模式的缓存一致性基类service
 * 注意，此处就是jdk的java.util.Observable的实现，之所以存在是为了解开java中类不能多继承的死结
 * 本类中的泛型参数，其实没有使用到，只是为了子类继承传递的需要而已
 * @author dbdu
 */
@Slf4j
public abstract class BaseObservable<M extends BaseMapper<T>, T> extends ServiceImpl<M,T> {

    private boolean changed = false;
    private Vector<BaseObserver<M, T>> obs;

    /**
     * Construct an Observable with zero BaseObservers.
     */

    public BaseObservable() {
        obs = new Vector<>();
    }

    /**
     * Adds an observer to the set of observers for this object, provided
     * that it is not the same as some observer already in the set.
     * The order in which notifications will be delivered to multiple
     * observers is not specified. See the class comment.
     *
     * @param o an observer to be added.
     * @throws NullPointerException if the parameter o is null.
     */
    public synchronized void addBaseObserver(BaseObserver<M, T> o) {
        if (o == null) {
            throw new NullPointerException();
        }
        if (!obs.contains(o)) {
            obs.addElement(o);
        }
    }

    /**
     * Deletes an observer from the set of observers of this object.
     * Passing <CODE>null</CODE> to this method will have no effect.
     *
     * @param o the observer to be deleted.
     */
    public synchronized void deleteBaseObserver(BaseObserver<M, T> o) {
        obs.removeElement(o);
    }

    /**
     * If this object has changed, as indicated by the
     * <code>hasChanged</code> method, then notify all of its observers
     * and then call the <code>clearChanged</code> method to
     * indicate that this object has no longer changed.
     * <p>
     * Each observer has its <code>update</code> method called with two
     * arguments: this observable object and <code>null</code>. In other
     * words, this method is equivalent to:
     * <blockquote><tt>
     * notifyBaseObservers(null)</tt></blockquote>
     */
    public void notifyBaseObservers() {
        notifyBaseObservers(null);
    }

    /**
     * If this object has changed, as indicated by the
     * <code>hasChanged</code> method, then notify all of its observers
     * and then call the <code>clearChanged</code> method to indicate
     * that this object has no longer changed.
     * <p>
     * Each observer has its <code>update</code> method called with two
     * arguments: this observable object and the <code>arg</code> argument.
     *
     * @param arg any object.
     */
    public void notifyBaseObservers(Object arg) {
        /*
         * a temporary array buffer, used as a snapshot of the state of
         * current BaseObservers.
         */
        Object[] arrLocal;

        synchronized (this) {
            /* We don't want the BaseBaseObserver doing callbacks into
             * arbitrary code while holding its own Monitor.
             * The code where we extract each Observable from
             * the Vector and store the state of the BaseBaseObserver
             * needs synchronization, but notifying observers
             * does not (should not).  The worst result of any
             * potential race-condition here is that:
             * 1) a newly-added BaseBaseObserver will miss a
             *   notification in progress
             * 2) a recently unregistered BaseBaseObserver will be
             *   wrongly notified when it doesn't care
             */
            if (!changed) {
                return;
            }
            arrLocal = obs.toArray();
            clearChanged();
        }

        for (int i = arrLocal.length - 1; i >= 0; i--) {
            ((BaseObserver<M, T>) arrLocal[i]).update(this, arg);
        }
    }

    /**
     * Clears the observer list so that this object no longer has any observers.
     */
    public synchronized void deleteBaseObservers() {
        obs.removeAllElements();
    }

    /**
     * Marks this <tt>Observable</tt> object as having been changed; the
     * <tt>hasChanged</tt> method will now return <tt>true</tt>.
     */
    protected synchronized void setChanged() {
        changed = true;
    }

    /**
     * Indicates that this object has no longer changed, or that it has
     * already notified all of its observers of its most recent change,
     * so that the <tt>hasChanged</tt> method will now return <tt>false</tt>.
     * This method is called automatically by the
     * <code>notifyBaseObservers</code> methods.
     *
     */
    protected synchronized void clearChanged() {
        changed = false;
    }

    /**
     * Tests if this object has changed.
     *
     * @return <code>true</code> if and only if the <code>setChanged</code>
     * method has been called more recently than the
     * <code>clearChanged</code> method on this object;
     * <code>false</code> otherwise.
     */
    public synchronized boolean hasChanged() {
        return changed;
    }

    /**
     * Returns the number of observers of this <tt>Observable</tt> object.
     *
     * @return the number of observers of this object.
     */
    public synchronized int countBaseObservers() {
        return obs.size();
    }
}
```
```java
/**
 * 本类中的泛型参数，其实没有使用到，只是为了子类继承传递的需要而已
 * @param <M> mapper
 * @param <T> entity
 */
public interface BaseObserver<M extends BaseMapper<T>, T> {
    /**
     * This method is called whenever the observed object is changed. An
     * application calls an <tt>Observable</tt> object's
     * <code>notifyObservers</code> method to have all the object's
     * observers notified of the change.
     *
     * @param   o     the observable object.
     * @param   arg   an argument passed to the <code>notifyObservers</code>
     *                 method.
     */
    void update(BaseObservable<M, T> o, Object arg);
}
```

### 基础的服务层实现分别继承和实现接口
```java
public class BaseServiceImpl<T extends BaseEntity<T>, M extends BaseMapper<T>>
        extends BaseObservable<M, T>
        implements IBaseService<T>, BaseObserver<M, T> {

        //// 此处省略了一些其他代码////

    // ######################################################################################
    // 注意下面的三个方法是是维护多表关联查询结果缓存的一致性的，除非你知道在做什么，否则不要去修改!         #
    // 三个方法是：registObservers,notifyOthers,update                                        #
    // 此处使用了jdk自带的观察者的设计模式。  当前对象既是被观察者，也是观察者!                          #
    // ######################################################################################

    /**
     * 注册观察者,即哪些组件观察自己，让子类调用此方法实现观察者注册
     */
    @Override
    public void registObservers(BaseObserver... baseObservers) {
        for (BaseObserver baseObserver : baseObservers) {
            this.addBaseObserver(baseObserver);
        }
    }

    /**
     * 自己的状态改变了，通知所有依赖自己的组件进行缓存清除，
     * 通常的增删改的方法都需要调用这个方法，来维持 cache right!
     * @param arg 通知观察者时可以传递礼物arg，即数据，如果不需要数据就传递null;
     */
    @Override
    public void notifyOthers(Object arg) {
        //注意在用Java中的Observer模式的时候下面这句话不可少
        this.setChanged();
        // 然后主动通知， 这里用的是推的方式
        this.notifyBaseObservers(arg);
        // 如果用拉的方式，这么调用
        // this.notifyBaseObservers();
    }

    /**
     * 这是观察别人，别人更新了之后来更新自己的
     * 其实此处不需要被观察者的任何数据，只是为了知道被观察者状态变了，自己的相关缓存也就需要清除了，否则不一致
     * 例如：观察Ａ对象，但是Ａ对象被删除了，那个自己这边关联查询与Ａ有关的缓存都应该清除
     * 子类重写此方法在方法前面加上清除缓存的注解，或者在方法体内具体执行一些清除缓存的代码。
     *
     * @param o   被观察的对象
     * @param arg 传递的数据
     */
    @Override
    public void update(BaseObservable o, Object arg) {
    }
}
```
- 上面观察者可能会收到更新者发送的数据对象arg，为了规范处理，特定义了一个通用的类来表示，如下：
```java
/**
 * Description: 这个类是缓存一致性维护时使用，
 * 如果B组件需要精细地维护A组件的缓存就需要本类，以便A组件根据本类的信息进行精细化更新自己的缓存数据。
 * 当然，如果不需要精细，直接通知A清除A所有缓存。
 *
 * @Author dbdu
 * @Date 2020-09-06
 */
@Setter
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class ObserveData {
    /**
     * 哪个类更新了,例如：User
     * 之所以有这个字段，是因为一个组件可能观察多个其他组件，同过本字段就可以清楚知道谁更新了
     */
    private String className;

    /**
     * 操作的类型是什么，例如：增--1;改--2;删--3
     * 参看：OperateTypeEnum
     */
    private Integer operType;

    /**
     * 更新的主键集合是什么，多个主键用分隔符分割，然后解析时使用对应的分隔符即可！
     * 建议支持的分隔符：中英文的逗号分号，和中文的顿号！
     * String[] keys = data.split(",|;|、|，|；");
     */
    private String data;

    @Override
    public String toString() {
        return "ObserveData{" +
                "className='" + className + '\'' +
                ", operType=" + operType +
                ", data='" + data + '\'' +
                '}';
    }
}
```

### 启动项目时在这里全局注册相应的观察者，避免每个组件独立注册可能导致的循环引用问题，例如:
```java
package vip.efactory.embp.example.config;

import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import vip.efactory.embp.example.service.impl.SysMenuServiceImpl;
import vip.efactory.embp.example.service.impl.SysRoleServiceImpl;
import vip.efactory.embp.example.service.impl.SysUserServiceImpl;

import javax.annotation.PostConstruct;

/**
 * Description: 统一处理缓存观察者模式的。避免局部处理的循环引用
 *
 * @Author dbdu
 * @Date 2020-08-24
 */
@AllArgsConstructor
@Component
@Slf4j
public class CacheObserveBeanPostProcessor {
    // menu ，user，role组件的缓存处理
    SysMenuServiceImpl sysMenuServiceImpl;
    SysUserServiceImpl sysUserServiceImpl;
    SysRoleServiceImpl sysRoleServiceImpl;


    private void init4menu() {
        log.info("开始注册menu的观察者...");
        sysMenuServiceImpl.registObservers(sysUserServiceImpl, sysRoleServiceImpl);
    }

    private void init4role() {
        log.info("开始注册role的观察者...");
        sysRoleServiceImpl.registObservers(sysUserServiceImpl);
    }

    @PostConstruct
    private void initCacheObserve() {
        init4menu();
        init4role();
    }
}
```
在菜单模块调用的更新方法，就会通知用户模块去清除自己的缓存数据：
```java
package vip.efactory.embp.example.service.impl;
// 省略包导入

/**
 * 菜单权限表 服务实现类
 */
@Service
@RequiredArgsConstructor
public class SysMenuServiceImpl extends BaseServiceImpl<SysMenu, SysMenuMapper> implements SysMenuService {
    // 省略了其他的代码  
    
    @Override
    @CacheEvict(value = "MENU_DETAILS", allEntries = true)
    public Boolean updateMenuById(SysMenu sysMenu) {
        boolean ret = this.updateById(sysMenu);
        if(ret) {
            // 不传递数据
            // notifyOthers(null);
            // 传递数据
            ObserveData data = new ObserveData("SysMenu", OperateTypeEnum.UPDATE.getCode(), sysMenu.getMenuId().toString());
            notifyOthers(data);
        }
        return ret;
    }

}
```
上面要不要传递数据，取决于观察者要不要精细地维护自己的缓存，如果不需要就传null就好了

用户模块的服务层实现，重写update方法，以便处理用户模块自己的缓存：
```java
package vip.efactory.embp.example.service.impl;
// 省略包导入

@Slf4j
@Service
@RequiredArgsConstructor
public class SysUserServiceImpl extends BaseServiceImpl<SysUser, SysUserMapper> implements SysUserService {
    static final String STATUS_NORMAL = "0";
    private final SysMenuService sysMenuService;
    private final SysRoleService sysRoleService;
    private final SysUserRoleService sysUserRoleService;
    // 此处省略了其他代码 //
    
    // 联动清除本地的缓存！
    @Override
    @CacheEvict(value = "USER_DETAILS",allEntries = true)
    public void update(BaseObservable o, Object arg) {
        log.info("联动清除user缓存信息.....");
        log.info("收到的数据是：" + arg);
    }
}
```
以上是使用注解(**@CacheEvict(value = "USER_DETAILS",allEntries = true)**)直接清除用户模块的所有缓存的方式,如果这不是你想要的方式，  
可以不用在update方法上加此注解，而是在方法内部利用收到的数据arg进行手动精细维护用户模块的缓存一致性！

## 注意：其实对于多表联合查询的缓存也可以有一些其他的方案:
方式一: 缓存时间很短，例如：缓存2-3分钟，在2-3分钟内可能会有不一致的情况，这种方法适合一些非实时的场景，短暂不一致也没什么要紧的场景；  
方式二:冗余连表查询的字段，但是这种可能因为冗余会把数据不一致带到数据表里面。
至于采用何种方式，可以根据具体的使用场景来决定！

## 相关源码如下:
ejpa实现：https://github.com/vip-efactory/ejpa  
测试及使用：https://github.com/vip-efactory/ejpa-example  
embp实现：https://github.com/vip-efactory/embp  
测试及使用：https://github.com/vip-efactory/embp-example  
