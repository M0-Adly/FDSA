import { DoublyLinkedList, SinglyLinkedList, Stack, SNode } from './data-structures';

// ── Constants ─────────────────────────────────────────────────────────────────
export const SIM_HOURS_PER_STEP = 1;
export const FILTER_DAILY   =  24;
export const FILTER_WEEKLY  = 168;
export const FILTER_MONTHLY = 720;
export const DEPT_TOTAL_CAPACITY = 5;   // T4: static visual capacity per dept

export const LS_KEY = 'crisis_system_state';

// ── Types ─────────────────────────────────────────────────────────────────────
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
  reportSnapshot?: Report;
}

// ── ICS Scoring ───────────────────────────────────────────────────────────────
export interface ICSAssessment {
  lifeThreat: number;
  escalationRate: number;
  potentialScale: number;
  selfResponse: number;
  facilityType: number;
}

const ICS_WEIGHTS = { lifeThreat: 5, escalationRate: 4, potentialScale: 3, selfResponse: 2, facilityType: 3 };

export const ICS_MAX_SCORE =
  5 * ICS_WEIGHTS.lifeThreat + 5 * ICS_WEIGHTS.escalationRate +
  5 * ICS_WEIGHTS.potentialScale + 5 * ICS_WEIGHTS.selfResponse +
  5 * ICS_WEIGHTS.facilityType; // 85

export function calculateICSScore(a: ICSAssessment): number {
  return (
    a.lifeThreat * ICS_WEIGHTS.lifeThreat +
    a.escalationRate * ICS_WEIGHTS.escalationRate +
    a.potentialScale * ICS_WEIGHTS.potentialScale +
    a.selfResponse * ICS_WEIGHTS.selfResponse +
    a.facilityType * ICS_WEIGHTS.facilityType
  );
}

export function getICSTriage(
  score: number,
): { color: 'RED' | 'ORANGE' | 'YELLOW'; label: string; priority: number } {
  const pct = score / ICS_MAX_SCORE;
  if (pct >= 0.65) return { color: 'RED', label: 'Immediate', priority: 5 };
  if (pct >= 0.40) return { color: 'ORANGE', label: 'Urgent', priority: 3 };
  return { color: 'YELLOW', label: 'Non-Urgent', priority: 1 };
}

// ── Department Node ───────────────────────────────────────────────────────────
export class DepartmentNode {
  name: string;
  isDistrict: boolean;

  ongoingReports: SinglyLinkedList<Report>;
  pendingReports:  DoublyLinkedList<Report>;
  resolvedArchive: SinglyLinkedList<Report>;
  children:        SinglyLinkedList<DepartmentNode>;

  // T4: total = static capacity label (5), available = free slots
  resources: { total: number; available: number };

