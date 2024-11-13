// packages/runtime-dom/src/nodeOps.ts
var nodeOps = {
  insert(el, parent, anchor = null) {
    parent.insertBefore(el, anchor || null);
  },
  remove(el) {
    const parent = el.parentNode;
    if (parent) {
      parent.removeChild(el);
    }
  },
  createElement: (type) => document.createElement(type),
  createText: (text) => document.createTextNode(text),
  setText: (node, text) => node.nodeValue = text,
  setElementText: (el, text) => el.textContent = text,
  parentNode: (node) => node.parentNode,
  nextSibling: (node) => node.nextSibling
};

// packages/runtime-dom/src/modules/patchAttr.ts
function patchAttr(el, key, value) {
  if (!value || value == null) {
    el.removeAttribute(key);
  } else {
    el.setAttribute(key, value);
  }
}

// packages/runtime-dom/src/modules/patchClass.ts
function patchClass(el, value) {
  if (value == null) {
    el.removeAttribute("class");
  } else {
    el.className = value;
  }
}

// packages/runtime-dom/src/modules/patchEvent.ts
function createInvoker(handle) {
  const invoker = (e) => invoker.value(e);
  invoker.value = handle;
  return invoker;
}
function patchEvent(el, name, nextValue) {
  const invokers = el._vei || (el._vei = {});
  const eventName = name.slice(2).toLowerCase();
  const exisitInv = invokers[name];
  if (nextValue && exisitInv) {
    return exisitInv.value = nextValue;
  }
  if (nextValue) {
    const invoker = invokers[name] = createInvoker(nextValue);
    return el.addEventListener(eventName, invoker);
  }
  if (exisitInv) {
    el.removeEventListener(eventName, exisitInv);
    invokers[name] = void 0;
  }
}

// packages/runtime-dom/src/modules/patchStyle.ts
function patchStyle(el, preValue, nextValue) {
  let style = el.style;
  for (let key in nextValue) {
    style[key] = nextValue[key];
  }
  if (preValue) {
    for (let key in preValue) {
      if (nextValue) {
        if (nextValue[key] == null) {
          style[key] = null;
        }
      }
    }
  }
}

// packages/runtime-dom/src/patchProp.ts
function patchProp(el, key, preValue, nextValue) {
  if (key === "class") {
    return patchClass(el, nextValue);
  } else if (key === "style") {
    return patchStyle(el, preValue, nextValue);
  } else if (/^on[^a-z]/.test(key)) {
    return patchEvent(el, key, nextValue);
  } else {
    return patchAttr(el, key, nextValue);
  }
}

// packages/shared/src/index.ts
function isObject(value) {
  return typeof value === "object" && value !== null;
}
function isFunction(value) {
  return typeof value === "function";
}
function isString(value) {
  return typeof value === "string";
}
function isVNode(value) {
  return value?._v_isVNode;
}
function isSameVNode(n1, n2) {
  return n1.type === n2.type && n1.key === n2.key;
}
var hasOwnProperty = Object.prototype.hasOwnProperty;
var hasOwn = (value, key) => hasOwnProperty.call(value, key);

// packages/reactivity/src/effect.ts
function effect(fn, options) {
  const _effect = new ReactiveEffect(fn, () => {
    _effect.run();
  });
  _effect.run();
  if (options) {
    Object.assign(_effect, options);
  }
  const runner = _effect.run.bind(_effect);
  return runner;
}
var activeEffect;
function preCleanEffect(effect2) {
  effect2._depsLength = 0;
  effect2._trackId++;
}
function cleanDepEffect(dep, effect2) {
  dep.delete(effect2);
  if (dep.size == 0) {
    dep.cleanUp();
  }
}
function postCleanEffect(effect2) {
  if (effect2.deps.length > effect2._depsLength) {
    for (let i = effect2._depsLength; i < effect2.deps.length; i++) {
      cleanDepEffect(effect2.deps[i], effect2);
    }
  }
  effect2.deps.length = effect2._depsLength;
}
var ReactiveEffect = class {
  constructor(fn, scheduler) {
    this.fn = fn;
    this.scheduler = scheduler;
    this._trackId = 0;
    //用于记录当前effect的执行次数,并且标识不同的effect
    this._depsLength = 0;
    //收集的依赖数
    this._running = 0;
    this._dirtyLevel = 4 /* Dirty */;
    this.deps = [];
    this.active = true;
  }
  run() {
    this._dirtyLevel = 0 /* NoDirty */;
    if (!this.active) {
      return this.fn();
    }
    let lastEffect = activeEffect;
    try {
      activeEffect = this;
      preCleanEffect(this);
      this._running++;
      return this.fn();
    } finally {
      this._running--;
      postCleanEffect(this);
      activeEffect = lastEffect;
    }
  }
  stop() {
    if (this.active) {
      this.active = false;
      preCleanEffect(this);
      postCleanEffect(this);
    }
  }
  get dirty() {
    return this._dirtyLevel === 4 /* Dirty */;
  }
  set dirty(v) {
    this._dirtyLevel = v ? 4 /* Dirty */ : 0 /* NoDirty */;
  }
};
function trackEffect(effect2, dep) {
  if (dep.get(effect2) !== effect2._trackId) {
    dep.set(effect2, effect2._trackId);
    let oldDep = effect2.deps[effect2._depsLength];
    if (oldDep !== dep) {
      if (oldDep) {
        cleanDepEffect(oldDep, effect2);
      }
      effect2.deps[effect2._depsLength++] = dep;
    } else {
      effect2._depsLength++;
    }
  }
}
function triggerEffects(dep) {
  for (const effect2 of dep.keys()) {
    if (effect2._dirtyLevel < 4 /* Dirty */) {
      effect2._dirtyLevel = 4 /* Dirty */;
    }
    if (effect2.scheduler) {
      if (!effect2._running) {
        effect2.scheduler();
      }
    }
  }
}

