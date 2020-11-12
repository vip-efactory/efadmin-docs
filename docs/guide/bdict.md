# 关于业务字典
很多时候我们希望系统是系统,业务是业务,希望明确的分开,其实业务字典就是其中可能要考虑到的一种情况,为什么?
你肯定不希望对系统字典操作影响了业务数据的显示,反之同样如此!

# 如何解决
使用两套字典,各自使用,互不干扰!

# 创建业务字典组件
请自行参照系统字典,拷贝创建业务字典的前后端代码,并且保证接口正常!  
接下来介绍如何集成到前端项目中使用.

# 前端处理
## 创建业务字典的代码
基于系统字典拷贝修改而来,在src/components/目录下创建:  
```shell
dbdu@dbdu:/.../src/components/BusinessDict$ tree
.
├── BDict.js
└── index.js
```
BDict.js内容如下:
```js
import Vue from 'vue'
import { get as getDictDetail } from '@/api/frms/treeDictDetail'

export default class BDict {
  constructor(dict) {
    this.bdict = dict
  }

  async init(names, completeCallback) {
    if (names === undefined || name === null) {
      throw new Error('need Dict names')
    }
    const ps = []
    names.forEach(n => {
      Vue.set(this.bdict.dict, n, {})
      Vue.set(this.bdict.label, n, {})
      Vue.set(this.bdict, n, [])
      ps.push(getDictDetail(n).then(r => {
        if (r.code === 0) {
          this.bdict[n].splice(0, 0, ...r.data.content)
          r.data.content.forEach(d => {
            Vue.set(this.bdict.dict[n], d.value, d)
            Vue.set(this.bdict.label[n], d.value, d.label)
          })
        } else {
          this.$notify(r.msg, 'error')
        }
      }))
    })
    await Promise.all(ps)
    completeCallback()
  }
}
```
此处和系统字典的主要差异是:  
import { get as getDictDetail } from '@/api/frms/treeDictDetail'   
这个是我自己的业务字典接口实现!  
this.dict ===> this.bdict

index.js的内容如下:
```js
import BDict from './BDict'

const install = function(Vue) {
  Vue.mixin({
    data() {
      if (this.$options.bdicts instanceof Array) {
        const dict = {
          dict: {},
          label: {}
        }
        return {
          dict
        }
      }
      return {}
    },
    created() {
      if (this.$options.bdicts instanceof Array) {
        new BDict(this.dict).init(this.$options.bdicts, () => {
          this.$nextTick(() => {
            this.$emit('dictReady')
          })
        })
      }
    }
  })
}

export default { install }
```
说明:  
    import Dict from './Dict' ==> import BDict from './BDict'  
    this.$options.dicts ==> this.$options.bdicts   
    new BDict(this.dict) ==> new BDict(this.dict)

## 注册业务字典  
在main.js中像系统字典那样注册自己:  
```js
///// 省略前面部分的code /////
// 系统数据字典
import dict from './components/Dict'
// 业务数据字典
import bdict from './components/BusinessDict'
///// 省略中间部分的code /////
Vue.use(dict)
Vue.use(bdict)
```

# 如何使用业务字典
系统字典的使用项目中已经有很多的例子,我们来看看如何使用业务字典!
使用方式和系统模块是相似的,只是改了个属性名:  
```js
export default {
  name: 'Notice',
  components: { pagination, crudOperation, rrOperation, udOperation },
  mixins: [presenter(defaultCrud), header(), form(defaultForm), crud()],
  // 使用业务字典
  bdicts: ['notice_type'],
  /// 省略了其他的代码 ///
```
说明:  
 dicts ===> bdicts  
 