  constructor(name: string, isDistrict = false) {
    this.name        = name;
    this.isDistrict  = isDistrict;
    this.ongoingReports = new SinglyLinkedList<Report>();
    this.pendingReports  = new DoublyLinkedList<Report>();
    this.resolvedArchive = new SinglyLinkedList<Report>();
    this.children        = new SinglyLinkedList<DepartmentNode>();
    this.resources = {
      total:     isDistrict ? 0 : DEPT_TOTAL_CAPACITY,
      available: isDistrict ? 0 : DEPT_TOTAL_CAPACITY,
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

  static readonly MAX_ONGOING = 3;          // functional queue limit
  static readonly ESCALATION_THRESHOLD = 3; // T10: steps before escalation

  constructor() {
    this.actionHistory = new Stack<Action>();
    this.nextReportId  = 1;
    this.simStep       = 0;
  }

  // ── Tree traversal ───────────────────────────────────────────────────────────
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

  // T6: sibling is ALWAYS the exact same dept type in the other district
  getSiblingDept(deptName: string): DepartmentNode | null {
    let sibling = deptName;
    if (deptName.includes('D1'))      sibling = sibling.replace('D1', 'D2');
    else if (deptName.includes('D2')) sibling = sibling.replace('D2', 'D1');
    return this.findNode(this.root, sibling);
  }

  // ── T1: Auto-promotion — respects MAX_ONGOING unless isMaxEmergency ──────────
  promotePendingToOngoing(dept: DepartmentNode, isMaxEmergency = false): void {
    // T1: In max-emergency mode, bypass the 3-report cap
    if (!isMaxEmergency && dept.ongoingReports.size() >= CrisisSystem.MAX_ONGOING) return;
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

  // ── T7: Manual force-promote a specific pending report to ongoing ─────────────
  forceOngoing(deptName: string, reportId: number, isMaxEmergency = false): 'ok' | 'full' | 'notfound' {
    const dept = this.findNode(this.root, deptName);
    if (!dept) return 'notfound';

    if (!isMaxEmergency && dept.ongoingReports.size() >= CrisisSystem.MAX_ONGOING) return 'full';

    const dnode = dept.pendingReports.findNode((v) => v.id === reportId);
    if (!dnode) return 'notfound';

    const r = { ...dnode.data };
    dept.pendingReports.removeNode(dnode);
    r.status = 'Ongoing';
    dept.ongoingReports.insertLast(r);
    if (dept.resources.available > 0) dept.resources.available--;
    this.actionHistory.push({ type: 'PROMOTE', reportId, deptName });
    this.persist();
    return 'ok';
  }

  // ── Resolve ──────────────────────────────────────────────────────────────────
  resolveReportInTree(
    node: DepartmentNode | null,
    reportId: number,
    currentStep: number,
    isMaxEmergency = false,
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
        node.resolvedArchive.insertFront(r);
        node.resources.available++;
        this.actionHistory.push({ type: 'RESOLVE', reportId, deptName: node.name, reportSnapshot: r });
        this.promotePendingToOngoing(node, isMaxEmergency);
        this.persist();
        return true;
      }
      cur = cur.next;
    }
    let child = node.children.head;
    while (child) {
      if (this.resolveReportInTree(child.data, reportId, currentStep, isMaxEmergency)) return true;
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

  // ── T10: Escalation — fixed threshold comparison (>) not (>=) ────────────────
  /**
   * Scans every department's pending list.
   * If (simStep - report.timestamp) > ESCALATION_THRESHOLD, the report is moved
   * to the same department type in the other district, sorted by priority.
   * This simulates real-world mutual-aid agreements between districts.
   * T1: In max-emergency mode, threshold = 0 (escalate immediately).
   */
  escalateInTree(node: DepartmentNode | null, isMaxEmergency: boolean, movedIds: Set<number>): number {
    if (!node) return 0;
    let count = 0;
    // T1: max-emergency → escalate immediately (threshold = 0)
    const threshold = isMaxEmergency ? 0 : CrisisSystem.ESCALATION_THRESHOLD;
    
    if (!node.isDistrict && node.name !== 'Central Crisis System') {
      let cur = node.pendingReports.head;
      while (cur) {
        const next = cur.next;
        // Check if report is older than threshold AND hasn't been moved this call
        if (this.simStep - cur.data.timestamp > threshold && !movedIds.has(cur.data.id)) {
          const r = { ...cur.data };
          const sibling = this.getSiblingDept(node.name);
          
          if (sibling) {
            // Remove from current
            node.pendingReports.removeNode(cur);
            // Add to sibling
            sibling.pendingReports.insertSortedByPriority(r, (v) => v.priority);
            movedIds.add(r.id);
            count++;
            
            this.actionHistory.push({
              type: 'ESCALATE', reportId: r.id,
              deptName: node.name, extraInfo: sibling.name,
            });
          }
        }
        cur = next;
      }
    }
    
    let child = node.children.head;
    while (child) {
      count += this.escalateInTree(child.data, isMaxEmergency, movedIds);
      child = child.next;
    }
    return count;
  }

  // ── Init ─────────────────────────────────────────────────────────────────────
  initializeSystem(): void {
    this.root = new DepartmentNode('Central Crisis System');
    const d1  = new DepartmentNode('First District', true);
    const d2  = new DepartmentNode('Second District', true);
    const deptNames = ['Fire Dept', 'Police Dept', 'Ambulance', 'Water Co.', 'Electricity Co.'];
    const suffixes  = ['D1', 'D2'];
    const districts = [d1, d2];
    for (let di = 0; di < 2; di++) {
      for (let j = 0; j < 5; j++) {
        districts[di].children.insertLast(new DepartmentNode(deptNames[j] + ' - ' + suffixes[di]));
      }
    }
    this.root.children.insertLast(d1);
    this.root.children.insertLast(d2);

    const fireD1 = this.findNode(this.root, 'Fire Dept - D1');
    if (fireD1) {
      fireD1.ongoingReports.insertLast({ id: this.nextReportId++, type: 'Fire', description: 'Factory fire',     priority: 4, status: 'Ongoing',  timestamp: ++this.simStep });
      fireD1.ongoingReports.insertLast({ id: this.nextReportId++, type: 'Fire', description: 'Warehouse smoke',  priority: 3, status: 'Ongoing',  timestamp: ++this.simStep });
      fireD1.ongoingReports.insertLast({ id: this.nextReportId++, type: 'Fire', description: 'Apartment alarm',  priority: 2, status: 'Ongoing',  timestamp: ++this.simStep });
      fireD1.resources.available = 2; // 3 consumed
      fireD1.pendingReports.insertSortedByPriority({ id: this.nextReportId++, type: 'Fire', description: 'Hospital emergency', priority: 5, status: 'Pending', timestamp: ++this.simStep }, (v) => v.priority);
      fireD1.pendingReports.insertSortedByPriority({ id: this.nextReportId++, type: 'Fire', description: 'Trash can fire',      priority: 1, status: 'Pending', timestamp: ++this.simStep }, (v) => v.priority);
    }
  }

  // ── T1 & T5: File Report ─────────────────────────────────────────────────────
  fileReport(
    district: string,
    deptShort: string,
    type: string,
    desc: string,
    priority: number,
    isMaxEmergency: boolean, // replaces isMassCrisis — T1 uses this
    secondary?: string,
    icsScore?: number,
  ): void {
    this.simStep++;  // T5
    const deptName = this.buildDeptName(district, deptShort);
    const dept     = this.findNode(this.root, deptName);
    if (!dept) return;

    // T1: max-emergency forces priority 5
    const rPriority = isMaxEmergency ? 5 : priority;

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

    // T1: in max-emergency, bypass MAX_ONGOING cap
    const underCap = isMaxEmergency
      ? dept.resources.available > 0
      : dept.ongoingReports.size() < CrisisSystem.MAX_ONGOING && dept.resources.available > 0;

    if (underCap) {
      r.status = 'Ongoing';
      dept.ongoingReports.insertLast(r);
      dept.resources.available--;
    } else {
      dept.pendingReports.insertSortedByPriority(r, (v) => v.priority);
    }

    this.actionHistory.push({ type: 'FILE', reportId: r.id, deptName });
    this.persist();
  }

  // ── T5: Resolve ──────────────────────────────────────────────────────────────
  resolveReport(reportId: number, isMaxEmergency = false): void {
    this.simStep++;  // T5
    this.resolveReportInTree(this.root, reportId, this.simStep, isMaxEmergency);
  }

  // ── T5 & T10: Escalate ───────────────────────────────────────────────────────
  escalatePendingReports(isMaxEmergency = false): number {
    this.simStep++;  // T5: once per call
    const movedIds = new Set<number>();
    const count = this.escalateInTree(this.root, isMaxEmergency, movedIds);
    this.persist();
    return count;
  }

  // ── T6: Transfer — FORCED to sibling dept (no target choice) ────────────────
  /**
   * Moves the specified pending report to the same department type in the OTHER district.
   * The sibling is determined automatically via getSiblingDept().
   * T7: The report stays in the sibling's PENDING list (not auto-promoted).
   */
  transferPendingReport(fromDeptName: string, reportId: number): 'ok' | 'notfound' | 'nosibling' {
    const from    = this.findNode(this.root, fromDeptName);
    if (!from) return 'notfound';

    const sibling = this.getSiblingDept(fromDeptName); // T6: forced sibling
    if (!sibling) return 'nosibling';

    const dnode = from.pendingReports.findNode((v) => v.id === reportId);
    if (!dnode) return 'notfound';

    const r = { ...dnode.data };
    from.pendingReports.removeNode(dnode);

    // T7: insert into PENDING (sorted), do NOT auto-promote
    sibling.pendingReports.insertSortedByPriority(r, (v) => v.priority);

    this.simStep++;
    this.actionHistory.push({
      type: 'TRANSFER', reportId,
      deptName: fromDeptName, extraInfo: sibling.name,
    });
    this.persist();
    return 'ok';
  }

  // ── Undo ─────────────────────────────────────────────────────────────────────
  undoLastAction(): void {
    const act = this.actionHistory.pop();
    if (!act) return;

    if (act.type === 'FILE') {
      const dept = this.findNode(this.root, act.deptName);
      if (!dept) return;
      if (dept.ongoingReports.toArray().some((r) => r.id === act.reportId)) {
        dept.ongoingReports.removeValue((v) => v.id === act.reportId);
        dept.resources.available++;
      } else {
        dept.pendingReports.removeNodeByValue((v) => v.id === act.reportId);
      }

    } else if (act.type === 'PROMOTE') {
      const dept = this.findNode(this.root, act.deptName);
      if (!dept) return;
      let removed: Report | null = null;
      let cur = dept.ongoingReports.head;
      while (cur) { if (cur.data.id === act.reportId) { removed = { ...cur.data }; break; } cur = cur.next; }
      if (removed) {
        dept.ongoingReports.removeValue((v) => v.id === act.reportId);
        dept.resources.available++;
        removed.status = 'Pending';
        dept.pendingReports.insertSortedByPriority(removed, (v) => v.priority);
      }

    } else if (act.type === 'RESOLVE') {
      const dept = this.findNode(this.root, act.deptName);
      if (!dept || !act.reportSnapshot) return;
      dept.resolvedArchive.removeValue((v) => v.id === act.reportId);
      if (dept.resources.available > 0) dept.resources.available--;
      const snap = act.reportSnapshot;
      if (dept.ongoingReports.size() < CrisisSystem.MAX_ONGOING && dept.resources.available > 0) {
        dept.ongoingReports.insertLast({ ...snap, status: 'Ongoing', resolvedAt: undefined, duration: undefined });
      } else {
        dept.pendingReports.insertSortedByPriority({ ...snap, status: 'Pending', resolvedAt: undefined, duration: undefined }, (v) => v.priority);
      }

    } else if (act.type === 'ESCALATE' || act.type === 'TRANSFER') {
      // Reverse: move from destination back to source
      const src = this.findNode(this.root, act.deptName);
      const dst = this.findNode(this.root, act.extraInfo ?? '');
      if (!src || !dst) return;
      const dnode = dst.pendingReports.findNode((v) => v.id === act.reportId);
      if (!dnode) return;
      const r = { ...dnode.data };
      dst.pendingReports.removeNode(dnode);
      src.pendingReports.insertSortedByPriority(r, (v) => v.priority);
    }

    this.persist();
  }

  // ── T3: Filter resolved archive ───────────────────────────────────────────────
  filterResolved(dept: DepartmentNode, filter: 'all' | 'daily' | 'weekly' | 'monthly'): Report[] {
    const all = dept.resolvedArchive.toArray();
    if (filter === 'all') return all;
    const horizon =
      filter === 'daily'   ? this.simStep - FILTER_DAILY  :
      filter === 'weekly'  ? this.simStep - FILTER_WEEKLY :
                             this.simStep - FILTER_MONTHLY;
    return all.filter((r) => r.timestamp >= horizon);
  }

  // T3 & T8: Global archive — all depts, with filter
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
    // T9: sort by priority desc
    return results.sort((a, b) => b.priority - a.priority);
  }

  // ── Stats ────────────────────────────────────────────────────────────────────
  getSystemStats(): Record<string, { ongoing: number; pending: number; resolved: number }> {
    const stats: Record<string, { ongoing: number; pending: number; resolved: number }> = {};
    if (!this.root) return stats;
    let district = this.root.children.head;
    while (district) {
      const dist = district.data;
      let o = 0, p = 0, r = 0;
      let dept = dist.children.head;
      while (dept) { o += dept.data.ongoingReports.size(); p += dept.data.pendingReports.size(); r += dept.data.resolvedArchive.size(); dept = dept.next; }
      stats[dist.name] = { ongoing: o, pending: p, resolved: r };
      district = district.next;
    }
    return stats;
  }

  // ── Persistence ──────────────────────────────────────────────────────────────
  persist(): void {
    try { localStorage.setItem(LS_KEY, JSON.stringify(this.serialize())); } catch { /* quota */ }
  }

  serialize(): object {
    const s = (dept: DepartmentNode): object => ({
      name: dept.name, isDistrict: dept.isDistrict, resources: dept.resources,
      ongoing:  dept.ongoingReports.toArray(),
      pending:  dept.pendingReports.toArray(),
      resolved: dept.resolvedArchive.toArray(),
      children: dept.children.toArray().map(s),
    });
    return { simStep: this.simStep, nextReportId: this.nextReportId, root: this.root ? s(this.root) : null };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static deserialize(data: any): CrisisSystem {
    const sys = new CrisisSystem();
    sys.simStep      = data.simStep      ?? 0;
    sys.nextReportId = data.nextReportId ?? 1;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d = (raw: any): DepartmentNode => {
      const node     = new DepartmentNode(raw.name, raw.isDistrict);
      node.resources = raw.resources;
      (raw.ongoing  as Report[]).forEach((r) => node.ongoingReports.insertLast(r));
      (raw.pending  as Report[]).forEach((r) => node.pendingReports.insertSortedByPriority(r, (v) => v.priority));
      const resolved = raw.resolved as Report[];
      for (let i = resolved.length - 1; i >= 0; i--) node.resolvedArchive.insertFront(resolved[i]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (raw.children as any[]).forEach((c) => node.children.insertLast(d(c)));
      return node;
    };
    if (data.root) sys.root = d(data.root);
    return sys;
  }

  static loadFromStorage(): CrisisSystem | null {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return null;
      return CrisisSystem.deserialize(JSON.parse(raw));
    } catch { return null; }
  }
}