// packages/reactivity/src/reactiveEffect.ts
var targetMap = /* @__PURE__ */ new WeakMap();
var createDep = (cleanUp, key) => {
  const dep = /* @__PURE__ */ new Map();
  dep.cleanUp = cleanUp;
  dep.name = key;
  return dep;
};
function track(target, key) {
  if (activeEffect) {
    let depsMap = targetMap.get(target);
    if (!depsMap) {
      targetMap.set(target, depsMap = /* @__PURE__ */ new Map());
    }
    let dep = depsMap.get(key);
    if (!dep) {
      depsMap.set(
        key,
        dep = createDep(() => {
          depsMap.delete(key);
        }, key)
      );
    }
    trackEffect(activeEffect, dep);
  }
}
function trigger(target, key, newValue, oldValue) {
  const depsMap = targetMap.get(target);
  if (!depsMap) {
    return;
  }
  let dep = depsMap.get(key);
  if (dep) {
    triggerEffects(dep);
  }
}

// packages/reactivity/src/baseHandlers.ts
var mutableHandlers = {
  get(target, key, recevier) {
    if (key === "__v_isReactive" /* IS_REACTIVE */) {
      return true;
    }
    track(target, key);
    let res = Reflect.get(target, key, recevier);
    if (isObject(res)) {
      return reactive(res);
    }
    return res;
  },
  set(target, key, value, recevier) {
    let oldValue = target[key];
    let result = Reflect.set(target, key, value, recevier);
    if (oldValue !== value) {
      trigger(target, key, value, oldValue);
      return Reflect.set(target, key, value, recevier);
    }
    return result;
  }
};

// packages/reactivity/src/reactive.ts
var reactiveMap = /* @__PURE__ */ new WeakMap();
function reactive(target) {
  return createReactiveObject(target);
}
function createReactiveObject(target) {
  if (!isObject(target)) {
    return target;
  }
  if (target["__v_isReactive" /* IS_REACTIVE */]) {
    return target;
  }
  const existProxy = reactiveMap.get(target);
  if (existProxy) {
    return existProxy;
  }
  let proxy = new Proxy(target, mutableHandlers);
  reactiveMap.set(target, proxy);
  return proxy;
}
function toReactive(value) {
  return isObject(value) ? reactive(value) : value;
}
function isReactive(value) {
  return !!(value && value["__v_isReactive" /* IS_REACTIVE */]);
}

// packages/reactivity/src/ref.ts
function ref(value) {
  return creatRef(value);
}
function creatRef(value) {
  return new RefImpl(value);
}
var RefImpl = class {
  constructor(rawValue) {
    this.rawValue = rawValue;
    //ref对象
    this.__v_isRef = true;
    this._value = toReactive(rawValue);
  }
  get value() {
    trackRefValue(this);
    return this._value;
  }
  set value(newValue) {
    if (newValue !== this.rawValue) {
      this.rawValue = newValue;
      this._value = newValue;
      triggerRefValue(this);
    }
  }
};
function trackRefValue(ref2) {
  if (activeEffect) {
    trackEffect(
      activeEffect,
      ref2.dep = ref2.dep || createDep(() => ref2.dep = void 0, "undifined")
    );
  }
}
function triggerRefValue(ref2) {
  let dep = ref2.dep;
  if (dep) {
    triggerEffects(dep);
  }
}
var ObjectRefImpl = class {
  //增加ref标识
  constructor(_object, _key) {
    this._object = _object;
    this._key = _key;
    this.__v_isRef = true;
  }
  get value() {
    return this._object[this._key];
  }
  set value(newValue) {
    this._object[this._key] = newValue;
  }
};
function toRef(object, key) {
  return new ObjectRefImpl(object, key);
}
function toRefs(object) {
  const res = {};
  for (let key in object) {
    res[key] = toRef(object, key);
  }
  return res;
}
function proxyRefs(objectWithRef) {
  return new Proxy(objectWithRef, {
    get(target, key, receiver) {
      let r = Reflect.get(target, key, receiver);
      return r.__v_isRef ? r.value : r;
    },
    set(target, key, value, receiver) {
      const oldValue = target.get[key];
      if (oldValue.__v_isRef) {
        oldValue.value = value;
        return true;
      } else {
        return Reflect.set(target, key, value, receiver);
      }
    }
  });
}
function isRef(value) {
  return value && value.__v_isRef;
}

// packages/reactivity/src/computed.ts
var ComputedRefImpl = class {
  constructor(getter, setter) {
    this.setter = setter;
    this.effect = new ReactiveEffect(
      () => getter(this._value),
      () => {
        triggerRefValue(this);
      }
    );
  }
  get value() {
    if (this.effect.dirty) {
      this._value = this.effect.run();
      trackRefValue(this);
    }
    return this._value;
  }
  set value(v) {
    this.setter(v);
  }
};
function computed(getterOrOptions) {
  let onlyGetter = isFunction(getterOrOptions);
  let getter, setter;
  if (onlyGetter) {
    getter = getterOrOptions;
    setter = function() {
    };
  } else {
    getter = getterOrOptions.get;
    setter = getterOrOptions.set;
  }
  return new ComputedRefImpl(getter, setter);
}

