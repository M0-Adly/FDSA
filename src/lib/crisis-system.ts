import { CircularLinkedList, DoublyLinkedList, SinglyLinkedList, Stack, SNode } from './data-structures';

export interface Report {
  id: number;
  type: string;
  description: string;
  priority: number;
  status: 'Pending' | 'Ongoing' | 'Resolved';
  timestamp: number;
}

export interface Action {
  type: 'FILE' | 'RESOLVE' | 'ESCALATE' | 'PROMOTE' | 'TRANSFER';
  reportId: number;
  deptName: string;
  extraInfo?: string;
}

export class DepartmentNode {
  name: string;
  isDistrict: boolean;

  ongoingReports: SinglyLinkedList<Report>;
  pendingReports: DoublyLinkedList<Report>;
  resolvedArchive: CircularLinkedList<Report>;
  children: SinglyLinkedList<DepartmentNode>;

  constructor(name: string, isDistrict: boolean = false) {
    this.name = name;
    this.isDistrict = isDistrict;
    this.ongoingReports = new SinglyLinkedList<Report>();
    this.pendingReports = new DoublyLinkedList<Report>();
    this.resolvedArchive = new CircularLinkedList<Report>(10);
    this.children = new SinglyLinkedList<DepartmentNode>();
  }
}

export class CrisisSystem {
  root: DepartmentNode | null = null;
  actionHistory: Stack<Action>;
  nextReportId: number;
  simStep: number;

  static readonly MAX_ONGOING = 3;
  static readonly ESCALATION_THRESHOLD = 3;

  constructor() {
    this.actionHistory = new Stack<Action>();
    this.nextReportId = 1;
    this.simStep = 0;
  }

  findNode(node: DepartmentNode | null, name: string): DepartmentNode | null {
    if (!node) return null;
    if (node.name === name) return node;

    let child: SNode<DepartmentNode> | null = node.children.head;
    while (child) {
      const found = this.findNode(child.data, name);
      if (found) return found;
      child = child.next;
    }
    return null;
  }

  buildDeptName(district: string, deptShort: string): string {
    const suffix = district === 'First District' ? 'D1' : 'D2';
    if (deptShort === 'Fire') return 'Fire Dept - ' + suffix;
    if (deptShort === 'Police') return 'Police Dept - ' + suffix;
    if (deptShort === 'Ambulance') return 'Ambulance - ' + suffix;
    if (deptShort === 'Water') return 'Water Co. - ' + suffix;
    if (deptShort === 'Electricity') return 'Electricity Co. - ' + suffix;
    return deptShort + ' - ' + suffix;
  }

  getSiblingDept(deptName: string): DepartmentNode | null {
    let sibling = deptName;
    if (deptName.includes('D1')) {
      sibling = sibling.replace('D1', 'D2');
    } else if (deptName.includes('D2')) {
      sibling = sibling.replace('D2', 'D1');
    }
    return this.findNode(this.root, sibling);
  }

  promotePendingToOngoing(dept: DepartmentNode): void {
    if (dept.ongoingReports.size() >= CrisisSystem.MAX_ONGOING) return;
    if (dept.pendingReports.isEmpty()) return;

    const top = dept.pendingReports.head;
    if (!top) return;

    const r = top.data;
    dept.pendingReports.removeNodeByValue((val) => val.id === r.id);

    r.status = 'Ongoing';
    dept.ongoingReports.insertLast(r);

    this.actionHistory.push({ type: 'PROMOTE', reportId: r.id, deptName: dept.name });
  }

  resolveReportInTree(node: DepartmentNode | null, reportId: number): boolean {
    if (!node) return false;

    let cur = node.ongoingReports.head;
    while (cur) {
      if (cur.data.id === reportId) {
        const r = { ...cur.data }; // copy
        node.ongoingReports.removeValue((val) => val.id === reportId);
        r.status = 'Resolved';
        node.resolvedArchive.insert(r);

        this.actionHistory.push({ type: 'RESOLVE', reportId: reportId, deptName: node.name });

        this.promotePendingToOngoing(node);
        return true;
      }
      cur = cur.next;
    }

    let child = node.children.head;
    while (child) {
      if (this.resolveReportInTree(child.data, reportId)) return true;
      child = child.next;
    }
    return false;
  }

  escalateInTree(node: DepartmentNode | null): void {
    if (!node) return;

    if (!node.isDistrict) {
      let cur = node.pendingReports.head;
      while (cur) {
        const next = cur.next;
        if (this.simStep - cur.data.timestamp > CrisisSystem.ESCALATION_THRESHOLD) {
          const r = { ...cur.data };
          node.pendingReports.removeNodeByValue((v) => v.id === r.id);
          
          const sibling = this.getSiblingDept(node.name);
          if (sibling) {
            sibling.pendingReports.insertSortedByPriority(r, (val) => val.priority);
            this.actionHistory.push({ type: 'ESCALATE', reportId: r.id, deptName: node.name, extraInfo: sibling.name });
          } else {
            node.pendingReports.insertSortedByPriority(r, (val) => val.priority);
          }
        }
        cur = next;
      }
    }

    let child = node.children.head;
    while (child) {
      this.escalateInTree(child.data);
      child = child.next;
    }
  }

