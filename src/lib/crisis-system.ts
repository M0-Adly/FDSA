import { DoublyLinkedList, SinglyLinkedList, Stack, SNode } from './data-structures';

// ─── TASK 3: sim step to time conversion ─────────────────────────────────────
export const SIM_HOURS_PER_STEP = 1;          // 1 sim step = 1 hour
export const FILTER_DAILY   =  24;             // last 24 steps
export const FILTER_WEEKLY  = 168;             // 7 * 24
export const FILTER_MONTHLY = 720;             // 30 * 24

export const LS_KEY = 'crisis_system_state';   // LocalStorage key

export interface Report {
  id: number;
  type: string;
  description: string;
  priority: number;
  status: 'Pending' | 'Ongoing' | 'Resolved';
  timestamp: number;
  resolvedAt?: number;
  duration?: number;
  supportingDepts?: string[];
  icsScore?: number;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  msg: string;
  type: 'info' | 'warning' | 'error' | 'success';
}

export interface Action {
  type: 'FILE' | 'RESOLVE' | 'ESCALATE' | 'PROMOTE' | 'TRANSFER';
  reportId: number;
  deptName: string;
  extraInfo?: string;
  /** snapshot of the report at the time of action — used by RESOLVE undo */
  reportSnapshot?: Report;
}

// =============================================================================
// ICS PRIORITY SCORING SYSTEM
// =============================================================================
export interface ICSAssessment {
  lifeThreat: number;
  escalationRate: number;
  potentialScale: number;
  selfResponse: number;
  facilityType: number;
}

const ICS_WEIGHTS = {
  lifeThreat: 5,
  escalationRate: 4,
  potentialScale: 3,
  selfResponse: 2,
  facilityType: 3,
};
export const ICS_MAX_SCORE =
  5 * ICS_WEIGHTS.lifeThreat +
  5 * ICS_WEIGHTS.escalationRate +
  5 * ICS_WEIGHTS.potentialScale +
  5 * ICS_WEIGHTS.selfResponse +
  5 * ICS_WEIGHTS.facilityType; // = 85

export function calculateICSScore(assessment: ICSAssessment): number {
  return (
    assessment.lifeThreat     * ICS_WEIGHTS.lifeThreat    +
    assessment.escalationRate * ICS_WEIGHTS.escalationRate +
    assessment.potentialScale * ICS_WEIGHTS.potentialScale +
    assessment.selfResponse   * ICS_WEIGHTS.selfResponse   +
    assessment.facilityType   * ICS_WEIGHTS.facilityType
  );
}

export function getICSTriage(
  score: number,
): { color: 'RED' | 'ORANGE' | 'YELLOW'; label: string; priority: number } {
  const pct = score / ICS_MAX_SCORE;
  if (pct >= 0.65) return { color: 'RED',    label: 'Immediate',  priority: 5 };
  if (pct >= 0.40) return { color: 'ORANGE', label: 'Urgent',     priority: 3 };
  return               { color: 'YELLOW', label: 'Non-Urgent', priority: 1 };
}

// =============================================================================
// DEPARTMENT NODE
// TASK 3: resolvedArchive is now an unlimited SinglyLinkedList (was CircularLinkedList of 10)
// =============================================================================
export class DepartmentNode {
  name: string;
  isDistrict: boolean;

  ongoingReports: SinglyLinkedList<Report>;
  pendingReports:  DoublyLinkedList<Report>;
  resolvedArchive: SinglyLinkedList<Report>;   // TASK 3: unlimited
  children:        SinglyLinkedList<DepartmentNode>;

  resources: { total: number; available: number };

  constructor(name: string, isDistrict = false) {
    this.name = name;
    this.isDistrict = isDistrict;
    this.ongoingReports = new SinglyLinkedList<Report>();
    this.pendingReports  = new DoublyLinkedList<Report>();
    this.resolvedArchive = new SinglyLinkedList<Report>();  // TASK 3
    this.children        = new SinglyLinkedList<DepartmentNode>();
    this.resources = {
      total:     isDistrict ? 0 : 5,
      available: isDistrict ? 0 : 5,
    };
  }
}

// =============================================================================
// CRISIS SYSTEM CONTROLLER
// =============================================================================
export class CrisisSystem {
  root: DepartmentNode | null = null;
  actionHistory: Stack<Action>;
  nextReportId: number;
  simStep: number;