// packages/reactivity/src/watch.ts
function watch(source, cb, options = {}) {
  if (!isFunction(cb)) {
    return;
  }
  return doWatch(source, cb, options);
}
function watchEffect(source, options = {}) {
  return doWatch(source, null, options);
}
function traverse(source, depth, currentDepth = 0, seen = /* @__PURE__ */ new WeakMap()) {
  if (!isObject(source)) {
    return source;
  }
  if (depth) {
    if (depth <= currentDepth) {
      return source;
    }
    currentDepth++;
  }
  if (seen.has(source)) {
    return source;
  }
  seen.set(source, true);
  for (let key in source) {
    traverse(source[key], depth, currentDepth, seen);
  }
  return source;
}
function doWatch(source, cb, { deep, immediate }) {
  const reactiveGetter = (source2) => traverse(source2, deep === false ? 1 : void 0);
  let getter;
  if (isReactive(source)) {
    getter = () => reactiveGetter(source);
  } else if (isRef(source)) {
    if (isReactive(source.value)) {
      getter = () => reactiveGetter(source.value);
    } else {
      getter = () => source.value;
    }
  } else if (isFunction(source)) {
    getter = source;
  }
  let oldValue;
  let clean;
  const onCleanup = (fn) => {
    clean = () => {
      fn();
      clean = void 0;
    };
  };
  const job = () => {
    if (cb) {
      const newValue = effect2.run();
      if (clean) {
        clean();
      }
      cb(newValue, oldValue, onCleanup);
      oldValue = newValue;
    } else {
      effect2.run();
    }
  };
  const effect2 = new ReactiveEffect(getter, job);
  if (cb) {
    if (immediate) {
      job();
    } else {
      oldValue = effect2.run();
    }
  } else {
    effect2.run();
  }
  const unWatch = () => {
    effect2.stop();
  };
  return unWatch;
}

// packages/runtime-core/src/components/Teleport.ts
var Teleport = {
  _isTeleport: true,
  process(oldVN, newVN, container, anchor, parentComponent, internals) {
    const { mountChildren, patchChildren, move } = internals;
    if (!oldVN) {
      const target = newVN.target = document.querySelector(newVN.props.to);
      if (target) {
        mountChildren(newVN.children, target, parentComponent);
      }
    } else {
      patchChildren(oldVN, newVN, newVN.target, parentComponent);
      if (newVN.props.to != oldVN.props.to) {
        const nextTarget = newVN.target = document.querySelector(newVN.props.to);
        newVN.children.forEach((child) => move(child, nextTarget, anchor));
      }
    }
  },
  remove(vnode, unmountChildren) {
    const { shapeFlag, children } = vnode;
    if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
      unmountChildren(children);
    }
  }
};
var isTeleport = (value) => {
  return value._isTeleport;
};

// packages/runtime-core/src/createVNode.ts
var Text = Symbol("Text");
var Fragment = Symbol("Fragment");
function createVNode(type, props, children) {
  const shapeFlag = isString(type) ? 1 /* ELEMENT */ : (
    //元素
    isTeleport(type) ? 64 /* TELEPORT */ : (
      //teleport组件
      isObject(type) ? 4 /* STATEFUL_COMPONENT */ : (
        //状态组件
        isFunction(type) ? 2 /* FUNCTIONAL_COMPONENT */ : 0
      )
    )
  );
  const vnode = {
    _v_isVNode: true,
    type,
    props,
    children,
    key: props?.key,
    //diff算法需要的key
    el: null,
    //对应的真实节点 
    shapeFlag,
    ref: props?.ref
  };
  if (children) {
    if (Array.isArray(children)) {
      vnode.shapeFlag = vnode.shapeFlag | 16 /* ARRAY_CHILDREN */;
    } else if (isObject(children)) {
      vnode.shapeFlag |= 32 /* SLOTS_CHILDREN */;
    } else {
      children = String(children);
      vnode.shapeFlag = vnode.shapeFlag | 8 /* TEXT_CHILDREN */;
    }
  }
  return vnode;
}

// packages/runtime-core/src/h.ts
function h(type, propsOrChildren, children) {
  let l = arguments.length;
  if (l === 2) {
    if (isObject(propsOrChildren) && !Array.isArray(propsOrChildren)) {
      if (isVNode(propsOrChildren)) {
        return createVNode(type, null, [propsOrChildren]);
      } else {
        return createVNode(type, propsOrChildren);
      }
    }
    return createVNode(type, null, propsOrChildren);
  } else {
    if (l > 3) {
      children = Array.from(arguments).slice(2);
    }
    if (l === 3 && isVNode(children)) {
      children = [children];
    }
  }
  return createVNode(type, propsOrChildren, children);
}

// packages/runtime-core/src/seq.ts
function getSequence(arr) {
  const result = [0];
  let start, end;
  let middle;
  const p = result.slice(0);
  const len = arr.length;
  for (let i = 0; i < len; i++) {
    const arrI = arr[i];
    if (arrI !== 0) {
      let resultLastIndex = result[result.length - 1];
      if (arr[resultLastIndex] < arrI) {
        p[i] = result[result.length - 1];
        result.push(i);
        continue;
      }
    }
    start = 0;
    end = result.length - 1;
    while (start < end) {
      middle = (start + end) / 2 | 0;
      if (arr[result[middle]] < arrI) {
        start = middle + 1;
      } else {
        end = middle;
      }
    }
    if (arrI < arr[result[start]]) {
      p[i] = result[start - 1];
      result[start] = i;
    }
  }
  let l = result.length;
  let last = result[l - 1];
  while (l-- > 0) {
    result[l] = last;
    last = p[last];
  }
  return result;
}

