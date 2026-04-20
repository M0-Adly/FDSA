// Singly Linked List Node
export class SNode<T> {
  data: T;
  next: SNode<T> | null;

  constructor(val: T) {
    this.data = val;
    this.next = null;
  }
}

// Singly Linked List
export class SinglyLinkedList<T> {
  head: SNode<T> | null;
  private count: number;

  constructor() {
    this.head = null;
    this.count = 0;
  }

  insertLast(val: T): void {
    const newNode = new SNode(val);
    if (!this.head) {
      this.head = newNode;
    } else {
      let cur = this.head;
      while (cur.next) {
        cur = cur.next;
      }
      cur.next = newNode;
    }
    this.count++;
  }

  insertFront(val: T): void {
    const newNode = new SNode(val);
    newNode.next = this.head;
    this.head = newNode;
    this.count++;
  }

  removeFirst(): T | null {
    if (!this.head) return null;
    const val = this.head.data;
    this.head = this.head.next;
    this.count--;
    return val;
  }

  removeValue(isEqual: (val: T) => boolean): boolean {
    let cur = this.head;
    let prev: SNode<T> | null = null;
    while (cur) {
      if (isEqual(cur.data)) {
        if (prev) {
          prev.next = cur.next;
        } else {
          this.head = cur.next;
        }
        this.count--;
        return true;
      }
      prev = cur;
      cur = cur.next;
    }
    return false;
  }

  isEmpty(): boolean {
    return this.head === null;
  }

  size(): number {
    return this.count;
  }

  toArray(): T[] {
    const arr: T[] = [];
    let cur = this.head;
    while (cur) {
      arr.push(cur.data);
      cur = cur.next;
    }
    return arr;
  }
}

// Doubly Linked List Node
export class DNode<T> {
  data: T;
  prev: DNode<T> | null;
  next: DNode<T> | null;

  constructor(val: T) {
    this.data = val;
    this.prev = null;
    this.next = null;
  }
}

// Doubly Linked List
export class DoublyLinkedList<T> {
  head: DNode<T> | null;
  tail: DNode<T> | null;
  private count: number;

  constructor() {
    this.head = null;
    this.tail = null;
    this.count = 0;
  }

  insertLast(val: T): void {
    const newNode = new DNode(val);
    if (!this.tail) {
      this.head = this.tail = newNode;
    } else {
      newNode.prev = this.tail;
      this.tail.next = newNode;
      this.tail = newNode;
    }
    this.count++;
  }

  insertSortedByPriority(val: T, getPriority: (val: T) => number): void {
    const newNode = new DNode(val);
    if (!this.head) {
      this.head = this.tail = newNode;
      this.count++;
      return;
    }
    
    let cur: DNode<T> | null = this.head;
    const newPriority = getPriority(val);

    while (cur) {
      if (newPriority > getPriority(cur.data)) {
        // insert before cur
        newNode.next = cur;
        newNode.prev = cur.prev;
        if (cur.prev) {
          cur.prev.next = newNode;
        } else {
          this.head = newNode;
        }
        cur.prev = newNode;
        this.count++;
        return;
      }
      cur = cur.next;
    }
    
    // insert at end (lowest priority)
    newNode.prev = this.tail;
    if (this.tail) this.tail.next = newNode;
    this.tail = newNode;
    this.count++;
  }

  // Remove by predicate (value comparison)
  removeNodeByValue(isEqual: (val: T) => boolean): boolean {
    let cur = this.head;
    while (cur) {
      if (isEqual(cur.data)) {
        return this.removeNode(cur);
      }
      cur = cur.next;
    }
    return false;
  }

  // Remove a specific DNode pointer — O(1) pointer surgery (TASK 2 fix)
  removeNode(node: DNode<T>): boolean {
    if (node.prev) node.prev.next = node.next;
    else this.head = node.next;

    if (node.next) node.next.prev = node.prev;
    else this.tail = node.prev;

    node.prev = null;
    node.next = null;
    this.count--;
    return true;
  }

  // Find DNode by predicate, returns the node pointer (TASK 2)
  findNode(isEqual: (val: T) => boolean): DNode<T> | null {
    let cur = this.head;
    while (cur) {
      if (isEqual(cur.data)) return cur;
      cur = cur.next;
    }
    return null;
  }

  isEmpty(): boolean {
    return this.head === null;
  }

  size(): number {
    return this.count;
  }

  toArray(): T[] {
    const arr: T[] = [];
    let cur = this.head;
    while (cur) {
      arr.push(cur.data);
      cur = cur.next;
    }
    return arr;
  }
}

// Circular Linked List (kept for legacy; capacity-based ring buffer)
export class CircularLinkedList<T> {
  private tail: SNode<T> | null;
  private count: number;
  private capacity: number;

  constructor(cap: number = 10) {
    this.tail = null;
    this.count = 0;
    this.capacity = cap;
  }

  insert(val: T): void {
    const newNode = new SNode(val);
    if (!this.tail) {
      newNode.next = newNode;
      this.tail = newNode;
      this.count++;
    } else if (this.count < this.capacity) {
      newNode.next = this.tail.next;
      this.tail.next = newNode;
      this.tail = newNode;
      this.count++;
    } else {
      // overwrite oldest (head)
      const oldHead = this.tail.next;
      if (oldHead) {
        this.tail.next = oldHead.next;
        newNode.next = this.tail.next;
        this.tail.next = newNode;
        this.tail = newNode;
      }
    }
  }

  isEmpty(): boolean {
    return this.tail === null;
  }

  size(): number {
    return this.count;
  }

  toArray(): T[] {
    if (!this.tail) return [];
    const arr: T[] = [];
    const head = this.tail.next;
    if (!head) return [];

    let cur: SNode<T> | null = head;
    let i = 0;
    do {
      if (cur) {
        arr.push(cur.data);
        cur = cur.next;
      }
      i++;
    } while (cur !== head && i < this.count);
    return arr;
  }
}

// Queue
export class Queue<T> {
  private list: SinglyLinkedList<T>;

  constructor() {
    this.list = new SinglyLinkedList<T>();
  }

  enqueue(val: T): void {
    this.list.insertLast(val);
  }

  dequeue(): T | null {
    return this.list.removeFirst();
  }

  isEmpty(): boolean {
    return this.list.isEmpty();
  }

  size(): number {
    return this.list.size();
  }

  toArray(): T[] {
    return this.list.toArray();
  }
}

// Stack
export class Stack<T> {
  private list: SinglyLinkedList<T>;

  constructor() {
    this.list = new SinglyLinkedList<T>();
  }

  push(val: T): void {
    this.list.insertFront(val);
  }

  pop(): T | null {
    return this.list.removeFirst();
  }

  top(): T | null {
    if (this.list.isEmpty() || !this.list.head) return null;
    return this.list.head.data;
  }

  isEmpty(): boolean {
    return this.list.isEmpty();
  }

  size(): number {
    return this.list.size();
  }

  toArray(): T[] {
    return this.list.toArray();
  }
}