  static readonly MAX_ONGOING = 3;
  static readonly ESCALATION_THRESHOLD = 3;

  constructor() {
    this.actionHistory = new Stack<Action>();
    this.nextReportId  = 1;
    this.simStep       = 0;
  }

  // ── Tree traversal ──────────────────────────────────────────────────────────
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
    if (deptShort === 'Fire')        return 'Fire Dept - ' + suffix;
    if (deptShort === 'Police')      return 'Police Dept - ' + suffix;
    if (deptShort === 'Ambulance')   return 'Ambulance - ' + suffix;
    if (deptShort === 'Water')       return 'Water Co. - ' + suffix;
    if (deptShort === 'Electricity') return 'Electricity Co. - ' + suffix;
    return deptShort + ' - ' + suffix;
  }

  getSiblingDept(deptName: string): DepartmentNode | null {
    let sibling = deptName;
    if (deptName.includes('D1'))      sibling = sibling.replace('D1', 'D2');
    else if (deptName.includes('D2')) sibling = sibling.replace('D2', 'D1');
    return this.findNode(this.root, sibling);
  }

  // ── Auto-promotion (TASK 4: strict capacity guard) ───────────────────────────
  promotePendingToOngoing(dept: DepartmentNode): void {
    // TASK 4: double-check both size AND resources before promoting
    if (dept.ongoingReports.size() >= CrisisSystem.MAX_ONGOING) return;
    if (dept.pendingReports.isEmpty()) return;
    if (dept.resources.available <= 0) return;

    const top = dept.pendingReports.head;
    if (!top) return;
    const r = top.data;
    dept.pendingReports.removeNodeByValue((v) => v.id === r.id);
    r.status = 'Ongoing';
    dept.ongoingReports.insertLast(r);
    dept.resources.available--;
    this.actionHistory.push({ type: 'PROMOTE', reportId: r.id, deptName: dept.name });
    this.persist();
  }

  // ── Resolve ──────────────────────────────────────────────────────────────────
  resolveReportInTree(
    node: DepartmentNode | null,
    reportId: number,
    currentStep: number,
  ): boolean {
    if (!node) return false;
    let cur = node.ongoingReports.head;
    while (cur) {
      if (cur.data.id === reportId) {
        const r = { ...cur.data };
        node.ongoingReports.removeValue((v) => v.id === reportId);
        r.status     = 'Resolved';
        r.resolvedAt = currentStep;
        r.duration   = currentStep - r.timestamp;
        // TASK 3: insert into unlimited SinglyLinkedList at front (newest first)
        node.resolvedArchive.insertFront(r);
        node.resources.available++;
        // TASK 6: store snapshot for undo
        this.actionHistory.push({
          type:           'RESOLVE',
          reportId,
          deptName:       node.name,
          reportSnapshot: r,
        });
        this.promotePendingToOngoing(node);
        this.persist();
        return true;
      }
      cur = cur.next;
    }
    let child = node.children.head;
    while (child) {
      if (this.resolveReportInTree(child.data, reportId, currentStep)) return true;
      child = child.next;
    }
    return false;
  }

  // ── Aging ────────────────────────────────────────────────────────────────────
  applyAging(node: DepartmentNode | null): void {
    if (!node) return;
    if (!node.isDistrict) {
      let cur = node.pendingReports.head;
      while (cur) {
        if (cur.data.priority < 5) cur.data.priority++;
        cur = cur.next;
      }
    }
    let child = node.children.head;
    while (child) {
      this.applyAging(child.data);
      child = child.next;
    }
  }

  // ── Escalation (TASK 7: simStep incremented once per call in escalatePendingReports) ─
  escalateInTree(node: DepartmentNode | null, isMassCrisis: boolean): void {
    if (!node) return;
    const threshold = isMassCrisis ? 1 : CrisisSystem.ESCALATION_THRESHOLD;
    if (!node.isDistrict) {
      let cur = node.pendingReports.head;
      while (cur) {
        const next = cur.next;
        if (this.simStep - cur.data.timestamp >= threshold) {
          const r       = { ...cur.data };
          node.pendingReports.removeNodeByValue((v) => v.id === r.id);
          const sibling = this.getSiblingDept(node.name);
          if (sibling) {
            sibling.pendingReports.insertSortedByPriority(r, (v) => v.priority);
            this.actionHistory.push({
              type:      'ESCALATE',
              reportId:  r.id,
              deptName:  node.name,
              extraInfo: sibling.name,
            });
          } else {
            // no sibling — keep in same dept
            node.pendingReports.insertSortedByPriority(r, (v) => v.priority);
          }
        }
        cur = next;
      }
    }
    let child = node.children.head;
    while (child) {
      this.escalateInTree(child.data, isMassCrisis);
      child = child.next;
    }
  }

  // ── Initialization ───────────────────────────────────────────────────────────
  initializeSystem(): void {
    this.root = new DepartmentNode('Central Crisis System');
    const d1  = new DepartmentNode('First District',  true);
    const d2  = new DepartmentNode('Second District', true);
    const deptNames = ['Fire Dept', 'Police Dept', 'Ambulance', 'Water Co.', 'Electricity Co.'];
    const suffixes  = ['D1', 'D2'];
    const districts = [d1, d2];
    for (let di = 0; di < 2; di++) {
      for (let j = 0; j < 5; j++) {
        const fullName = deptNames[j] + ' - ' + suffixes[di];
        districts[di].children.insertLast(new DepartmentNode(fullName));
      }
    }
    this.root.children.insertLast(d1);
    this.root.children.insertLast(d2);

    // Seed data for Fire D1
    const fireD1 = this.findNode(this.root, 'Fire Dept - D1');
    if (fireD1) {
      fireD1.ongoingReports.insertLast({
        id: this.nextReportId++, type: 'Fire',
        description: 'Factory fire', priority: 4,
        status: 'Ongoing', timestamp: ++this.simStep,
      });
      fireD1.ongoingReports.insertLast({
        id: this.nextReportId++, type: 'Fire',
        description: 'Warehouse smoke', priority: 3,
        status: 'Ongoing', timestamp: ++this.simStep,
      });
      fireD1.ongoingReports.insertLast({
        id: this.nextReportId++, type: 'Fire',
        description: 'Apartment alarm', priority: 2,
        status: 'Ongoing', timestamp: ++this.simStep,
      });
      fireD1.resources.available = 2; // 3 consumed
      fireD1.pendingReports.insertSortedByPriority(
        { id: this.nextReportId++, type: 'Fire', description: 'Hospital emergency', priority: 5, status: 'Pending', timestamp: ++this.simStep },
        (v) => v.priority,
      );
      fireD1.pendingReports.insertSortedByPriority(
        { id: this.nextReportId++, type: 'Fire', description: 'Trash can fire', priority: 1, status: 'Pending', timestamp: ++this.simStep },
        (v) => v.priority,
      );
    }
  }

  // ── File Report (TASK 4: strict capacity, TASK 7: simStep++) ─────────────────
  fileReport(
    district: string,
    deptShort: string,
    type: string,
    desc: string,
    priority: number,
    isMassCrisis: boolean,
    secondary?: string,
    icsScore?: number,
  ): void {
    this.simStep++;   // TASK 7
    const deptName = this.buildDeptName(district, deptShort);
    const dept     = this.findNode(this.root, deptName);
    if (!dept) return;

    const rPriority = isMassCrisis ? 5 : priority;

    const r: Report = {
      id:          this.nextReportId++,
      type,
      description: desc,
      priority:    rPriority,
      status:      'Pending',
      timestamp:   this.simStep,
      supportingDepts: secondary ? [secondary] : undefined,
      icsScore,
    };

    // TASK 4: check BOTH size < 3 AND resources available
    if (
      dept.ongoingReports.size() < CrisisSystem.MAX_ONGOING &&
      dept.resources.available > 0
    ) {
      r.status = 'Ongoing';
      dept.ongoingReports.insertLast(r);
      dept.resources.available--;
    } else {
      dept.pendingReports.insertSortedByPriority(r, (v) => v.priority);
    }

    this.actionHistory.push({ type: 'FILE', reportId: r.id, deptName });
    this.persist();
  }

  // ── Resolve (TASK 7: simStep++) ───────────────────────────────────────────────
  resolveReport(reportId: number): void {
    this.simStep++;   // TASK 7
    this.resolveReportInTree(this.root, reportId, this.simStep);
  }

  // ── Escalate (TASK 7: simStep++ once per call) ────────────────────────────────
  escalatePendingReports(isMassCrisis = false): void {
    this.simStep++;   // TASK 7: once per call, not per report
    this.escalateInTree(this.root, isMassCrisis);
    this.persist();
  }

  // ── Transfer Pending Report (TASK 2: full fix) ────────────────────────────────
  transferPendingReport(fromDeptName: string, toDeptName: string, reportId: number): void {
    const from = this.findNode(this.root, fromDeptName);
    const to   = this.findNode(this.root, toDeptName);
    if (!from || !to) return;

    // TASK 2: use findNode to get the DNode pointer, then removeNode (O(1) pointer surgery)
    const dnode = from.pendingReports.findNode((v) => v.id === reportId);
    if (!dnode) return;

    const r = { ...dnode.data };
    from.pendingReports.removeNode(dnode);
    to.pendingReports.insertSortedByPriority(r, (v) => v.priority);

    this.simStep++;   // time passes on transfer
    this.actionHistory.push({
      type:      'TRANSFER',
      reportId,
      deptName:  fromDeptName,
      extraInfo: toDeptName,
    });
    this.persist();
  }

  // ── Undo (TASK 6: full implementation for all action types) ──────────────────
  undoLastAction(): void {
    const act = this.actionHistory.pop();
    if (!act) return;

    if (act.type === 'FILE') {
      // Remove the report from wherever it ended up (ongoing or pending)
      const dept = this.findNode(this.root, act.deptName);
      if (!dept) return;
      const wasOngoing = dept.ongoingReports.toArray().some((r) => r.id === act.reportId);
      if (wasOngoing) {
        dept.ongoingReports.removeValue((v) => v.id === act.reportId);
        dept.resources.available++;
      } else {
        dept.pendingReports.removeNodeByValue((v) => v.id === act.reportId);
      }

    } else if (act.type === 'PROMOTE') {
      // Move promoted report back from ongoing → pending
      const dept = this.findNode(this.root, act.deptName);
      if (!dept) return;
      let removed: Report | null = null;
      let cur = dept.ongoingReports.head;
      while (cur) {
        if (cur.data.id === act.reportId) { removed = { ...cur.data }; break; }
        cur = cur.next;
      }
      if (removed) {
        dept.ongoingReports.removeValue((v) => v.id === act.reportId);
        dept.resources.available++;
        removed.status = 'Pending';
        dept.pendingReports.insertSortedByPriority(removed, (v) => v.priority);
      }

    } else if (act.type === 'RESOLVE') {
      // TASK 6: move report back from resolvedArchive → ongoing (or pending if full)
      const dept = this.findNode(this.root, act.deptName);
      if (!dept) return;
      // The snapshot was stored at push time
      const snap = act.reportSnapshot;
      if (!snap) return;
      // Remove from resolvedArchive
      dept.resolvedArchive.removeValue((v) => v.id === act.reportId);
      // Free the resource that was gained on resolve
      if (dept.resources.available > 0) dept.resources.available--;
      // Put back into ongoing or pending
      if (dept.ongoingReports.size() < CrisisSystem.MAX_ONGOING && dept.resources.available > 0) {
        const restored: Report = { ...snap, status: 'Ongoing', resolvedAt: undefined, duration: undefined };
        dept.ongoingReports.insertLast(restored);
      } else {
        const restored: Report = { ...snap, status: 'Pending', resolvedAt: undefined, duration: undefined };
        dept.pendingReports.insertSortedByPriority(restored, (v) => v.priority);
      }

    } else if (act.type === 'ESCALATE') {
      // TASK 6: reverse escalate — move from sibling back to original dept
      const original = this.findNode(this.root, act.deptName);
      const sibling  = this.findNode(this.root, act.extraInfo || '');
      if (!original || !sibling) return;
      const dnode = sibling.pendingReports.findNode((v) => v.id === act.reportId);
      if (!dnode) return;
      const r = { ...dnode.data };
      sibling.pendingReports.removeNode(dnode);
      original.pendingReports.insertSortedByPriority(r, (v) => v.priority);

    } else if (act.type === 'TRANSFER') {
      // TASK 6: reverse transfer — move from toDept back to fromDept
      const fromDept = this.findNode(this.root, act.deptName);
      const toDept   = this.findNode(this.root, act.extraInfo || '');
      if (!fromDept || !toDept) return;
      const dnode = toDept.pendingReports.findNode((v) => v.id === act.reportId);
      if (!dnode) return;
      const r = { ...dnode.data };
      toDept.pendingReports.removeNode(dnode);
      fromDept.pendingReports.insertSortedByPriority(r, (v) => v.priority);
    }

    this.persist();
  }

  // ── TASK 3: Filter resolved archive by time window ───────────────────────────
  filterResolved(
    dept: DepartmentNode,
    filter: 'all' | 'daily' | 'weekly' | 'monthly',
  ): Report[] {
    const all = dept.resolvedArchive.toArray();
    if (filter === 'all') return all;
    const horizon =
      filter === 'daily'   ? this.simStep - FILTER_DAILY   :
      filter === 'weekly'  ? this.simStep - FILTER_WEEKLY  :
                             this.simStep - FILTER_MONTHLY;
    return all.filter((r) => r.timestamp >= horizon);
  }

  // ── TASK 3: System-wide resolved archive filter ───────────────────────────────
  filterAllResolved(filter: 'all' | 'daily' | 'weekly' | 'monthly'): Report[] {
    const results: Report[] = [];
    const walk = (node: DepartmentNode | null) => {
      if (!node) return;
      if (!node.isDistrict && node.name !== 'Central Crisis System') {
        results.push(...this.filterResolved(node, filter));
      }
      let child = node.children.head;
      while (child) { walk(child.data); child = child.next; }
    };
    walk(this.root);
    return results;
  }

  // ── Stats ─────────────────────────────────────────────────────────────────────
  getSystemStats(): Record<string, { ongoing: number; pending: number; resolved: number }> {
    const stats: Record<string, { ongoing: number; pending: number; resolved: number }> = {};
    if (!this.root) return stats;
    let district = this.root.children.head;
    while (district) {
      const dist = district.data;
      let totalOngoing = 0, totalPending = 0, totalResolved = 0;
      let dept = dist.children.head;
      while (dept) {
        totalOngoing  += dept.data.ongoingReports.size();
        totalPending  += dept.data.pendingReports.size();
        totalResolved += dept.data.resolvedArchive.size();
        dept = dept.next;
      }
      stats[dist.name] = { ongoing: totalOngoing, pending: totalPending, resolved: totalResolved };
      district = district.next;
    }
    return stats;
  }

  // ── TASK 3 & 5: LocalStorage persistence ──────────────────────────────────────
  persist(): void {
    try {
      const state = this.serialize();
      localStorage.setItem(LS_KEY, JSON.stringify(state));
    } catch (_) {
      // quota exceeded — silently ignore
    }
  }

  serialize(): object {
    const serializeDept = (dept: DepartmentNode): object => ({
      name:       dept.name,
      isDistrict: dept.isDistrict,
      resources:  dept.resources,
      ongoing:    dept.ongoingReports.toArray(),
      pending:    dept.pendingReports.toArray(),
      resolved:   dept.resolvedArchive.toArray(),
      children:   dept.children.toArray().map(serializeDept),
    });
    return {
      simStep:      this.simStep,
      nextReportId: this.nextReportId,
      root:         this.root ? serializeDept(this.root) : null,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static deserialize(data: any): CrisisSystem {
    const sys = new CrisisSystem();
    sys.simStep      = data.simStep      ?? 0;
    sys.nextReportId = data.nextReportId ?? 1;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const deserializeDept = (d: any): DepartmentNode => {
      const node      = new DepartmentNode(d.name, d.isDistrict);
      node.resources  = d.resources;
      (d.ongoing  as Report[]).forEach((r) => node.ongoingReports.insertLast(r));
      (d.pending  as Report[]).forEach((r) =>
        node.pendingReports.insertSortedByPriority(r, (v) => v.priority),
      );
      // TASK 3: resolved list — newest first (insertFront to preserve order)
      const resolvedArr = (d.resolved as Report[]);
      // They were stored newest-first; re-insert front to head to keep order
      for (let i = resolvedArr.length - 1; i >= 0; i--) {
        node.resolvedArchive.insertFront(resolvedArr[i]);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (d.children as any[]).forEach((c) => node.children.insertLast(deserializeDept(c)));
      return node;
    };

    if (data.root) {
      sys.root = deserializeDept(data.root);
    }
    return sys;
  }

  static loadFromStorage(): CrisisSystem | null {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return null;
      return CrisisSystem.deserialize(JSON.parse(raw));
    } catch (_) {
      return null;
    }
  }
}