// packages/runtime-core/src/scheduler.ts
var queue = [];
var isFlushing = false;
var resolvePromise = Promise.resolve();
function queueJob(job) {
  if (!queue.includes(job)) {
    queue.push(job);
  }
  if (!isFlushing) {
    isFlushing = true;
    resolvePromise.then(() => {
      isFlushing = false;
      const copy = queue.slice(0);
      queue.length = 0;
      copy.forEach((job2) => job2());
      copy.length = 0;
    });
  }
}

// packages/runtime-core/src/component.ts
function createComponentInstance(vnode, parent) {
  const instance = {
    data: null,
    vnode,
    //组件的虚拟节点
    subTree: null,
    isMounted: false,
    update: null,
    //组件的更新函数
    props: {},
    //用户自定义组件属性，响应式 
    attrs: {},
    //dom节点属性，非响应式
    slots: {},
    //插槽
    propsOptions: vnode.type.props,
    //
    component: null,
    proxy: null,
    //代理对象，代理props，attrs，data,方便用户访问 
    setupState: {},
    exposed: null,
    //向组件外部暴露属性
    parent,
    provides: parent ? parent.provides : /* @__PURE__ */ Object.create(null),
    //父组件存在则拷贝一份引用
    ctx: {}
    //弱国是keepAlive组件，就将dom api放入 
  };
  return instance;
}
var initProps = (instance, rawProps) => {
  const props = {};
  const attrs = {};
  const propsOptions = instance.propsOptions || {};
  if (rawProps) {
    for (let key in rawProps) {
      const value = rawProps[key];
      if (key in propsOptions) {
        props[key] = value;
      } else {
        attrs[key] = value;
      }
    }
  }
  instance.props = reactive(props);
  instance.attrs = attrs;
};
var initSlots = (instance, slotsChildren) => {
  if (instance.vnode.shapeFlag & 32 /* SLOTS_CHILDREN */) {
    instance.slots = slotsChildren;
  } else {
    instance.slots = {};
  }
};
var publicProperty = {
  $attrs: (instance) => instance.attrs,
  $slots: (instance) => instance.slots
};
var handlerProxy = (instance) => {
  instance.proxy = new Proxy(instance, {
    get(target, key) {
      const { data, props, setupState } = target;
      if (data && hasOwn(data, key)) {
        return data[key];
      } else if (props && hasOwn(props, key)) {
        return props[key];
      } else if (setupState && hasOwn(setupState, key)) {
        return setupState[key];
      }
      const getter = publicProperty[key];
      if (getter) {
        return getter(target);
      }
    },
    set(target, key, value) {
      const { data, props, setupState } = target;
      if (data && hasOwn(data, key)) {
        data[key] = value;
      } else if (hasOwn(props, key)) {
        console.log("props are only readonly");
      } else if (setupState && hasOwn(setupState, key)) {
        setupState[key] = value;
      }
      return true;
    }
  });
};
function setupComponent(instance) {
  const { vnode } = instance;
  initProps(instance, vnode.props);
  initSlots(instance, vnode.children);
  handlerProxy(instance);
  const { data = () => {
  }, render: render2, setup } = vnode.type;
  if (setup) {
    const setupContext = {
      attrs: instance.attrs,
      slots: instance.slots,
      expose(value) {
        instance.exposed = value;
      },
      emit(event, ...payload) {
        const eventName = `on${event[0].toUpperCase() + event.slice(1)}`;
        const handler = instance.vnode.props[eventName];
        handler && handler(...payload);
      }
    };
    setCurrentInstance(instance);
    const setupResult = setup(instance.props, setupContext);
    unsetCurrentInstance();
    if (isFunction(setupResult)) {
      instance.render = setupResult;
    } else {
      instance.setupState = proxyRefs(setupResult);
    }
  }
  if (!isFunction(data)) {
    console.warn("data must be a function");
  } else {
    instance.data = reactive(data.call(instance.proxy));
  }
  if (!instance.render && render2) {
    instance.render = render2;
  } else if (!instance.render) {
    console.warn("Component is missing a render function");
  }
}
var currentInstance = null;
var getCurrentInstance = () => {
  return currentInstance;
};
var setCurrentInstance = (instance) => {
  currentInstance = instance;
};
var unsetCurrentInstance = () => {
  currentInstance = null;
};

// packages/runtime-core/src/apiLifecycle.ts
var LifeCycle = /* @__PURE__ */ ((LifeCycle2) => {
  LifeCycle2["BEFORE_MOUNT"] = "bm";
  LifeCycle2["MOUNTED"] = "m";
  LifeCycle2["BEFORE_UPDATE"] = "bu";
  LifeCycle2["UPDATED"] = "u";
  return LifeCycle2;
})(LifeCycle || {});
function createHook(type) {
  return (hook, target = currentInstance) => {
    if (target) {
      const hooks = target[type] || (target[type] = []);
      const wrapHook = () => {
        setCurrentInstance(target);
        hook.call(target);
        unsetCurrentInstance();
      };
      hooks.push(wrapHook);
    }
  };
}
var onBeforeMount = createHook("bm" /* BEFORE_MOUNT */);
var onMounted = createHook("m" /* MOUNTED */);
var onBeforeUpdate = createHook("bu" /* BEFORE_UPDATE */);
var onUpdated = createHook("u" /* UPDATED */);
function invokeArray(fns) {
  for (let i = 0; i < fns.length; i++) {
    fns[i]();
  }
}