  initializeSystem(): void {
    this.root = new DepartmentNode('Central Crisis System');

    const d1 = new DepartmentNode('First District', true);
    const d2 = new DepartmentNode('Second District', true);

    const deptNames = ['Fire Dept', 'Police Dept', 'Ambulance', 'Water Co.', 'Electricity Co.'];
    const suffixes = ['D1', 'D2'];
    const districts = [d1, d2];

    for (let di = 0; di < 2; di++) {
      for (let j = 0; j < 5; j++) {
        const fullName = deptNames[j] + ' - ' + suffixes[di];
        const dept = new DepartmentNode(fullName);
        districts[di].children.insertLast(dept);
      }
    }

    this.root.children.insertLast(d1);
    this.root.children.insertLast(d2);

    const fireD1 = this.findNode(this.root, 'Fire Dept - D1');
    if (fireD1) {
      fireD1.ongoingReports.insertLast({ id: this.nextReportId++, type: 'Fire', description: 'Factory fire', priority: 4, status: 'Ongoing', timestamp: ++this.simStep });
      fireD1.ongoingReports.insertLast({ id: this.nextReportId++, type: 'Fire', description: 'Warehouse smoke', priority: 3, status: 'Ongoing', timestamp: ++this.simStep });
      fireD1.ongoingReports.insertLast({ id: this.nextReportId++, type: 'Fire', description: 'Apartment alarm', priority: 2, status: 'Ongoing', timestamp: ++this.simStep });

      fireD1.pendingReports.insertSortedByPriority({ id: this.nextReportId++, type: 'Fire', description: 'Hospital emergency', priority: 5, status: 'Pending', timestamp: ++this.simStep }, (v) => v.priority);
      fireD1.pendingReports.insertSortedByPriority({ id: this.nextReportId++, type: 'Fire', description: 'Trash can', priority: 1, status: 'Pending', timestamp: ++this.simStep }, (v) => v.priority);
    }
  }

  fileReport(district: string, deptShort: string, type: string, desc: string, priority: number): void {
    this.simStep++;
    const deptName = this.buildDeptName(district, deptShort);
    const dept = this.findNode(this.root, deptName);
    if (!dept) return;

    const r: Report = { id: this.nextReportId++, type, description: desc, priority, status: 'Pending', timestamp: this.simStep };

    if (dept.ongoingReports.size() < CrisisSystem.MAX_ONGOING) {
      r.status = 'Ongoing';
      dept.ongoingReports.insertLast(r);
      this.actionHistory.push({ type: 'FILE', reportId: r.id, deptName: deptName });
    } else {
      dept.pendingReports.insertSortedByPriority(r, (v) => v.priority);
    }
  }

  resolveReport(reportId: number): void {
    this.simStep++;
    this.resolveReportInTree(this.root, reportId);
  }

  escalatePendingReports(): void {
    this.simStep++;
    this.escalateInTree(this.root);
  }

  undoLastAction(): void {
    const act = this.actionHistory.pop();
    if (!act) return;

    if (act.type === 'FILE') {
      const dept = this.findNode(this.root, act.deptName);
      if (dept) {
        dept.ongoingReports.removeValue((v) => v.id === act.reportId);
      }
    } else if (act.type === 'RESOLVE') {
      // Logic for undo resolve (optional as per C++ comments: "Resolution undo is limited")
    } else if (act.type === 'ESCALATE') {
      // Logic for undo escalate not implemented in C++ either
    } else if (act.type === 'PROMOTE') {
        const dept = this.findNode(this.root, act.deptName);
        if (dept) {
            // Remove from ongoing
            let removed: Report | null = null;
            let cur = dept.ongoingReports.head;
            while (cur) {
                if (cur.data.id === act.reportId) removed = { ...cur.data };
                cur = cur.next;
            }
            if (removed) {
                dept.ongoingReports.removeValue(v => v.id === act.reportId);
                removed.status = 'Pending';
                dept.pendingReports.insertSortedByPriority(removed, v => v.priority);
            }
        }
    } else if (act.type === 'TRANSFER') {
      const from = this.findNode(this.root, act.deptName);
      const to = this.findNode(this.root, act.extraInfo || '');
      if (from && to) {
        let moved: Report | null = null;
        let cur = to.pendingReports.head;
        while(cur) {
            if (cur.data.id === act.reportId) moved = { ...cur.data };
            cur = cur.next;
        }
        if (moved) {
            to.pendingReports.removeNodeByValue(v => v.id === act.reportId);
            from.pendingReports.insertSortedByPriority(moved, v => v.priority);
        }
      }
    }
  }

  transferPendingReport(fromDept: string, toDept: string, reportId: number): void {
    const from = this.findNode(this.root, fromDept);
    const to = this.findNode(this.root, toDept);
    if (!from || !to) return;

    let cur = from.pendingReports.head;
    while (cur) {
      if (cur.data.id === reportId) {
        const r = { ...cur.data };
        from.pendingReports.removeNodeByValue((v) => v.id === reportId);
        to.pendingReports.insertSortedByPriority(r, (v) => v.priority);
        this.actionHistory.push({ type: 'TRANSFER', reportId, deptName: fromDept, extraInfo: toDept });
        return;
      }
      cur = cur.next;
    }
  }

  getSystemStats() {
    const stats: Record<string, { ongoing: number; pending: number; resolved: number }> = {};
    if (!this.root) return stats;

    let district = this.root.children.head;
    while (district) {
      const dist = district.data;
      let totalOngoing = 0, totalPending = 0, totalResolved = 0;
      
      let dept = dist.children.head;
      while (dept) {
        totalOngoing += dept.data.ongoingReports.size();
        totalPending += dept.data.pendingReports.size();
        totalResolved += dept.data.resolvedArchive.size();
        dept = dept.next;
      }
      stats[dist.name] = { ongoing: totalOngoing, pending: totalPending, resolved: totalResolved };
      district = district.next;
    }
    return stats;
  }
}