// packages/runtime-core/src/renderer.ts
function createRenderer(renderOptions2) {
  const {
    insert: hostInsert,
    remove: hostRemove,
    createElement: hostCreateElement,
    createText: hostCreateText,
    setText: hostSetText,
    setElementText: hostsetElementText,
    parentNode: hostparentNode,
    nextSibling: hostnextSibling,
    patchProp: hostpatchProp
  } = renderOptions2;
  const normalize = (children) => {
    for (let i = 0; i < children.length; i++) {
      if (typeof children[i] === "string" || typeof children[i] === "number") {
        children[i] = createVNode(Text, null, String(children[i]));
      }
    }
    return children;
  };
  const mountChildren = (children, container, parentComponent) => {
    normalize(children);
    for (let i = 0; i < children.length; i++) {
      patch(null, children[i], container, parentComponent);
    }
  };
  const mountElement = (vnode, container, anchor, parentComponent) => {
    const { type, children, props, shapeFlag, transition } = vnode;
    let el = vnode.el = hostCreateElement(type);
    if (props) {
      for (let prop in props) {
        hostpatchProp(el, prop, null, props[prop]);
      }
    }
    if (shapeFlag & 8 /* TEXT_CHILDREN */) {
      hostsetElementText(el, children);
    } else if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
      mountChildren(children, el, parentComponent);
    }
    if (transition) {
      transition.beforeEnter(el);
    }
    hostInsert(el, container, anchor);
    if (transition) {
      transition.enter(el);
    }
  };
  function processElement(oldVN, newVN, container, anchor, parentComponent) {
    if (oldVN == null) {
      mountElement(newVN, container, anchor, parentComponent);
    } else {
      patchElement(oldVN, newVN, container, parentComponent);
    }
  }
  function patchProps(oldProps, newProps, el) {
    for (let key in newProps) {
      hostpatchProp(el, key, oldProps[key], newProps[key]);
    }
    for (let key in oldProps) {
      if (!(key in newProps)) {
        hostpatchProp(el, key, oldProps[key], null);
      }
    }
  }
  const unmount = (vnode, parentComponent) => {
    const { shapeFlag, transition, el } = vnode;
    const performRemove = () => hostRemove(vnode.el);
    if (shapeFlag & 256 /* COMPONENT_SHOULD_KEEP_ALIVE */) {
      parentComponent.ctx.deactivate(vnode);
    } else if (vnode.type === Fragment) {
      unmountChildren(vnode.children, parentComponent);
    } else if (shapeFlag & 6 /* COMPONENT */) {
      unmount(vnode.component.subTree, parentComponent);
    } else if (shapeFlag & 64 /* TELEPORT */) {
      vnode.type.remove(vnode, unmountChildren);
    } else {
      if (transition) {
        transition.leave(el, performRemove);
      } else {
        performRemove();
      }
    }
  };
  const unmountChildren = (children, parentComponent) => {
    for (let i = 0; i < children.length; i++) {
      let child = children[i];
      unmount(child, parentComponent);
    }
  };
  const patchKeyedChildren = (oldC, newC, container, parentComponent) => {
    let i = 0;
    let e1 = oldC.length - 1;
    let e2 = newC.length - 1;
    while (i <= e1 && i <= e2) {
      const n1 = oldC[i];
      const n2 = newC[i];
      if (isSameVNode(n1, n2)) {
        patch(n1, n2, container);
      } else {
        break;
      }
      i++;
    }
    while (i <= e1 && i <= e2) {
      2;
      const n1 = oldC[e1];
      const n2 = newC[e2];
      if (isSameVNode(n1, n2)) {
        patch(n1, n2, container);
      } else {
        break;
      }
      e1--;
      e2--;
    }
    if (i > e1) {
      if (i <= e2) {
        while (i <= e2) {
          const nextPos = e2 + 1;
          const anchor = nextPos < newC.length ? newC[nextPos].el : null;
          patch(null, newC[i], container, anchor);
          i++;
        }
      }
    } else if (i > e2) {
      while (i <= e1) {
        unmount(oldC[i], parentComponent);
        i++;
      }
    }
    let s1 = i;
    let s2 = i;
    const keyToNewIndexMap = /* @__PURE__ */ new Map();
    let toBePatched = e2 - s2 + 1;
    let newIndexToOldMapIndex = new Array(toBePatched).fill(0);
    for (let i2 = s2; i2 <= e2; i2++) {
      const vnode = newC[i2];
      keyToNewIndexMap.set(vnode.key, i2);
    }
    for (let i2 = s1; i2 <= e1; i2++) {
      const vnode = oldC[i2];
      const newIndex = keyToNewIndexMap.get(vnode.key);
      if (newIndex == void 0) {
        unmount(vnode, parentComponent);
      } else {
        newIndexToOldMapIndex[newIndex - s2] = i2 + 1;
        patch(vnode, newC[newIndex], container);
      }
    }
    let increasingSeq = getSequence(newIndexToOldMapIndex);
    let seqLast = increasingSeq.length - 1;
    for (let i2 = toBePatched - 1; i2 >= 0; i2--) {
      let newIndex = s2 + i2;
      let anchor = newC[newIndex + 1]?.el;
      let vnode = newC[newIndex];
      if (!vnode.el) {
        patch(null, vnode, container, anchor);
      } else {
        if (i2 === increasingSeq[seqLast]) {
          seqLast--;
        } else {
          hostInsert(vnode.el, container, anchor);
        }
      }
    }
  };
  function patchChildren(oldVN, newVN, container, parentComponent) {
    const oldC = oldVN.children;
    const newC = normalize(newVN.children);
    const preShapeFlag = oldVN.shapeFlag;
    const shapeFlag = newVN.shapeFlag;
    if (shapeFlag & 8 /* TEXT_CHILDREN */) {
      if (preShapeFlag & 16 /* ARRAY_CHILDREN */) {
        unmountChildren(oldC, parentComponent);
      }
      if (oldC !== newC) {
        hostsetElementText(container, newC);
      }
    } else {
      if (preShapeFlag & 16 /* ARRAY_CHILDREN */) {
        if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
          patchKeyedChildren(oldC, newC, container, parentComponent);
        } else {
          unmountChildren(oldC, parentComponent);
        }
      } else {
        if (preShapeFlag & 8 /* TEXT_CHILDREN */) {
          hostsetElementText(container, "");
        }
        if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
          mountChildren(container, newC, parentComponent);
        }
      }
    }
  }
  function patchElement(oldVN, newVN, container, parentComponent) {
    let el = newVN.el = oldVN.el;
    let oldProps = oldVN.props || {};
    let newProps = newVN.props || {};
    patchProps(oldProps, newProps, el);
    patchChildren(oldVN, newVN, el, parentComponent);
  }
  const processText = (oldVN, newVN, container) => {
    if (oldVN === null) {
      hostInsert(newVN.el = hostCreateText(newVN.children), container);
    } else {
      let el = newVN.el = oldVN.el;
      if (oldVN.children !== newVN.children) {
        hostSetText(el, newVN.children);
      }
    }
  };
  const processFragment = (oldVN, newVN, container, parentComponent) => {
    if (oldVN == null) {
      mountChildren(newVN.children, container, parentComponent);
    } else {
      patchChildren(oldVN, newVN, container, parentComponent);
    }
  };
  const updataComponentPreRender = (instance, next) => {
    instance.next = null;
    instance.vnode = next;
    updataProps(instance, instance.props, next.props || {});
    Object.assign(instance.slots, next.children);
  };
  const renderComponent = (instance) => {
    const { render: render3, vnode, proxy, props, attrs, slots } = instance;
    if (vnode.shapeFlag & 4 /* STATEFUL_COMPONENT */) {
      return render3.call(proxy, proxy);
    } else {
      return vnode.type(attrs, { slots });
    }
  };
  function setupRenderEffect(instance, container, anchor, parentComponent) {
    const { render: render3 } = instance;
    const componentUpdateFn = () => {
      const { bm, m } = instance;
      if (!instance.isMounted) {
        if (bm) {
          invokeArray(bm);
        }
        const subTree = renderComponent(instance);
        patch(null, subTree, container, anchor, instance);
        instance.isMounted = true;
        instance.subTree = subTree;
        if (m) {
          invokeArray(m);
        }
      } else {
        const { next, bu, u } = instance;
        if (next) {
          updataComponentPreRender(instance, next);
        }
        if (bu) {
          invokeArray(bu);
        }
        const subTree = renderComponent(instance);
        patch(instance.subTree, subTree, container, anchor, instance);
        instance.subTree = subTree;
        if (u) {
          invokeArray(u);
        }
      }
    };
    const effect2 = new ReactiveEffect(componentUpdateFn, () => queueJob(update));
    const update = instance.update = () => {
      effect2.run();
    };
    update();
  }
  const mountComponent = (newVN, container, anchor, parentComponent) => {
    const instance = newVN.component = createComponentInstance(newVN, parentComponent);
    if (isKeepAlive(newVN)) {
      instance.ctx.renderer = {
        createELement: hostCreateElement,
        //内部创建一个div来存储dom
        move(newVN2, container2) {
          hostInsert(newVN2.component.subTree.el, container2);
        },
        unmount
        //如果组件切换，将现在容器中的元素移除
      };
    }
    setupComponent(instance);
    setupRenderEffect(instance, container, anchor, parentComponent);
  };
  const hasPropsChange = (prevProps, nextProps) => {
    let nkeys = Object.keys(nextProps);
    if (nkeys.length !== Object.keys(prevProps).length) {
      return true;
    }
    for (let i = 0; i < nkeys.length; i++) {
      const key = nkeys[i];
      if (nextProps[key] !== prevProps[key]) {
        return true;
      }
    }
    return false;
  };
  const updataProps = (instance, prevProps, nextProps) => {
    if (hasPropsChange(prevProps, nextProps)) {
      for (let key in nextProps) {
        instance.props[key] = nextProps[key];
      }
      for (let key in instance.props) {
        if (!(key in nextProps)) {
          delete instance.props[key];
        }
      }
    }
  };
  const shouldComponentUpdate = (oldVN, newVN) => {
    const { props: prevProps, children: preChildren } = oldVN;
    const { props: nextProps, children: nextChildren } = newVN;
    if (preChildren || nextChildren) return true;
    if (prevProps === nextProps) return false;
    return hasPropsChange(prevProps, nextProps || {});
  };
  const updateComponent = (oldVN, newVN) => {
    const instance = newVN.component = oldVN.component;
    if (shouldComponentUpdate(oldVN, newVN)) {
      instance.next = newVN;
      instance.update();
    }
  };
  const processComponent = (oldVN, newVN, container, anchor, parentComponent) => {
    if (oldVN === null) {
      if (newVN.shapeFlag & 512 /* COMPONENT_KEPT_ALIVE */) {
        parentComponent.ctx.activate(newVN, container, anchor);
      } else {
        mountComponent(newVN, container, anchor, parentComponent);
      }
    } else {
      updateComponent(oldVN, newVN);
    }
  };
  const patch = (oldVN, newVN, container, anchor = null, parentComponent = null) => {
    if (oldVN == newVN) {
      return;
    }
    if (oldVN && !isSameVNode(oldVN, newVN)) {
      unmount(oldVN, parentComponent);
      oldVN = null;
    }
    const { type, shapeFlag, ref: ref2 } = newVN;
    switch (type) {
      case Text:
        processText(oldVN, newVN, container);
        break;
      case Fragment:
        processFragment(oldVN, newVN, container, parentComponent);
        break;
      default:
        if (shapeFlag & 1 /* ELEMENT */) {
          processElement(oldVN, newVN, container, anchor, parentComponent);
        } else if (shapeFlag & 64 /* TELEPORT */) {
          type.process(oldVN, newVN, container, anchor, parentComponent, {
            mountChildren,
            patchChildren,
            move(vnode, container2, anchor2) {
              hostInsert(
                vnode.component ? vnode.component.subTree.el : vnode.el,
                container2,
                anchor2
              );
            }
          });
        } else if (shapeFlag & 6 /* COMPONENT */) {
          processComponent(oldVN, newVN, container, anchor, parentComponent);
        }
    }
    if (ref2 != null) {
      setRef(ref2, newVN);
    }
  };
  function setRef(ref2, newVN) {
    let value = newVN.shapeFlag & 4 /* STATEFUL_COMPONENT */ ? newVN.component.exposed || newVN.component.proxy : newVN.el;
    if (isRef(ref2)) {
      ref2.value = value;
    }
  }
  const render2 = (vnode, container) => {
    if (vnode == null) {
      if (container._vnode) {
        unmount(container._vnode, null);
      }
    } else {
      patch(container._vnode || null, vnode, container);
      container._vnode = vnode;
    }
  };
  return {
    render: render2
    //返回渲染器
  };
}

// packages/runtime-core/src/components/Transition.ts
function nextFrame(fn) {
  requestAnimationFrame(() => {
    requestAnimationFrame(fn);
  });
}
function resolveTransitionProps(props) {
  const {
    name = "v",
    enterFromClass = `${name}-enter-from`,
    enterActiveClass = `${name}-enter-active`,
    enterToClass = `${name}-enter-to`,
    leaveFromClass = `${name}-leave-from`,
    leaveActiveClass = `${name}-leave-active`,
    leaveToClass = `${name}-leave-to`,
    onBeforeEnter,
    onEnter,
    onLeave
  } = props;
  return {
    onBeforeEnter(el) {
      onBeforeEnter && onBeforeEnter(el);
      el.classList.add(enterFromClass);
      el.classList.add(enterActiveClass);
    },
    onEnter(el, done) {
      const resolve = () => {
        el.classList.remove(enterToClass);
        el.classList.remove(enterActiveClass);
        done && done();
      };
      onEnter && onEnter(el, resolve);
      nextFrame(() => {
        el.classList.remove(enterFromClass);
        el.classList.add(enterToClass);
        if (!onEnter || onEnter.length <= 1) {
          el.addEventListener("transitionEnd", resolve);
        }
      });
    },
    onLeave(el, done) {
      const resolve = () => {
        el.classList.remove(leaveActiveClass);
        el.classList.remove(leaveToClass);
        done && done();
      };
      onLeave && onLeave(el, resolve);
      el.classList.add(leaveFromClass);
      document.body.offsetHeight;
      el.classList.add(leaveActiveClass);
      nextFrame(() => {
        el.classList.remove(leaveFromClass);
        el.classList.add(leaveToClass);
        if (!onLeave || onLeave.length <= 1) {
          el.addEventListener("transitionend", resolve);
        }
      });
    }
  };
}
function Transition(props, { slots }) {
  return h(BaseTranstionImpl, resolveTransitionProps(props), slots);
}
var BaseTranstionImpl = {
  // 真正的组件 只需要渲染难的时候调用封装后的钩子即可
  props: {
    onBeforeEnter: Function,
    onEnter: Function,
    onLeave: Function
  },
  setup(props, { slots }) {
    return () => {
      const vnode = slots.default && slots.default();
      if (!vnode) {
        return;
      }
      vnode.transition = {
        beforeEnter: props.onBeforeEnter,
        enter: props.onEnter,
        leave: props.onLeave
      };
      return vnode;
    };
  }
};

// packages/runtime-core/src/components/KeepAlive.ts
var KeepAlive = {
  __isKeepAlive: true,
  props: {
    max: Number
    //最大缓存数,
  },
  setup(props, { slots }) {
    const { max } = props;
    const keys = /* @__PURE__ */ new Set();
    const cache = /* @__PURE__ */ new Map();
    let pendingCacheKey = null;
    const instance = getCurrentInstance();
    const { move, createELement, unmount: _unmount } = instance.ctx.renderer;
    function reset(vnode) {
      let shapeFlag = vnode.shapeFlag;
      if (shapeFlag & 512 /* COMPONENT_KEPT_ALIVE */) {
        shapeFlag -= 512 /* COMPONENT_KEPT_ALIVE */;
      }
      if (shapeFlag & 256 /* COMPONENT_SHOULD_KEEP_ALIVE */) {
        shapeFlag -= 256 /* COMPONENT_SHOULD_KEEP_ALIVE */;
      }
      vnode.shapeFlag = shapeFlag;
    }
    function unmount(vnode) {
      reset(vnode);
      _unmount(vnode);
    }
    function purneCacheEntry(key) {
      keys.delete(key);
      const cached = cache.get(key);
      unmount(cached);
    }
    instance.ctx.activate = function(vnode, container, anchor) {
      move(vnode, container, anchor);
    };
    const storageContent = createELement("div");
    instance.ctx.deactivate = function(vnode) {
      move(vnode, storageContent, null);
    };
    const cacheSubtree = () => {
      cache.set(pendingCacheKey, instance.subTree);
    };
    onMounted(cacheSubtree);
    onUpdated(cacheSubtree);
    return () => {
      const vnode = slots?.default();
      const comp = vnode.type;
      const key = vnode.key == null ? comp : vnode.key;
      const cacheV = cache.get(key);
      pendingCacheKey = key;
      if (cacheV) {
        vnode.component = cacheV.component;
        vnode.shapeFlag |= 512 /* COMPONENT_KEPT_ALIVE */;
        keys.delete(key);
        keys.add(key);
      } else {
        keys.add(key);
        if (max && keys.size > max) {
          purneCacheEntry(keys.values().next().value);
        }
      }
      vnode.shapeFlag |= 256 /* COMPONENT_SHOULD_KEEP_ALIVE */;
      return vnode;
    };
  }
};
var isKeepAlive = (value) => value.type.__isKeepAlive;

// packages/runtime-core/src/apiProvide.ts
function provide(key, value) {
  if (!currentInstance) return;
  const parentProvides = currentInstance.parent?.provides;
  let provides = currentInstance.provides;
  if (parentProvides === provides) {
    provides = currentInstance.provides = Object.create(provides);
  }
  provides[key] = value;
}
function inject(key, defaultValue = "key  is not in provide") {
  if (!currentInstance) return;
  const parentProvides = currentInstance.parent?.provides;
  if (parentProvides && key in parentProvides) {
    return parentProvides[key];
  } else {
    return defaultValue;
  }
}

// packages/runtime-core/src/defineAsyncComponent.ts
function defineAsyncComponent(options) {
  if (isFunction(options)) {
    options = { loader: options };
  }
  return {
    setup() {
      const {
        loader,
        errorComponent,
        timeout,
        delay,
        loadingComponent,
        onError
      } = options;
      const loaded = ref(false);
      const loading = ref(false);
      const error = ref(false);
      let loadingTimer = null;
      if (delay) {
        loadingTimer = setTimeout(() => {
          loading.value = true;
        }, delay);
      }
      let Comp = null;
      let attempts = 0;
      function loadFunc() {
        return loader().catch((err) => {
          if (onError) {
            return new Promise((resolve, reject) => {
              const retry = () => resolve(loadFunc());
              const fail = () => reject(err);
              onError(err, retry, fail, ++attempts);
            });
          } else {
            throw err;
          }
        });
      }
      loadFunc().then((comp) => {
        Comp = comp;
        loaded.value = true;
      }).catch((err) => {
        error.value = err;
      }).finally(() => {
        loading.value = false;
        clearTimeout(loadingTimer);
      });
      if (timeout) {
        setTimeout(() => {
          error.value = true;
          throw new Error("\u7EC4\u4EF6\u52A0\u8F7D\u52A0\u8F7D\u5931\u8D25");
        }, timeout);
      }
      const placeholder = h("div");
      return () => {
        if (loaded.value) {
          return h(Comp);
        } else if (error.value && errorComponent) {
          return h(errorComponent);
        } else if (loading.value && loadingComponent) {
          return h(loadingComponent);
        } else {
          return placeholder;
        }
      };
    }
  };
}

// packages/runtime-dom/src/index.ts
var renderOptions = Object.assign({ patchProp }, nodeOps);
var render = (vnode, container) => {
  return createRenderer(renderOptions).render(vnode, container);
};
export {
  Fragment,
  KeepAlive,
  LifeCycle,
  ReactiveEffect,
  Teleport,
  Text,
  Transition,
  activeEffect,
  computed,
  createComponentInstance,
  createRenderer,
  createVNode,
  currentInstance,
  defineAsyncComponent,
  effect,
  getCurrentInstance,
  h,
  inject,
  invokeArray,
  isKeepAlive,
  isReactive,
  isRef,
  isTeleport,
  onBeforeMount,
  onBeforeUpdate,
  onMounted,
  onUpdated,
  provide,
  proxyRefs,
  reactive,
  ref,
  render,
  renderOptions,
  resolveTransitionProps,
  setCurrentInstance,
  setupComponent,
  toReactive,
  toRef,
  toRefs,
  trackEffect,
  trackRefValue,
  triggerEffects,
  triggerRefValue,
  unsetCurrentInstance,
  watch,
  watchEffect
};
//# sourceMappingURL=runtime-dom.js.map
